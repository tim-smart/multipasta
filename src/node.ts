/// <reference types="node" />
import type { IncomingHttpHeaders } from "node:http"
import * as MP from "./index.js"
import { Duplex, Readable } from "node:stream"

export type { MultipartError, PartInfo } from "./index.js"
export { decodeField } from "./index.js"

export type Part = Field | FileStream

export interface Field {
  readonly _tag: "Field"
  readonly info: MP.PartInfo
  readonly value: Uint8Array
}

export interface MultipastaStream extends Duplex {
  on(event: "field", listener: (field: Field) => void): this
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

export type NodeConfig = Omit<MP.BaseConfig, "headers"> & {
  readonly headers: IncomingHttpHeaders
}

export class MultipastaStream extends Duplex {
  #parser: MP.Parser
  #canWrite = true
  #writeCallback: (() => void) | undefined

  constructor(config: NodeConfig) {
    super({ readableObjectMode: true })
    this.#parser = MP.make({
      ...(config as any),
      onField: (info, value) => {
        const field: Field = { _tag: "Field", info, value }
        this.push(field)
        this.emit("field", field)
      },
      onFile: info => {
        const file = new FileStream(info)
        this.push(file)
        this.emit("file", file)

        return chunk => {
          this.#canWrite = file.push(chunk)
        }
      },
      onError: error => {
        this.emit("error", error)
      },
      onDone: () => {
        this.push(null)
      },
    })

    this.on("drain", () => {
      this.#canWrite = true
      if (this.#writeCallback !== undefined) {
        this.#writeCallback()
        this.#writeCallback = undefined
      }
    })
  }

  _read(_size: number) {}

  _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null | undefined) => void,
  ): void {
    const canWrite = this.#canWrite

    if (chunk instanceof Uint8Array) {
      this.#parser.write(chunk)
    } else {
      this.#parser.write(Buffer.from(chunk, encoding))
    }

    if (canWrite) {
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

export const make = (config: NodeConfig): MultipastaStream =>
  new MultipastaStream(config)

export class FileStream extends Readable {
  readonly _tag = "File"
  readonly filename: string
  constructor(readonly info: MP.PartInfo) {
    super()
    this.filename = info.filename!
  }
  _read(_size: number) {}
}
