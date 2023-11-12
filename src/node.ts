import * as MP from "./index.js"
import { Duplex, Readable } from "node:stream"

export class MultipastaStream extends Duplex {
  #parser: MP.Parser
  #canWrite = true
  #writeCallback: (() => void) | undefined

  constructor(config: MP.BaseConfig) {
    super({ readableObjectMode: true })
    this.#parser = MP.make({
      ...config,
      onField: (info, value) => {
        const field: MP.Field = { _tag: "Field", info, value }
        this.#canWrite = this.push(field)
        this.emit("field", field)
      },
      onFile: info => {
        const file = new FileStream(info)

        this.#canWrite = this.push(file)
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
  }

  _read(_size: number) {
    if (this.#writeCallback !== undefined) {
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

    if (this.#writeCallback !== undefined) {
      this.#writeCallback()
      this.#writeCallback = undefined
    }

    if (this.#canWrite) {
      callback()
    } else {
      this.#writeCallback = callback
    }
  }

  _final(callback: (error?: Error | null | undefined) => void): void {
    this.#parser.end()

    if (this.#writeCallback !== undefined) {
      this.#writeCallback()
      this.#writeCallback = undefined
    }
    callback()
  }
}

class FileStream extends Readable {
  readonly _tag = "File"

  constructor(readonly info: MP.PartInfo) {
    super()
  }
}
