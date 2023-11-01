import defaultNow from 'performance-now'
import raf from 'raf'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import mapToZero from './mapToZero'
import shouldStopAnimation from './shouldStopAnimation'
import stepper from './stepper'
import stripStyle from './stripStyle'

import type {
  MotionProps,
  PlainStyle,
  Style,
  Velocity,
} from './Types'

const msPerFrame = 1000 / 60

const Motion: React.FC<MotionProps> = ({
  defaultStyle,
  style,
  children,
  onRest,
}) => {
  const unmountingRef = useRef(false)
  const wasAnimatingRef = useRef(false)
  const animationIDRef = useRef<number | null>(null)
  const prevTimeRef = useRef(0)
  const accumulatedTimeRef = useRef(0)

  const [currentStyle, setCurrentStyle] = useState<PlainStyle>(() => {
    const initialStyle = defaultStyle || stripStyle(style)
    return initialStyle
  })
  const [currentVelocity, setCurrentVelocity] = useState<Velocity>(() =>
    mapToZero(currentStyle),
  )
  const [lastIdealStyle, setLastIdealStyle] = useState<PlainStyle>(
    currentStyle,
  )
  const [lastIdealVelocity, setLastIdealVelocity] = useState<Velocity>(
    currentVelocity,
  )

  const unreadPropStyleRef = useRef<Style | null>(null)

  const clearUnreadPropStyle = (destStyle: Style): void => {
    let dirty = false
    const newCurrentStyle = { ...currentStyle }
    const newCurrentVelocity = { ...currentVelocity }
    const newLastIdealStyle = { ...lastIdealStyle }
    const newLastIdealVelocity = { ...lastIdealVelocity }

    for (const key in destStyle) {
      if (!Object.prototype.hasOwnProperty.call(destStyle, key))
        continue

      const styleValue = destStyle[key]
      if (typeof styleValue === 'number') {
        dirty = true
        newCurrentStyle[key] = styleValue
        newCurrentVelocity[key] = 0
        newLastIdealStyle[key] = styleValue
        newLastIdealVelocity[key] = 0
      }
    }

    if (dirty) {
      setCurrentStyle(newCurrentStyle)
      setCurrentVelocity(newCurrentVelocity)
      setLastIdealStyle(newLastIdealStyle)
      setLastIdealVelocity(newLastIdealVelocity)
    }
  }

  const startAnimationIfNecessary = (): void => {
    if (unmountingRef.current || animationIDRef.current !== null)
      return
    animationIDRef.current = raf((timestamp) => {
      if (unmountingRef.current)
        return

      const propsStyle: Style = style
      if (
        shouldStopAnimation(
          currentStyle,
          propsStyle,
          currentVelocity,
        )
      ) {
        if (onRest && wasAnimatingRef.current)
          onRest()

        animationIDRef.current = null
        wasAnimatingRef.current = false
        accumulatedTimeRef.current = 0
        return
      }

      wasAnimatingRef.current = true

      const currentTime = timestamp || defaultNow()
      const timeDelta = currentTime - prevTimeRef.current
      prevTimeRef.current = currentTime
      accumulatedTimeRef.current += timeDelta

      if (accumulatedTimeRef.current > msPerFrame * 10)
        accumulatedTimeRef.current = 0

      if (accumulatedTimeRef.current === 0) {
        animationIDRef.current = null
        startAnimationIfNecessary()
        return
      }

      const currentFrameCompletion
        = (accumulatedTimeRef.current
          - Math.floor(accumulatedTimeRef.current / msPerFrame) * msPerFrame)
        / msPerFrame
      const framesToCatchUp = Math.floor(accumulatedTimeRef.current / msPerFrame)

      const newLastIdealStyle: PlainStyle = { ...lastIdealStyle }
      const newLastIdealVelocity: Velocity = { ...lastIdealVelocity }
      const newCurrentStyle: PlainStyle = { ...currentStyle }
      const newCurrentVelocity: Velocity = { ...currentVelocity }

      for (const key in propsStyle) {
        if (!Object.prototype.hasOwnProperty.call(propsStyle, key))
          continue

        const styleValue = propsStyle[key]
        if (typeof styleValue === 'number') {
          newCurrentStyle[key] = styleValue
          newCurrentVelocity[key] = 0
          newLastIdealStyle[key] = styleValue
          newLastIdealVelocity[key] = 0
        }
        else {
          let newLastIdealStyleValue = lastIdealStyle[key]
          let newLastIdealVelocityValue = lastIdealVelocity[key]
          for (let i = 0; i < framesToCatchUp; i++) {
            [newLastIdealStyleValue, newLastIdealVelocityValue] = stepper(
              msPerFrame / 1000,
              newLastIdealStyleValue,
              newLastIdealVelocityValue,
              styleValue.val,
              styleValue.stiffness,
              styleValue.damping,
              styleValue.precision,
            )
          }
          const [nextIdealX, nextIdealV] = stepper(
            msPerFrame / 1000,
            newLastIdealStyleValue,
            newLastIdealVelocityValue,
            styleValue.val,
            styleValue.stiffness,
            styleValue.damping,
            styleValue.precision,
          )

          newCurrentStyle[key]
            = newLastIdealStyleValue
            + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion
          newCurrentVelocity[key]
            = newLastIdealVelocityValue
            + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion
          newLastIdealStyle[key] = newLastIdealStyleValue
          newLastIdealVelocity[key] = newLastIdealVelocityValue
        }
      }

      animationIDRef.current = null
      accumulatedTimeRef.current -= framesToCatchUp * msPerFrame

      setCurrentStyle(newCurrentStyle)
      setCurrentVelocity(newCurrentVelocity)
      setLastIdealStyle(newLastIdealStyle)
      setLastIdealVelocity(newLastIdealVelocity)

      unreadPropStyleRef.current = null

      startAnimationIfNecessary()
    })
  }

  useEffect(() => {
    prevTimeRef.current = defaultNow()
    startAnimationIfNecessary()
    return () => {
      unmountingRef.current = true
      if (animationIDRef.current !== null) {
        raf.cancel(animationIDRef.current)
        animationIDRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (unreadPropStyleRef.current !== null)
      clearUnreadPropStyle(unreadPropStyleRef.current)

    unreadPropStyleRef.current = style
    if (animationIDRef.current === null) {
      prevTimeRef.current = defaultNow()
      startAnimationIfNecessary()
    }
  }, [style])

  return children(currentStyle)
}

export default Motion
