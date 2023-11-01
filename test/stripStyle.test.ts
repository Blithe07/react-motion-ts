import { describe, expect, it } from 'vitest'
import spring from '../src/spring'
import stripStyle from '../src/stripStyle'

describe('stripStyle', () => {
  it('should return spring object into value', () => {
    expect(stripStyle({ a: spring(1, { stiffness: 1, damping: 2 }) })).toEqual({ a: 1 })
  })

  it('should ignore non-configured values', () => {
    expect(stripStyle({ a: 10, b: 0 })).toEqual({ a: 10, b: 0 })
  })
})
