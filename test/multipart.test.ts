import { assert, describe, test } from "vitest"
import * as Multipart from "../src/index.js"
import * as Node from "../src/node.js"
import * as Web from "../src/web.js"

type Expected = Array<
  | [type: "field", name: string, value: string, contentType: string]
  | [
      type: "file",
      name: string,
      bytesReceived: number,
      filename: string,
      contentType: string,
    ]
>

interface MultipartCase {
  readonly config?: Partial<Multipart.Config>
  readonly name: string
  readonly source: ReadonlyArray<string>
  readonly boundary: string
  readonly expected: Expected
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
        "A".repeat(1024 * 1024),
        "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
      ].join("\r\n"),
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [
      ["field", "file_name_0", "super alpha file", "text/plain"],
      ["field", "file_name_1", "super beta file", "text/plain"],
      [
        "file",
        "upload_file_0",
        1024 * 1024,
        "1k_a.dat",
        "application/octet-stream",
      ],
    ],
    name: "Fields and large file",
  },
  {
    source: [
      "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k\r\n",
      'Content-Disposition: form-data; name="file_name_0"\r\n',
      "\r\n",
      "super alpha file\r\n",
      "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
    ],
    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [["field", "file_name_0", "super alpha file", "text/plain"]],
    name: "Headers over multiple chunks",
    errors: [],
  },
  {
    source: [
      "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
      'Content-Disposition: form-data; name="file_name_0"',
      "",
      "super alpha file",
      "-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--",
    ]
      .join("\r\n")
      .split(""),

    boundary: "---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k",
    expected: [["field", "file_name_0", "super alpha file", "text/plain"]],
    name: "Headers over single byte chunks",
    errors: [],
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
    const parts: Expected = []
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
            parts.push([
              "file",
              info.name,
              size,
              info.filename!,
              info.contentType,
            ])
          }
        }
      },
      onField: (info, value) => {
        parts.push([
          "field",
          info.name,
          Multipart.decodeField(info, value),
          info.contentType,
        ])
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

    assert.deepStrictEqual(opts.expected, parts)
    if (opts.errors) {
      assert.deepEqual(opts.errors, errors)
    }
  })
})

describe("node api", () => {
  test.each(cases)("$name", opts => {
    const parts: Expected = []
    const errors: Array<Multipart.MultipartError["_tag"]> = []

    const parser = Node.make({
      ...(opts.config || {}),
      headers: {
        "content-type": "multipart/form-data; boundary=" + opts.boundary,
      },
    })
    parser.on("field", field => {
      parts.push([
        "field",
        field.info.name,
        Multipart.decodeField(field.info, field.value),
        field.info.contentType,
      ])
    })
    parser.on("file", file => {
      let size = 0
      file.on("data", chunk => {
        size += chunk.length
      })
      file.on("end", () => {
        parts.push([
          "file",
          file.info.name,
          size,
          file.info.filename!,
          file.info.contentType,
        ])
      })
    })
    parser.on("error", error => {
      errors.push(error._tag)
    })

    parser.on("end", () => {
      assert.deepStrictEqual(opts.expected, parts)
      if (opts.errors) {
        assert.deepEqual(opts.errors, errors)
      }
    })

    opts.source.forEach(chunk => {
      parser.write(new TextEncoder().encode(chunk))
    })
    parser.end()
  })
})

describe("node flowing api", () => {
  test.each(cases)("$name", opts => {
    const parts: Expected = []
    const errors: Array<Multipart.MultipartError["_tag"]> = []

    const parser = Node.make({
      ...(opts.config || {}),
      headers: {
        "content-type": "multipart/form-data; boundary=" + opts.boundary,
      },
    })
    parser.on("data", part => {
      if (part._tag === "Field") {
        parts.push([
          "field",
          part.info.name,
          Multipart.decodeField(part.info, part.value),
          part.info.contentType,
        ])
        return
      }

      let size = 0
      part.on("data", chunk => {
        size += chunk.length
      })
      part.on("end", () => {
        parts.push([
          "file",
          part.info.name,
          size,
          part.info.filename!,
          part.info.contentType,
        ])
      })
    })
    parser.on("error", error => {
      errors.push(error._tag)
    })

    opts.source.forEach(chunk => {
      parser.write(new TextEncoder().encode(chunk))
    })
    parser.end()

    setTimeout(() => {
      assert.deepStrictEqual(opts.expected, parts)
      if (opts.errors) {
        assert.deepEqual(opts.errors, errors)
      }
    }, 100)
  })
})

describe("web api", () => {
  test.each(cases)("$name", async opts => {
    const parts: Expected = []

    const parser = Web.make({
      ...(opts.config || {}),
      headers: new Headers({
        "content-type": "multipart/form-data; boundary=" + opts.boundary,
      }),
    })

    async function read() {
      const reader = parser.readable.getReader()
      while (true) {
        const result = await reader.read()
        if (result.done) {
          break
        }
        const part = result.value
        if (part._tag === "Field") {
          parts.push([
            "field",
            part.info.name,
            Multipart.decodeField(part.info, part.value),
            part.info.contentType,
          ])
        } else {
          const response = await new Response(part.readable).arrayBuffer()
          parts.push([
            "file",
            part.info.name,
            response.byteLength,
            part.info.filename!,
            part.info.contentType,
          ])
        }
      }
    }

    const readPromise = read()
    const writer = parser.writable.getWriter()

    try {
      for (const chunk of opts.source) {
        await writer.write(new TextEncoder().encode(chunk))
      }
      await writer.close()
      await readPromise

      assert.deepStrictEqual(opts.expected, parts)
    } catch (err) {
      if (opts.errors) {
        assert(opts.errors.length > 0)
      }
    }
  })
})
