interface SearchState {
  readonly needle: Uint8Array
  readonly needleLength: number
  readonly needleFirstVariation: number
  readonly needleFirstVariationIndex: number
  readonly indexes: Record<number, ReadonlyArray<number>>
  readonly firstByte: number
  readonly exactMatch: (chunk: Uint8Array, start: number) => boolean

  previousChunk: Uint8Array | undefined
  previousChunkLength: number
  matchIndex: number
}

type Callback = (index: number, chunk: Uint8Array) => void

function makeState(needle_: string): SearchState {
  const needle = new TextEncoder().encode(needle_)
  const needleLength = needle.length

  const indexes: Record<number, number[]> = {}
  for (let i = 0; i < needle.length; i++) {
    const b = needle[i]
    if (indexes[b] === undefined) indexes[b] = []
    indexes[b].push(i)
  }

  const needleFirstVariationIndex = needle.findIndex(b => b !== needle[0]) ?? 1
  const needleFirstVariation = needle[needleFirstVariationIndex]

  const exactMatch = new Function(
    "chunk",
    "start",
    "return " +
      [...needle]
        .filter((_, i) => i !== 0 || i !== needleFirstVariationIndex)
        .map((b, i) => `chunk[start + ${i}] === ${b}`)
        .join(" && "),
  ) as (chunk: Uint8Array, start: number) => boolean

  return {
    needle,
    needleLength,
    needleFirstVariation,
    needleFirstVariationIndex,
    indexes,
    firstByte: needle[0],
    exactMatch,
    previousChunk: undefined,
    previousChunkLength: 0,
    matchIndex: 0,
  }
}

function emitMatch(
  state: SearchState,
  chunk: Uint8Array,
  startPos: number,
  callback: Callback,
) {
  if (state.previousChunk !== undefined) {
    callback(state.matchIndex, state.previousChunk)
    state.previousChunk = undefined
  }

  if (startPos > 0) {
    callback(state.matchIndex, chunk.subarray(0, startPos))
  }

  state.matchIndex += 1
}

export function make(needle: string, callback: Callback) {
  const state = makeState(needle)

  function write(chunk: Uint8Array): void {
    let chunkLength = chunk.length

    if (chunkLength < state.needleLength) {
      if (state.previousChunk === undefined) {
        state.previousChunk = chunk
        state.previousChunkLength = chunkLength
        return
      }

      if (state.previousChunkLength + chunkLength < state.needleLength) {
        const newChunk = new Uint8Array(state.previousChunkLength + chunkLength)
        newChunk.set(state.previousChunk)
        newChunk.set(chunk, state.previousChunkLength)
        state.previousChunk = newChunk
        state.previousChunkLength = newChunk.length
        return
      }
    }

    outer: for (let i = 0; i < chunkLength; i += state.needleLength) {
      if (chunk[i] in state.indexes === false) {
        continue
      }
      const indexes = state.indexes[chunk[i]]

      for (let j = 0; j < indexes.length; j++) {
        const startPosition = i - indexes[j]

        if (startPosition + state.needleLength > chunkLength) {
          continue
        }

        if (startPosition < 0) {
          if (state.previousChunk === undefined) {
            continue
          } else if (
            state.previousChunk[state.previousChunkLength + startPosition] ===
            state.firstByte
          ) {
            const newChunk = new Uint8Array(
              state.previousChunkLength + chunkLength,
            )
            newChunk.set(state.previousChunk)
            newChunk.set(chunk, state.previousChunkLength)
            chunk = newChunk
            state.previousChunk = undefined
            chunkLength = newChunk.length
            i += state.previousChunkLength
            const newStartPosition = state.previousChunkLength + startPosition

            if (state.exactMatch(chunk, newStartPosition)) {
              state.previousChunk = undefined
              emitMatch(state, chunk, newStartPosition, callback)
              chunk = chunk.subarray(newStartPosition + state.needleLength)
              chunkLength = chunk.length
              i = 0
              continue outer
            }
          }
        } else if (
          chunk[startPosition] === state.firstByte &&
          chunk[startPosition + state.needleFirstVariationIndex] ===
            state.needleFirstVariation &&
          state.exactMatch(chunk, startPosition)
        ) {
          emitMatch(state, chunk, startPosition, callback)
          chunk = chunk.subarray(startPosition + state.needleLength)
          chunkLength = chunkLength - startPosition - state.needleLength
          i = 0
          continue outer
        }
      }
    }

    if (state.previousChunk !== undefined) {
      callback(state.matchIndex, state.previousChunk)
      state.previousChunk = chunk
      state.previousChunkLength = chunkLength
    } else if (chunkLength > 0) {
      state.previousChunk = chunk
      state.previousChunkLength = chunkLength
    } else {
      state.previousChunk = undefined
      state.previousChunkLength = 0
    }
  }

  function end(): void {
    if (state.previousChunk !== undefined) {
      callback(state.matchIndex, state.previousChunk)
    }

    state.previousChunk = undefined
    state.previousChunkLength = 0
    state.matchIndex = 0
  }

  return { write, end } as const
}
