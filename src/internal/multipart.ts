import * as Search from "./search"
import * as HP from "./headers"
import * as CT from "./contentType"

const enum State {
  headers,
  body,
}

export type MultipartError =
  | {
      readonly _tag: "BadHeaders"
      readonly error: HP.Failure
    }
  | {
      readonly _tag: "InvalidDisposition"
    }
  | {
      readonly _tag: "ReachedLimit"
      readonly limit:
        | "MaxParts"
        | "MaxTotalSize"
        | "MaxPartSize"
        | "MaxFieldSize"
    }
  | {
      readonly _tag: "EndNotReached"
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

export interface PartInfo {
  readonly headers: Record<string, string>
  readonly contentType: {
    readonly value: string
    readonly parameters: Record<string, string>
  }
  readonly contentDiposition: {
    readonly [key: string]: string | undefined
    readonly name: string
    readonly filename?: string
  }
}

const constCR = new TextEncoder().encode("\r\n")

export function defaultIsFile(info: PartInfo) {
  return (
    info.contentDiposition.filename !== undefined ||
    info.contentType.value === "application/octet-stream"
  )
}

export function make({
  boundary,
  onPart,
  onField,
  onError,
  onDone,
  isFile = defaultIsFile,
  maxParts = Infinity,
  maxTotalSize = Infinity,
  maxPartSize = Infinity,
  maxFieldSize = 1024 * 1024,
}: {
  readonly boundary: string
  readonly onField: (info: PartInfo, value: string) => void
  readonly onPart: (info: PartInfo) => (chunk: Uint8Array | null) => void
  readonly onError: (error: MultipartError) => void
  readonly onDone: () => void
  readonly isFile?: (info: PartInfo) => boolean
  readonly maxParts?: number
  readonly maxTotalSize?: number
  readonly maxPartSize?: number
  readonly maxFieldSize?: number
}) {
  const state = {
    state: State.headers,
    index: 0,
    parts: 0,
    onChunk: (_chunk: Uint8Array | null) => {},
    info: undefined as any as PartInfo,
    headerSkip: 0,
    partSize: 0,
    totalSize: 0,
    isFile: false,
    fieldValue: "",
    fieldSize: 0,
    fieldDecoder: getDecoder("utf-8"),
  }

  function skipBody() {
    state.state = State.body
    state.isFile = true
    state.onChunk = () => {}
  }

  const headerParser = HP.make()

  const split = Search.make(`\r\n--${boundary}`, function (index, chunk) {
    if (state.parts > maxParts) {
      onError(errMaxParts)
    }

    if (index !== state.index) {
      if (state.index > 0) {
        if (state.isFile) {
          state.onChunk(null)
          state.partSize = 0
        } else {
          onField(state.info, state.fieldValue)
          state.fieldSize = 0
          state.fieldValue = ""
        }
      }

      state.state = State.headers
      state.index = index
      state.headerSkip = 2 // skip the first \r\n

      // trailing --
      if (chunk[0] === 45 && chunk[1] === 45) {
        return onDone()
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
        "form-data" !== contentDisposition.value ||
        !("name" in contentDisposition.parameters)
      ) {
        skipBody()
        return onError(errInvalidDisposition)
      }

      state.info = {
        headers: result.headers,
        contentType,
        contentDiposition: {
          name: contentDisposition.parameters.name,
          filename:
            contentDisposition.parameters["filename*"] ??
            contentDisposition.parameters.filename,
        },
      }

      state.parts++
      state.isFile = isFile(state.info)
      if (state.isFile) {
        state.onChunk = onPart(state.info)
      } else {
        state.fieldDecoder = getDecoder(
          contentType.parameters.charset ?? "utf-8",
        )
      }
      state.state = State.body

      if (result.endPosition < chunk.length) {
        if (state.isFile) {
          state.onChunk(chunk.subarray(result.endPosition))
        } else {
          state.fieldValue += state.fieldDecoder.decode(
            chunk.subarray(result.endPosition),
          )
        }
      }
    } else if (state.isFile) {
      state.onChunk(chunk)
    } else {
      if ((state.fieldSize += chunk.length) > maxFieldSize) {
        onError(errMaxFieldSize)
      }

      state.fieldValue += state.fieldDecoder.decode(chunk)
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
      split.end()
      if (state.state === State.body) {
        onError(errEndNotReached)
      }

      state.state = State.headers
      state.index = 0
      state.parts = 0
      state.onChunk = () => {}
      state.info = undefined as any as PartInfo
      state.totalSize = 0
      state.partSize = 0
      state.fieldValue = ""
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
