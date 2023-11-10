import { assert, describe, test } from "vitest"
import * as Multipart from "../src/index.js"

interface MultipartCase {
  readonly config?: Partial<Multipart.Config>
  readonly name: string
  readonly source: ReadonlyArray<string>
  readonly boundary: string
  readonly expected: ReadonlyArray<
    | [type: "field", name: string, value: string, contentType: string]
    | [
        type: "file",
        name: string,
        bytesReceived: number,
        filename: string,
        contentType: string,
      ]
  >
  readonly errors?: ReadonlyArray<Multipart.MultipartError["_tag"]>
}

const cases: ReadonlyArray<MultipartCase> = [
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_0"',
        "",
        "super alpha file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_1"',
        "",
        "super beta file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_1"; filename="1k_b.dat"',
        "Content-Type: application/octet-stream",
        "",
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      ["field", "file_name_0", "super alpha file", "text/plain"],
      ["field", "file_name_1", "super beta file", "text/plain"],
      ["file", "upload_file_0", 1023, "1k_a.dat", "application/octet-stream"],
      ["file", "upload_file_1", 1023, "1k_b.dat", "application/octet-stream"],
    ],
    name: "Fields and files",
  },
  {
    source: [
      [
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        'Content-Disposition: form-data; name="cont"',
        "",
        "some random content",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        'Content-Disposition: form-data; name="pass"',
        "",
        "some random pass",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        'Content-Disposition: form-data; name="bit"',
        "",
        "2",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY--",
      ].join("\r\n"),
    ],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [
      ["field", "cont", "some random content", "text/plain"],
      ["field", "pass", "some random pass", "text/plain"],
      ["field", "bit", "2", "text/plain"],
    ],
    name: "Fields only",
  },
  {
    source: [""],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [],
    errors: ["EndNotReached"],
    name: "No fields and no files",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_0"',
        "",
        "super alpha file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    config: {
      maxPartSize: 13,
      maxFieldSize: 5,
    },
    expected: [
      ["field", "file_name_0", "super alpha file", "text/plain"],
      ["file", "upload_file_0", 26, "1k_a.dat", "application/octet-stream"],
    ],
    name: "Fields and files (limits)",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    config: {
      maxParts: 0,
    },
    expected: [
      ["file", "upload_file_0", 26, "1k_a.dat", "application/octet-stream"],
    ],
    name: "should not emit fieldsLimit if no field was sent",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_0"',
        "",
        "super alpha file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    config: {
      maxParts: 0,
    },
    expected: [
      ["field", "file_name_0", "super alpha file", "text/plain"],
      ["file", "upload_file_0", 26, "1k_a.dat", "application/octet-stream"],
    ],
    errors: ["ReachedLimit", "ReachedLimit"],
    name: "should respect parts limit of 0",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_0"',
        "",
        "super alpha file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="file_name_1"',
        "",
        "super beta file",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    config: {
      maxParts: 1,
    },
    errors: ["ReachedLimit", "ReachedLimit"],
    expected: [
      ["field", "file_name_0", "super alpha file", "text/plain"],
      ["field", "file_name_1", "super beta file", "text/plain"],
      ["file", "upload_file_0", 26, "1k_a.dat", "application/octet-stream"],
    ],
    name: "should respect parts limit of 1",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="/absolute/1k_a.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_1"; filename="C:\\absolute\\1k_b.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_2"; filename="relative/1k_c.dat"',
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      [
        "file",
        "upload_file_0",
        26,
        "/absolute/1k_a.dat",
        "application/octet-stream",
      ],
      [
        "file",
        "upload_file_1",
        26,
        "C:\\absolute\\1k_b.dat",
        "application/octet-stream",
      ],
      [
        "file",
        "upload_file_2",
        26,
        "relative/1k_c.dat",
        "application/octet-stream",
      ],
    ],
    name: "Paths to be preserved",
  },
  {
    source: [
      [
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        'Content-Disposition: form-data; name="cont"',
        "Content-Type: ",
        "",
        "some random content",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        "Content-Disposition: ",
        "",
        "some random pass",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY--",
      ].join("\r\n"),
    ],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [
      ["field", "cont", "some random content", "text/plain"],
      ["field", "", "some random pass", "text/plain"],
    ],
    name: "Empty content-type and empty content-disposition",
  },
  {
    config: {
      isFile: _ => _.name !== "upload_file_0",
    },
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="blob"',
        "Content-Type: application/json",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      [
        "field",
        "upload_file_0",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "application/json",
      ],
    ],
    name: "Blob uploads should be handled as fields if isFile is provided.",
  },
  {
    config: {
      isFile: _ => _.name !== "upload_file_0",
    },
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="blob"',
        "Content-Type: application/json",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        "Content-Disposition: form-data; name=\"file\"; filename*=utf-8''n%C3%A4me.txt",
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      [
        "field",
        "upload_file_0",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "application/json",
      ],
      ["file", "file", 26, "näme.txt", "application/octet-stream"],
    ],
    name: "Blob uploads should be handled as fields if isFile is provided. Other parts should be files.",
  },
  {
    config: {
      isFile: _ => _.name === "upload_file_0",
    },
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="upload_file_0"; filename="blob"',
        "Content-Type: application/json",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        "Content-Disposition: form-data; name=\"file\"; filename*=utf-8''n%C3%A4me.txt",
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      ["file", "upload_file_0", 26, "blob", "application/json"],
      [
        "field",
        "file",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "application/octet-stream",
      ],
    ],
    name: "Blob uploads sould be handled as files if corresponding isFile is provided. Other parts should be fields.",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        "Content-Disposition: form-data; name=\"file\"; filename*=utf-8''n%C3%A4me.txt",
        "Content-Type: application/octet-stream",
        "",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [["file", "file", 26, "näme.txt", "application/octet-stream"]],
    name: "Unicode filenames",
  },
  {
    source: [
      [
        "--asdasdasdasd\r\n",
        "Content-Type: text/plain\r\n",
        'Content-Disposition: form-data; name="foo"\r\n',
        "\r\n",
        "asd\r\n",
        "--asdasdasdasd--",
      ].join(":)"),
    ],
    boundary: "asdasdasdasd",
    expected: [],
    errors: ["BadHeaders", "EndNotReached"],
    name: "Stopped mid-header",
  },
  {
    source: [
      [
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY",
        'Content-Disposition: form-data; name="cont"',
        "Content-Type: application/json",
        "",
        "{}",
        "------WebKitFormBoundaryTB2MiQ36fnSJlrhY--",
      ].join("\r\n"),
    ],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [["field", "cont", "{}", "application/json"]],
    name: "content-type for fields",
  },
  {
    source: ["------WebKitFormBoundaryTB2MiQ36fnSJlrhY--\r\n"],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [],
    name: "empty form",
  },
  {
    source: [
      [
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="field1"',
        "content-type: text/plain; charset=utf-8",
        "",
        "Aufklärung ist der Ausgang des Menschen aus seiner selbstverschuldeten Unmündigkeit.",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
        'Content-Disposition: form-data; name="field2"',
        "content-type: text/plain; charset=iso-8859-1",
        "",
        "sapere aude!",
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      [
        "field",
        "field1",
        "Aufklärung ist der Ausgang des Menschen aus seiner selbstverschuldeten Unmündigkeit.",
        "text/plain",
      ],
      ["field", "field2", "sapere aude!", "text/plain"],
    ],
    name: "Fields and files",
  },
  {
    source: [
      [
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="regsubmit"',
        "",
        "yes",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="referer"',
        "",
        "http://domainExample/./",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="activationauth"',
        "",
        "",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="seccodemodid"',
        "",
        "member::register",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7--",
      ].join("\r\n"),
    ],
    boundary: "----WebKitFormBoundaryzca7IDMnT6QwqBp7",
    expected: [
      ["field", "regsubmit", "yes", "text/plain"],
      ["field", "referer", "http://domainExample/./", "text/plain"],
      ["field", "activationauth", "", "text/plain"],
      ["field", "seccodemodid", "member::register", "text/plain"],
    ],
    name: "one empty part should get ignored",
  },
  {
    source: ["    ------WebKitFormBoundaryTB2MiQ36fnSJlrhY--\r\n"],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhY",
    expected: [],
    errors: ["EndNotReached"],
    name: "empty form with preceding whitespace",
  },
  {
    source: ["------WebKitFormBoundaryTB2MiQ36fnSJlrhY--\r\n"],
    boundary: "----WebKitFormBoundaryTB2MiQ36fnSJlrhYY",
    expected: [],
    errors: ["EndNotReached"],
    name: "empty form with wrong boundary (extra Y)",
  },
  {
    source: [
      [
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="regsubmit"',
        "",
        "yes",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="referer"',
        "",
        "http://domainExample/./",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="activationauth"',
        "",
        "",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7",
        'Content-Disposition: form-data; name="seccodemodid"',
        "",
        "member::register",
        "------WebKitFormBoundaryzca7IDMnT6QwqBp7--",
      ].join("\r\n"),
    ],
    boundary: "----WebKitFormBoundaryzca7IDMnT6QwqBp7",
    expected: [
      ["field", "regsubmit", "yes", "text/plain"],
      ["field", "referer", "http://domainExample/./", "text/plain"],
      ["field", "activationauth", "", "text/plain"],
      ["field", "seccodemodid", "member::register", "text/plain"],
    ],
    name: "multiple empty parts should get ignored",
  },
]

