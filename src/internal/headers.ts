import { Continue, FailureReason, ReturnValue } from "../HeadersParser.js"

const constMaxPairs = 100
const constMaxSize = 16 * 1024

const enum State {
  key,
  whitespace,
  value,
}

const constContinue: Continue = { _tag: "Continue" }

const constNameChars = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1,
]

const constValueChars = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
]

export function make() {
  const decoder = new TextDecoder()
  const state = {
    state: State.key,
    headers: Object.create(null) as Record<string, string>,
    key: "",
    value: "",
    crlf: 0,
    pairs: 0,
    size: 0,
  }

  function reset(value: ReturnValue): ReturnValue {
    state.state = State.key
    state.headers = Object.create(null)
    state.key = ""
    state.value = ""
    state.crlf = 0
    state.pairs = 0
    state.size = 0
    return value
  }

  function error(reason: FailureReason) {
    return reset({ _tag: "Failure", reason, headers: state.headers })
  }

  return function write(chunk: Uint8Array, start: number): ReturnValue {
    const end = chunk.length

    outer: while (start < end) {
      if (state.state === State.key) {
        let i = start
        for (; i < end; i++) {
          if (state.size++ > constMaxSize) {
            return error("HeaderTooLarge")
          }

          if (chunk[i] === 58) {
            state.key += decoder.decode(chunk.slice(start, i)).toLowerCase()
            if (state.key === "") {
              return error("InvalidHeaderName")
            }

            if (
              chunk[i + 1] === 32 &&
              chunk[i + 2] !== 32 &&
              chunk[i + 2] !== 9
            ) {
              start = i + 2
              state.state = State.value
              state.size++
            } else if (chunk[i + 1] !== 32 && chunk[i + 1] !== 9) {
              start = i + 1
              state.state = State.value
            } else {
              start = i + 1
              state.state = State.whitespace
            }

            break
          } else if (constNameChars[chunk[i]] !== 1) {
            return error("InvalidHeaderName")
          }
        }
        if (i === end) {
          state.key += decoder.decode(chunk.slice(start, end)).toLowerCase()
          return constContinue
        }
      }

      if (state.state === State.whitespace) {
        for (; start < end; start++) {
          if (state.size++ > constMaxSize) {
            return error("HeaderTooLarge")
          }

          if (chunk[start] !== 32 && chunk[start] !== 9) {
            state.state = State.value
            break
          }
        }
        if (start === end) {
          return constContinue
        }
      }

      if (state.state === State.value) {
        let i = start
        for (; i < end; i++) {
          if (state.size++ > constMaxSize) {
            return error("HeaderTooLarge")
          }

          if (chunk[i] === 13 || state.crlf > 0) {
            let byte = chunk[i]

            if (byte === 13 && state.crlf === 0) {
              state.crlf = 1
              i++
              state.size++
              byte = chunk[i]
            }
            if (byte === 10 && state.crlf === 1) {
              state.crlf = 2
              i++
              state.size++
              byte = chunk[i]
            }
            if (byte === 13 && state.crlf === 2) {
              state.crlf = 3
              i++
              state.size++
              byte = chunk[i]
            }
            if (byte === 10 && state.crlf === 3) {
              state.crlf = 4
              i++
              state.size++
            }

            if (state.crlf >= 2) {
              state.value += decoder.decode(chunk.slice(start, i - state.crlf))
              state.headers[state.key] = state.value

              start = i
              state.size--

              if (state.crlf !== 4 && state.pairs === constMaxPairs) {
                return error("TooManyHeaders")
              } else if (state.crlf === 3) {
                return error("InvalidHeaderValue")
              } else if (state.crlf === 4) {
                return reset({
                  _tag: "Headers",
                  headers: state.headers,
                  endPosition: start,
                })
              }

              state.pairs++
              state.key = ""
              state.value = ""
              state.crlf = 0
              state.state = State.key

              continue outer
            }
          } else if (constValueChars[chunk[i]] !== 1) {
            return error("InvalidHeaderValue")
          }
        }

        if (i === end) {
          state.value += decoder.decode(chunk.slice(start, end))
          return constContinue
        }
      }
    }

    if (start > end) {
      state.size += end - start
    }

    return constContinue
  }
}
