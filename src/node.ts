import * as MP from "./index.js"
import { Duplex, Readable } from "node:stream"

export type Part = MP.Field | FileStream

export interface MultipastaStream extends Duplex {
  on(event: "field", listener: (field: MP.Field) => void): this
  on(event: "file", listener: (file: FileStream) => void): this
  on(event: "close", listener: () => void): this
  on(event: "data", listener: (part: Part) => void): this
  on(event: "drain", listener: () => void): this
  on(event: "end", listener: () => void): this
  on(event: "error", listener: (err: MP.MultipartError) => void): this
  on(event: "finish", listener: () => void): this
  on(event: "pause", listener: () => void): this
  on(event: "pipe", listener: (src: Readable) => void): this
  on(event: "readable", listener: () => void): this
  on(event: "resume", listener: () => void): this
  on(event: "unpipe", listener: (src: Readable) => void): this
  on(event: string | symbol, listener: (...args: any[]) => void): this

  read(size?: number): Part | null
}

export class MultipastaStream extends Duplex {
  #parser: MP.Parser
  #canWrite = true
  #writeCallback: (() => void) | undefined
  #currentFile: FileStream | undefined

  constructor(config: MP.BaseConfig) {
    super({ readableObjectMode: true })
    this.#parser = MP.make({
      ...config,
      onField: (info, value) => {
        const field: MP.Field = { _tag: "Field", info, value }
        this.push(field)
        this.emit("field", field)
      },
      onFile: info => {
        const file = new FileStream(info)
        this.#currentFile = file
        this.push(file)
        this.emit("file", file)

        return chunk => {
          this.#canWrite = file.push(chunk)
          if (chunk === null) {
            this.#currentFile = undefined
          }
        }
      },
      onError: error => {
        this.emit("error", error)
        if (this.#currentFile !== undefined) {
          this.#currentFile.emit("error", error)
        }
      },
      onDone: () => {
        this.push(null)
      },
    })
  }

  _read(_size: number) {
    if (this.#writeCallback !== undefined) {
      this.#canWrite = true
      this.#writeCallback()
      this.#writeCallback = undefined
    }
  }

  _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null | undefined) => void,
  ): void {
    if (chunk instanceof Uint8Array) {
      this.#parser.write(chunk)
    } else {
      this.#parser.write(Buffer.from(chunk, encoding))
    }

    if (this.#canWrite) {
      callback()
    } else {
      this.#writeCallback = callback
    }
  }

  _final(callback: (error?: Error | null | undefined) => void): void {
    this.#parser.end()
    callback()
  }
}

export const make = (config: MP.BaseConfig): MultipastaStream =>
  new MultipastaStream(config)

export class FileStream extends Readable {
  readonly _tag = "File"
  readonly filename: string
  constructor(readonly info: MP.PartInfo) {
    super()
    this.filename = info.filename!
  }
}
