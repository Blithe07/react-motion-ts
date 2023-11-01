import { describe, expect, it } from 'vitest'
import type { TransitionStyle } from '../src/Types'
import mergeDiff from '../src/mergeDiff'

const id = (_: number, s: TransitionStyle) => s
const n = () => null

// helper to make the tests more concise
function testFn(prevRaw: number[], nextRaw: number[], expectedRaw: number[], customOnRemove?: (prevIndex: number, prevStyleCell: TransitionStyle) => TransitionStyle | null) {
  // we elaborately construct prev/nextKeyStyleValMap + randomized style value to
  // check that the style object of the latter correctly merged into the final
  // output
  const prev: TransitionStyle[] = []
  const prevKeyStyleValMap: { [key: number]: number } = {}
  prevRaw.forEach((num) => {
    const styleVal = Math.random()
    // key needs to be a string; cast it
    prev.push({ key: String(num), style: { a: styleVal } })
    prevKeyStyleValMap[num] = styleVal
  })
  const next: TransitionStyle[] = []
  const nextKeyStyleValMap: { [key: number]: number } = {}
  nextRaw.forEach((num) => {
    const styleVal = Math.random()
    next.push({ key: String(num), style: { a: styleVal } })
    nextKeyStyleValMap[num] = styleVal
  })

  const expected = expectedRaw.map((num) => {
    return {
      key: String(num),
      style: { a: Object.prototype.hasOwnProperty.call(nextKeyStyleValMap, num) ? nextKeyStyleValMap[num] : prevKeyStyleValMap[num] },
    }
  })

  expect(mergeDiff(prev, next, n)).toEqual(next)
  // some tests pass in a `customOnRemove` to check edge cases; interpret
  // `expected`/`expectedRaw` as the output of mergeDiff using `customOnRemove`
  // instead of the default `id` function
  expect(mergeDiff(prev, next, customOnRemove || id)).toEqual(expected)
}

describe('mergeDiff', () => {
  it('should work with various merge orders', () => {
    // most of these tests are significant. Don't casually remove some. Those
    // marked as "meh" are the ones whose order can differ. We've chosen a
    // deterministic default in our mergeDiff implementation
    testFn([4], [], [4])
    testFn([], [3], [3])
    testFn([3], [3], [3])
    testFn([], [], [])
    testFn([2, 4, 5, 6], [2, 3, 4, 5], [2, 3, 4, 5, 6])
    testFn([2, 4, 5, 6, 7], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7])
    testFn([1, 2, 3], [2, 3, 4], [1, 2, 3, 4])
    testFn([2, 3, 4], [1, 2, 3], [1, 2, 3, 4])
    testFn([4], [1, 2, 3], [4, 1, 2, 3]) // meh
    testFn([1, 2, 3], [4], [1, 2, 3, 4]) // meh
    testFn([4, 2], [1, 2, 3], [4, 1, 2, 3]) // meh
    testFn([2, 4], [1, 2, 3], [1, 2, 4, 3]) // meh
    testFn([1, 5, 10], [3, 5, 7, 10], [1, 3, 5, 7, 10]) // meh
    testFn([4, 5, 10], [3, 5, 7, 10], [4, 3, 5, 7, 10]) // meh
    testFn([4], [3], [4, 3]) // meh
    testFn([1, 5], [5, 3], [1, 5, 3])
    testFn([5, 6], [3, 5], [3, 5, 6])
    testFn([1, 2, 3], [3, 2, 1], [3, 2, 1])
    testFn([3, 2, 1], [1, 2, 3], [1, 2, 3])
    testFn([1, 2, 3], [2, 1, 3], [2, 1, 3])
    testFn([1, 2, 3], [1, 3, 2], [1, 3, 2])
    testFn([1, 2, 3], [1, 2, 3], [1, 2, 3])
  })

  it('should work with some more typical onRemove callbacks', () => {
    testFn([1, 2, 3], [1, 9], [1, 2, 9], (index, s) => index === 1 ? s : null)
    testFn([1, 2, 3, 4], [5, 4, 2], [1, 5, 4, 2], (index, s) => index === 0 ? s : null)
  })

  it('should not call cb more than once per disappearing key', () => {
    let count = 0
    testFn([1], [], [], () => {
      count++
      return null
    })
    expect(count).toBe(1)
  })
})
