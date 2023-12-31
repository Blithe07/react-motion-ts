import type { ReactElement } from 'react'

// === basic reused types ===
// type of the second parameter of `spring(val, config)` all fields are optional
export interface SpringHelperConfig {
  stiffness?: number
  damping?: number
  precision?: number
}
// the object returned by `spring(value, yourConfig)`. For internal usage only!
export interface OpaqueConfig {
  val: number
  stiffness: number
  damping: number
  precision: number
}
// your typical style object given in props. Maps to a number or a spring config
export interface Style { [key: string]: number | OpaqueConfig }
// the interpolating style object, with the same keys as the above Style object,
// with the values mapped to numbers, naturally
export interface PlainStyle { [key: string]: number }
// internal velocity object. Similar to PlainStyle, but whose numbers represent
// speed. Might be exposed one day.
export interface Velocity { [key: string]: number }

// === Motion ===
export interface MotionProps {
  defaultStyle?: PlainStyle
  style: Style
  children: (interpolatedStyle: PlainStyle) => ReactElement | null
  onRest?: () => void
}

// === StaggeredMotion ===
export interface StaggeredProps {
  defaultStyles?: Array<PlainStyle>
  styles: (previousInterpolatedStyles?: Array<PlainStyle>) => Array<Style>
  children: (interpolatedStyles: Array<PlainStyle>) => ReactElement
}

// === TransitionMotion ===
export interface TransitionStyle {
  key: string // unique ID to identify component across render animations
  data?: any // optional data you want to carry along the style, e.g. itemText
  style: Style // actual style you're passing
}
export interface TransitionPlainStyle {
  key: string
  data?: any
  // same as TransitionStyle, passed as argument to style/children function
  style: PlainStyle
}
export type WillEnter = (styleThatEntered: TransitionStyle) => PlainStyle
export type WillLeave = (styleThatLeft: TransitionStyle) => Style | null
export type DidLeave = (styleThatLeft: { key: string; data?: any }) => void

export interface TransitionProps {
  defaultStyles?: Array<TransitionPlainStyle>
  styles:
  | Array<TransitionStyle>
  | ((
    previousInterpolatedStyles?: Array<TransitionPlainStyle>,
  ) => Array<TransitionStyle>)
  children: (interpolatedStyles: Array<TransitionPlainStyle>) => ReactElement
  willEnter?: WillEnter
  willLeave?: WillLeave
  didLeave?: DidLeave
}
