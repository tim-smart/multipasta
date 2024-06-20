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

function makeMatcher(needle: Uint8Array, needleFirstVariationIndex: number) {
  const needleIndexes: Array<number> = []
  const needleChars: Array<number> = []
  for (let i = 0; i < needle.length; i++) {
    if (i === 0 || i === needleFirstVariationIndex) continue
    needleIndexes.push(i)
    needleChars.push(needle[i])
  }
  const needleIndexesLen = needleIndexes.length
  return function exactMatch(chunk: Uint8Array, start: number): boolean {
    for (let i = 0; i < needleIndexesLen; i++) {
      if (chunk[start + needleIndexes[i]] !== needleChars[i]) {
        return false
      }
    }
    return true
  }
}

function noopMatch(_: Uint8Array, __: number): boolean {
  return false
}

function makeState(needle_: string): SearchState {
  const needle = new TextEncoder().encode(needle_)
  const needleLength = needle.length

  const indexes: Record<number, number[]> = {}
  for (let i = 0; i < needleLength; i++) {
    const b = needle[i]
    if (indexes[b] === undefined) indexes[b] = []
    indexes[b].push(i)
  }

  const needleFirstVariationIndex = needle.findIndex(b => b !== needle[0]) ?? 1
  const needleFirstVariation = needle[needleFirstVariationIndex]

  const exactMatch =
    typeof Buffer === "function"
      ? noopMatch
      : makeMatcher(needle, needleFirstVariationIndex)

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

export function make(
  needle: string,
  callback: (index: number, chunk: Uint8Array) => void,
  seed?: Uint8Array,
) {
  const state = makeState(needle)
  if (seed !== undefined) {
    state.previousChunk = seed
    state.previousChunkLength = seed.length
  }

  function writeUint8Array(chunk: Uint8Array): void {
    if (state.previousChunk !== undefined) {
      const newChunk = new Uint8Array(state.previousChunkLength + chunk.length)
      newChunk.set(state.previousChunk)
      newChunk.set(chunk, state.previousChunkLength)
      chunk = newChunk
      state.previousChunk = undefined
      state.previousChunkLength = 0
    }

    let chunkLength = chunk.length
    if (chunkLength < state.needleLength) {
      state.previousChunk = chunk
      state.previousChunkLength = chunkLength
      return
    }

    outer: for (
      let i = state.needleLength - 1;
      i < chunkLength;
      i += state.needleLength
    ) {
      if (chunk[i] in state.indexes === false) {
        continue
      }
      const indexes = state.indexes[chunk[i]]

      for (let j = 0; j < indexes.length; j++) {
        const startPosition = i - indexes[j]

        if (startPosition < 0) {
          continue
        } else if (startPosition + state.needleLength > chunkLength) {
          if (
            chunk[startPosition] === state.firstByte &&
            chunk[chunkLength - 1] ===
              state.needle[chunkLength - startPosition - 1]
          ) {
            callback(state.matchIndex, chunk.subarray(0, startPosition))
            state.previousChunk = chunk.subarray(startPosition)
            state.previousChunkLength = chunkLength - startPosition
            return
          }
        } else if (
          chunk[startPosition] === state.firstByte &&
          chunk[startPosition + state.needleFirstVariationIndex] ===
            state.needleFirstVariation &&
          state.exactMatch(chunk, startPosition)
        ) {
          if (startPosition > 0) {
            callback(state.matchIndex, chunk.subarray(0, startPosition))
          }
          state.matchIndex += 1
          chunk = chunk.subarray(startPosition + state.needleLength)
          chunkLength = chunkLength - startPosition - state.needleLength
          i = -1
          continue outer
        }
      }
    }

    if (chunkLength > 0) {
      if (chunk[chunkLength - 1] in state.indexes) {
        const indexes = state.indexes[chunk[chunkLength - 1]]
        let earliestIndex = -1
        for (let i = 0, len = indexes.length; i < len; i++) {
          const index = indexes[i]
          if (
            chunk[chunkLength - 1 - index] === state.firstByte &&
            i > earliestIndex
          ) {
            earliestIndex = index
          }
        }
        if (earliestIndex === -1) {
          callback(state.matchIndex, chunk)
        } else {
          if (chunkLength - 1 - earliestIndex > 0) {
            callback(
              state.matchIndex,
              chunk.subarray(0, chunkLength - 1 - earliestIndex),
            )
          }
          state.previousChunk = chunk.subarray(chunkLength - 1 - earliestIndex)
          state.previousChunkLength = earliestIndex + 1
        }
      } else {
        callback(state.matchIndex, chunk)
      }
    }
  }

  function writeBuffer(chunk_: Buffer | Uint8Array): void {
    let chunk = Buffer.isBuffer(chunk_) ? chunk_ : Buffer.from(chunk_)
    let chunkLength = chunk.length

    if (state.previousChunk !== undefined) {
      const newChunk = Buffer.allocUnsafe(
        state.previousChunkLength + chunkLength,
      )
      newChunk.set(state.previousChunk)
      newChunk.set(chunk, state.previousChunkLength)
      chunk = newChunk
      chunkLength = state.previousChunkLength + chunkLength
      state.previousChunk = undefined
    }

    if (chunkLength < state.needleLength) {
      state.previousChunk = chunk
      state.previousChunkLength = chunkLength
      return
    }

    let pos = 0
    while (pos < chunkLength) {
      const match = chunk.indexOf(state.needle, pos)

      if (match > -1) {
        if (match > pos) {
          callback(state.matchIndex, chunk.subarray(pos, match))
        }
        state.matchIndex += 1
        pos = match + state.needleLength
        continue
      } else if (chunk[chunkLength - 1] in state.indexes) {
        const indexes = state.indexes[chunk[chunkLength - 1]]
        let earliestIndex = -1
        for (let i = 0, len = indexes.length; i < len; i++) {
          const index = indexes[i]
          if (
            chunk[chunkLength - 1 - index] === state.firstByte &&
            i > earliestIndex
          ) {
            earliestIndex = index
          }
        }
        if (earliestIndex === -1) {
          if (pos === 0) {
            callback(state.matchIndex, chunk)
          } else {
            callback(state.matchIndex, chunk.subarray(pos))
          }
        } else {
          if (chunkLength - 1 - earliestIndex > pos) {
            callback(
              state.matchIndex,
              chunk.subarray(pos, chunkLength - 1 - earliestIndex),
            )
          }
          state.previousChunk = chunk.subarray(chunkLength - 1 - earliestIndex)
          state.previousChunkLength = earliestIndex + 1
        }
      } else if (pos === 0) {
        callback(state.matchIndex, chunk)
      } else {
        callback(state.matchIndex, chunk.subarray(pos))
      }

      break
    }
  }

  function end(): void {
    if (state.previousChunk !== undefined && state.previousChunk !== seed) {
      callback(state.matchIndex, state.previousChunk)
    }

    state.previousChunk = seed
    state.previousChunkLength = seed?.length ?? 0
    state.matchIndex = 0
  }

  return {
    write: "Buffer" in globalThis ? writeBuffer : writeUint8Array,
    end,
  } as const
}
