import * as internal from "./internal/multipart.js"
import type * as HeadersParser from "./HeadersParser.js"

export interface PartInfo {
  readonly name: string
  readonly filename?: string
  readonly contentType: string
  readonly contentTypeParameters: Record<string, string>
  readonly contentDiposition: string
  readonly contentDipositionParameters: Record<string, string>
  readonly headers: Record<string, string>
}

export type MultipartError =
  | {
      readonly _tag: "InvalidBoundary"
    }
  | {
      readonly _tag: "BadHeaders"
      readonly error: HeadersParser.Failure
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

export type Config = {
  readonly headers: Record<string, string>
  readonly onField: (info: PartInfo, value: Uint8Array) => void
  readonly onFile: (info: PartInfo) => (chunk: Uint8Array | null) => void
  readonly onError: (error: MultipartError) => void
  readonly onDone: () => void
  readonly isFile?: (info: PartInfo) => boolean
  readonly maxParts?: number
  readonly maxTotalSize?: number
  readonly maxPartSize?: number
  readonly maxFieldSize?: number
}

export const make: (options: Config) => {
  readonly write: (chunk: Uint8Array) => void
  readonly end: () => void
} = internal.make

export const defaultIsFile: (info: PartInfo) => boolean = internal.defaultIsFile

export const decodeField: (info: PartInfo, value: Uint8Array) => string =
  internal.decodeField

// reader model

export type ReaderConfig = {
  readonly headers: Record<string, string>
  readonly isFile?: (info: PartInfo) => boolean
  readonly maxParts?: number
  readonly maxTotalSize?: number
  readonly maxPartSize?: number
  readonly maxFieldSize?: number
}

export interface File {
  readonly _tag: "File"
  readonly info: PartInfo
  readonly read: () => ReadonlyArray<Uint8Array> | null
  readonly ignore: () => void
}

export interface Field {
  readonly _tag: "Field"
  readonly info: PartInfo
  readonly value: Uint8Array
}

export type Part = File | Field

export const isFile: (part: Part) => part is File = internal.isFile
export const isField: (part: Part) => part is Field = internal.isField

export interface MultipartReadError {
  readonly _tag: "MultipartReadError"
  readonly errors: ReadonlyArray<MultipartError>
}

export type ReadResult = readonly [
  MultipartReadError | null,
  ReadonlyArray<Part>,
]

export const makeReader: (
  config: ReaderConfig,
) => (chunk: Uint8Array | null) => ReadResult = internal.makeReader