describe("multipart", () => {
  test.each(cases)("$name", opts => {
    const parts: Array<
      readonly [
        type: "field" | "file",
        info: Multipart.PartInfo,
        content: string | number,
      ]
    > = []
    const errors: Array<Multipart.MultipartError["_tag"]> = []

    const parser = Multipart.make({
      ...(opts.config || {}),
      headers: {
        "content-type": "multipart/form-data; boundary=" + opts.boundary,
      },
      onFile: info => {
        let size = 0
        return chunk => {
          if (chunk) {
            size += chunk.length
          } else {
            parts.push(["file", info, size])
          }
        }
      },
      onField: (info, value) => {
        parts.push(["field", info, Multipart.decodeField(info, value)])
      },
      onError: error => {
        errors.push(error._tag)
      },
      onDone: () => {},
    })

    opts.source.forEach(chunk => {
      parser.write(new TextEncoder().encode(chunk))
    })
    parser.end()

    assert.strictEqual(opts.expected.length, parts.length)

    opts.expected.forEach((expected, i) => {
      const part = parts[i]
      assert.strictEqual(expected[0], part[0])
      assert.strictEqual(expected[1], part[1].name)
      assert.strictEqual(expected[2], part[2])
      if (expected[0] === "field") {
        assert.strictEqual(expected[3], part[1].contentType)
      } else {
        assert.strictEqual(expected[3], part[1].filename)
      }
    })

    if (opts.errors) {
      assert.deepEqual(opts.errors, errors)
    }
  })
})

describe("pull api", () => {
  test.each(cases)("$name", opts => {
    const iterator = opts.source[Symbol.iterator]()

    const parser = Multipart.makePull({
      ...(opts.config || {}),
      headers: {
        "content-type": "multipart/form-data; boundary=" + opts.boundary,
      },
      pull(cb) {
        const val = iterator.next()
        if (val.done) {
          cb(null)
        } else {
          cb([new TextEncoder().encode(val.value)])
        }
      },
    })

    const parts: Array<Multipart.Part> = []
    let errors: Array<Multipart.MultipartError["_tag"]> = []

    function loop() {
      parser(function (error, part) {
        if (error) {
          console.log(error)
          errors = error.errors.map(_ => _._tag)
        }
        if (part !== null) {
          parts.push(...part)
          loop()
        }
      })
    }
    loop()

    assert.strictEqual(opts.expected.length, parts.length)

    if (opts.errors) {
      assert.deepEqual(opts.errors, errors)
    }
  })
})
