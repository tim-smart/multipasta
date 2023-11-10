import {
  Config,
  Field,
  File,
  MultipartError,
  MultipartPullError,
  Part,
  PartInfo,
  PullConfig,
} from "../index.js"
import * as CT from "./contentType.js"
import * as HP from "./headers.js"
import * as Search from "./search.js"

const enum State {
  headers,
  body,
}

const errInvalidDisposition: MultipartError = { _tag: "InvalidDisposition" }
const errEndNotReached: MultipartError = { _tag: "EndNotReached" }
const errMaxParts: MultipartError = { _tag: "ReachedLimit", limit: "MaxParts" }
const errMaxTotalSize: MultipartError = {
  _tag: "ReachedLimit",
  limit: "MaxTotalSize",
}
const errMaxPartSize: MultipartError = {
  _tag: "ReachedLimit",
  limit: "MaxPartSize",
}
const errMaxFieldSize: MultipartError = {
  _tag: "ReachedLimit",
  limit: "MaxFieldSize",
}

const constCR = new TextEncoder().encode("\r\n")

export function defaultIsFile(info: PartInfo) {
  return (
    info.filename !== undefined ||
    info.contentType === "application/octet-stream"
  )
}

function parseBoundary(headers: Record<string, string>) {
  const contentType = CT.parse(headers["content-type"])
  return contentType.parameters.boundary
}

function noopOnChunk(_chunk: Uint8Array | null) {}

export function make({
  headers,
  onFile: onPart,
  onField,
  onError,
  onDone,
  isFile = defaultIsFile,
  maxParts = Infinity,
  maxTotalSize = Infinity,
  maxPartSize = Infinity,
  maxFieldSize = 1024 * 1024,
}: Config) {
  const boundary = parseBoundary(headers)
  if (boundary === undefined) {
    onError({ _tag: "InvalidBoundary" })
    return {
      write: noopOnChunk,
      end() {},
    }
  }

  const state = {
    state: State.headers,
    index: 0,
    parts: 0,
    onChunk: noopOnChunk,
    info: undefined as any as PartInfo,
    headerSkip: 0,
    partSize: 0,
    totalSize: 0,
    isFile: false,
    fieldChunks: [] as Array<Uint8Array>,
    fieldSize: 0,
  }

  function skipBody() {
    state.state = State.body
    state.isFile = true
    state.onChunk = noopOnChunk
  }

  const headerParser = HP.make()

  const split = Search.make(`\r\n--${boundary}`, function (index, chunk) {
    if (index === 0) {
      // data before the first boundary
      skipBody()
      return
    } else if (index !== state.index) {
      if (state.index > 0) {
        if (state.isFile) {
          state.onChunk(null)
          state.partSize = 0
        } else {
          if (state.fieldChunks.length === 1) {
            onField(state.info, state.fieldChunks[0])
          } else {
            const buf = new Uint8Array(state.fieldSize)
            let offset = 0
            for (let i = 0; i < state.fieldChunks.length; i++) {
              const chunk = state.fieldChunks[i]
              buf.set(chunk, offset)
              offset += chunk.length
            }
            onField(state.info, buf)
          }
          state.fieldSize = 0
          state.fieldChunks = []
        }
      }

      state.state = State.headers
      state.index = index
      state.headerSkip = 2 // skip the first \r\n

      // trailing --
      if (chunk[0] === 45 && chunk[1] === 45) {
        return onDone()
      }

      state.parts++
      if (state.parts > maxParts) {
        onError(errMaxParts)
      }
    }

    if ((state.partSize += chunk.length) > maxPartSize) {
      onError(errMaxPartSize)
    }

    if (state.state === State.headers) {
      const result = headerParser(chunk, state.headerSkip)
      state.headerSkip = 0

      if (result._tag === "Continue") {
        return
      } else if (result._tag === "Failure") {
        skipBody()
        return onError({ _tag: "BadHeaders", error: result })
      }

      const contentType = CT.parse(result.headers["content-type"])
      const contentDisposition = CT.parse(
        result.headers["content-disposition"],
        true,
      )

      if (
        "form-data" === contentDisposition.value &&
        !("name" in contentDisposition.parameters)
      ) {
        skipBody()
        return onError(errInvalidDisposition)
      }

      let encodedFilename: string | undefined
      if ("filename*" in contentDisposition.parameters) {
        const parts = contentDisposition.parameters["filename*"].split("''")
        if (parts.length === 2) {
          encodedFilename = decodeURIComponent(parts[1])
        }
      }

      state.info = {
        name: contentDisposition.parameters.name ?? "",
        filename: encodedFilename ?? contentDisposition.parameters.filename,
        contentType:
          contentType.value === ""
            ? contentDisposition.parameters.filename !== undefined
              ? "application/octet-stream"
              : "text/plain"
            : contentType.value,
        contentTypeParameters: contentType.parameters,
        contentDiposition: contentDisposition.value,
        contentDipositionParameters: contentDisposition.parameters as any,
        headers: result.headers,
      }

      state.state = State.body
      state.isFile = isFile(state.info)

      if (state.isFile) {
        state.onChunk = onPart(state.info)
      }

      if (result.endPosition < chunk.length) {
        if (state.isFile) {
          state.onChunk(chunk.subarray(result.endPosition))
        } else {
          state.fieldChunks.push(chunk.subarray(result.endPosition))
        }
      }
    } else if (state.isFile) {
      state.onChunk(chunk)
    } else {
      if ((state.fieldSize += chunk.length) > maxFieldSize) {
        onError(errMaxFieldSize)
      }
      state.fieldChunks.push(chunk)
    }
  })

  split.write(constCR)

  return {
    write(chunk: Uint8Array) {
      if ((state.totalSize += chunk.length) > maxTotalSize) {
        return onError(errMaxTotalSize)
      }

      return split.write(chunk)
    },
    end() {
      if (state.totalSize === 0) {
        return
      }

      split.end()
      if (state.state === State.body) {
        onError(errEndNotReached)
      }

      state.state = State.headers
      state.index = 0
      state.parts = 0
      state.onChunk = noopOnChunk
      state.info = undefined as any as PartInfo
      state.totalSize = 0
      state.partSize = 0
      state.fieldChunks = []
      state.fieldSize = 0

      split.write(constCR)
    },
  } as const
}

