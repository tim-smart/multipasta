// import StreamSearch from "streamsearch"
import * as Search from "./internal/search"
// import { randomBytes } from "node:crypto"
import * as Multipart from "./internal/multipart"

// const buf = randomBytes(1024 * 1024 * 15)
const buf = Buffer.from("0".repeat(1024))

function* createMultipartBuffers(boundary: string) {
  const bufs = []
  for (let i = 0; i < 10; i++) {
    bufs.push(
      Buffer.from(
        [
          `--${boundary}`,
          `content-disposition: form-data; name="field${i + 1}"`,
          "\r\n",
        ].join("\r\n"),
      ),
    )
    bufs.push(buf)
    bufs.push(Buffer.from("\r\n"))
  }
  bufs.push(Buffer.from([`--${boundary}--`, ""].join("\r\n")))

  // return bufs
  const a = Buffer.concat(bufs)
  for (let i = 0; i < a.length; i += 1400) {
    const end = Math.min(i + 1400, a.length)
    yield a.subarray(i, end)
  }
}

const boundary = "-----------------------------168072824752491622650073"
const mpBoundary = `--${boundary}--\r\n`

// let streamSearchCount = 0
// let streamSearchMatchCount = 0
// console.time("streamsearch")
// for (let i = 0; i < 10; i++) {
//   const search = new StreamSearch(Buffer.from(mpBoundary), (_match, _data) => {
//     if (_match) {
//       streamSearchMatchCount++
//     }
//     if (_data) {
//       streamSearchCount += _data.length
//     }
//   })
//   for (const chunk of createMultipartBuffers(boundary)) {
//     search.push(chunk)
//   }
//   search.destroy()
// }
// console.timeEnd("streamsearch")
//
let searchCount = 0
console.time("search")
for (let i = 0; i < 10; i++) {
  function searchCallback(_match: number, _data: Uint8Array) {
    searchCount += _data.length
  }
  const state = Search.make(mpBoundary, searchCallback)
  for (const chunk of createMultipartBuffers(boundary)) {
    state.write(chunk)
  }
  state.end()
}
console.timeEnd("search")

console.time("multipart")
let parts: Array<string> = []
let fields: Array<string> = []
const parser = Multipart.make({
  boundary,
  onPart: _info => {
    parts.push(_info.contentDiposition.name)
    return _chunk => {}
  },
  onField(info, _value) {
    fields.push(info.contentDiposition.name)
  },
  onError: error => console.log("error", error),
  onDone: () => {},
})

for (let i = 0; i < 10; i++) {
  for (const chunk of createMultipartBuffers(boundary)) {
    parser.write(chunk)
  }
  parser.end()
}
console.timeEnd("multipart")

console.log({
  parts,
  partsLength: parts.length,
  fields,
  fieldsLength: fields.length,
})
