// turn {x: {val: 1, stiffness: 1, damping: 2}, y: 2} generated by
// `{x: spring(1, {stiffness: 1, damping: 2}), y: 2}` into {x: 1, y: 2}

import type { OpaqueConfig, PlainStyle, Style } from './Types'

export default function stripStyle(style: Style): PlainStyle {
  const ret: PlainStyle = {}
  for (const key in style) {
    if (!Object.prototype.hasOwnProperty.call(style, key))
      continue

    ret[key] = typeof style[key] === 'number' ? (style[key] as number) : (style[key] as OpaqueConfig).val
  }
  return ret
}