const utf8Decoder = new TextDecoder("utf-8")
function getDecoder(charset: string) {
  if (charset === "utf-8" || charset === "utf8" || charset === "") {
    return utf8Decoder
  }

  try {
    return new TextDecoder(charset)
  } catch (error) {
    return utf8Decoder
  }
}

export function decodeField(info: PartInfo, value: Uint8Array): string {
  return getDecoder(info.contentTypeParameters.charset ?? "utf-8").decode(value)
}

export function isFile(part: Part): part is File {
  return part._tag === "File"
}

export function isField(part: Part): part is Field {
  return part._tag === "Field"
}

class FileImpl implements File {
  readonly _tag = "File"
  constructor(
    readonly info: PartInfo,
    private pull: (cb: () => void) => void,
  ) {}

  buffer: Array<Uint8Array> = []
  hasData = false
  finished = false

  read(cb: (chunk: ReadonlyArray<Uint8Array> | null) => void) {
    if (this.hasData) {
      const buf = this.buffer
      this.buffer = []
      this.hasData = false
      cb(buf)
      if (this.finished) {
        cb(null)
      }
    } else if (this.finished) {
      cb(null)
    } else {
      this.pull(() => this.read(cb))
    }
  }
}

function noop() {}

export function makePull<E = never>(config: PullConfig<E>) {
  let partBuffer: Array<Part> = []
  let error: MultipartPullError<E> | null = null
  let hasData = false
  let ended = false

  function addError(err: E | MultipartError) {
    if (error === null) {
      error = { _tag: "MultipartPullError", errors: [err] }
      hasData = true
    } else {
      ;(error.errors as any).push(err)
    }
  }

  const parser = make({
    ...config,
    onField(info, value) {
      partBuffer.push({ _tag: "Field", info, value })
      hasData = true
    },
    onFile(info) {
      const file = new FileImpl(info, pull)
      partBuffer.push(file)
      hasData = true
      return function (chunk) {
        if (chunk === null) {
          file.finished = true
        } else {
          file.buffer.push(chunk)
          file.hasData = true
        }
      }
    },
    onError: addError,
    onDone() {},
  })

  function pull(cb: () => void) {
    config.pull(function (err, chunk) {
      if (chunk === null) {
        parser.end()
        ended = true
      } else if (err !== null) {
        parser.end()
        ended = true
        addError(err)
      } else if (!ended) {
        for (let i = 0; i < chunk.length; i++) {
          parser.write(chunk[i])
        }
      }
      cb()
    })
  }

  return function loop(
    cb: (
      err: MultipartPullError<E> | null,
      part: ReadonlyArray<Part> | null,
    ) => void,
  ) {
    if (hasData) {
      const result = partBuffer
      partBuffer = []
      hasData = false
      cb(error, result)
      pull(noop)
    } else if (ended) {
      cb(error, null)
    } else {
      pull(function () {
        loop(cb)
      })
    }
  }
}
