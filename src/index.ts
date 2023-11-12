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

export type BaseConfig = {
  readonly headers: Record<string, string>
  readonly isFile?: (info: PartInfo) => boolean
  readonly maxParts?: number
  readonly maxTotalSize?: number
  readonly maxPartSize?: number
  readonly maxFieldSize?: number
}

export type Config = BaseConfig & {
  readonly onField: (info: PartInfo, value: Uint8Array) => void
  readonly onFile: (info: PartInfo) => (chunk: Uint8Array | null) => void
  readonly onError: (error: MultipartError) => void
  readonly onDone: () => void
}
export interface Parser {
  readonly write: (chunk: Uint8Array) => void
  readonly end: () => void
}

export const make: (options: Config) => Parser = internal.make

export const defaultIsFile: (info: PartInfo) => boolean = internal.defaultIsFile

export const decodeField: (info: PartInfo, value: Uint8Array) => string =
  internal.decodeField

// pull model

export interface File {
  readonly _tag: "File"
  readonly info: PartInfo
  readonly read: (cb: (chunk: ReadonlyArray<Uint8Array> | null) => void) => void
}

export interface Field {
  readonly _tag: "Field"
  readonly info: PartInfo
  readonly value: Uint8Array
}

export const isFile: (part: Part) => part is File = internal.isFile
export const isField: (part: Part) => part is Field = internal.isField

export type Part = File | Field

export type PullConfig<E> = BaseConfig & {
  readonly pull: (
    cb: (err: E | null, chunk: ReadonlyArray<Uint8Array> | null) => void,
  ) => void
}

export interface MultipartPullError<E> {
  readonly _tag: "MultipartPullError"
  readonly errors: ReadonlyArray<MultipartError | E>
}

export const makePull: <E = never>(
  config: PullConfig<E>,
) => (
  cb: (err: MultipartPullError<E> | null, part: readonly Part[] | null) => void,
) => void = internal.makePull
