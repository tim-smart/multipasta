import StreamSearch from "streamsearch"
import * as Search from "./internal/search"
import { randomBytes } from "node:crypto"
import * as Fs from "node:fs"

const buf = randomBytes(1024 * 1024 * 50)
// const buf = Buffer.from("0".repeat(1024 * 1024))

function* createMultipartBuffers(boundary: string) {
  const bufs = []
  for (let i = 0; i < 10; i++) {
    bufs.push(
      Buffer.from(
        [
          `--${boundary}`,
          `content-disposition: form-data; name="field${i + 1}"`,
          "",
        ].join("\r\n"),
      ),
    )
    bufs.push(buf)
    bufs.push(Buffer.from("\r\n\r\n"))
    bufs.push(Buffer.from([`--${boundary}--`, ""].join("\r\n")))
  }

  // return bufs
  const a = Buffer.concat(bufs)
  for (let i = 0; i < a.length; i += 1400) {
    const end = Math.min(i + 1400, a.length)
    yield a.subarray(i, end)
  }
}

const boundary = "-----------------------------168072824752491622650073"
const mpBoundary = `--${boundary}--\r\n`

let streamSearchCount = 0
let streamSearchMatchCount = 0
console.time("streamsearch")
for (let i = 0; i < 10; i++) {
  const search = new StreamSearch(Buffer.from(mpBoundary), (_match, _data) => {
    if (_match) {
      streamSearchMatchCount++
    }
    if (_data) {
      streamSearchCount += _data.length
    }
  })
  for (const chunk of createMultipartBuffers(boundary)) {
    search.push(chunk)
  }
  search.destroy()
}
console.timeEnd("streamsearch")

let searchCount = 0
let searchMatchCount = 0
console.time("search")
for (let i = 0; i < 10; i++) {
  function searchCallback(_match: number, _data: Uint8Array) {
    searchCount += _data.length
    searchMatchCount = _match + 1
  }
  const state = Search.make(mpBoundary, searchCallback)
  for (const chunk of createMultipartBuffers(boundary)) {
    state.write(chunk)
  }
  state.end()
}
console.timeEnd("search")

const expectedBytes =
  Buffer.concat([...createMultipartBuffers(boundary)]).length -
  mpBoundary.length * 10

console.log({
  expectedBytes: expectedBytes * 10,
  streamSearchCount,
  searchCount,
  streamSearchMatchCount,
  searchMatchCount,
})

Fs.writeFileSync("out", Buffer.concat([...createMultipartBuffers(boundary)]))
