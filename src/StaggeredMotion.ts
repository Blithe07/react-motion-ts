import defaultNow from 'performance-now'
import defaultRaf from 'raf'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import mapToZero from './mapToZero'
import shouldStopAnimation from './shouldStopAnimation'
import stepper from './stepper'
import stripStyle from './stripStyle'

import type {
  PlainStyle,
  StaggeredProps,
  Style,
  Velocity,
} from './Types'

const msPerFrame = 1000 / 60

function shouldStopAnimationAll(currentStyles: PlainStyle[], styles: Style[], currentVelocities: Velocity[]): boolean {
  for (let i = 0; i < currentStyles.length; i++) {
    if (!shouldStopAnimation(currentStyles[i], styles[i], currentVelocities[i]))
      return false
  }
  return true
}

const StaggeredMotion: React.FC<StaggeredProps> = ({
  defaultStyles,
  styles,
  children,
}) => {
  const unmountingRef = useRef(false)
  const animationIDRef = useRef<number | null>(null)
  const prevTimeRef = useRef(0)
  const accumulatedTimeRef = useRef(0)
  const [currentStyles, setCurrentStyles] = useState<PlainStyle[]>(() => {
    const initialStyles = defaultStyles || styles().map(stripStyle)
    return initialStyles
  })
  const [currentVelocities, setCurrentVelocities] = useState<Velocity[]>(
    currentStyles.map(currentStyle => mapToZero(currentStyle)),
  )
  const [lastIdealStyles, setLastIdealStyles] = useState<PlainStyle[]>(
    currentStyles,
  )
  const [lastIdealVelocities, setLastIdealVelocities] = useState<Velocity[]>(
    currentVelocities,
  )
  const unreadPropStylesRef = useRef<Style[] | null>(null)

  const clearUnreadPropStyle = (unreadPropStyles: Style[]): void => {
    let someDirty = false
    const newCurrentStyles: PlainStyle[] = [...currentStyles]
    const newCurrentVelocities: Velocity[] = [...currentVelocities]
    const newLastIdealStyles: PlainStyle[] = [...lastIdealStyles]
    const newLastIdealVelocities: Velocity[] = [...lastIdealVelocities]

    for (let i = 0; i < unreadPropStyles.length; i++) {
      const unreadPropStyle = unreadPropStyles[i]
      let dirty = false

      for (const key in unreadPropStyle) {
        if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key))
          continue

        const styleValue = unreadPropStyle[key]
        if (typeof styleValue === 'number') {
          if (!dirty) {
            dirty = true
            someDirty = true
            newCurrentStyles[i] = { ...newCurrentStyles[i] }
            newCurrentVelocities[i] = { ...newCurrentVelocities[i] }
            newLastIdealStyles[i] = { ...newLastIdealStyles[i] }
            newLastIdealVelocities[i] = { ...newLastIdealVelocities[i] }
          }
          newCurrentStyles[i][key] = styleValue
          newCurrentVelocities[i][key] = 0
          newLastIdealStyles[i][key] = styleValue
          newLastIdealVelocities[i][key] = 0
        }
      }
    }

    if (someDirty) {
      setCurrentStyles(newCurrentStyles)
      setCurrentVelocities(newCurrentVelocities)
      setLastIdealStyles(newLastIdealStyles)
      setLastIdealVelocities(newLastIdealVelocities)
    }
  }

  const startAnimationIfNecessary = (): void => {
    if (unmountingRef.current || animationIDRef.current !== null)
      return

    animationIDRef.current = defaultRaf((timestamp) => {
      if (unmountingRef.current)
        return

      const destStyles: Style[] = styles(lastIdealStyles)

      if (shouldStopAnimationAll(currentStyles, destStyles, currentVelocities)) {
        animationIDRef.current = null
        accumulatedTimeRef.current = 0
        return
      }

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

      const newLastIdealStyles: PlainStyle[] = []
      const newLastIdealVelocities: Velocity[] = []
      const newCurrentStyles: PlainStyle[] = []
      const newCurrentVelocities: Velocity[] = []

      for (let i = 0; i < destStyles.length; i++) {
        const destStyle = destStyles[i]
        const newCurrentStyle: PlainStyle = {}
        const newCurrentVelocity: Velocity = {}
        const newLastIdealStyle: PlainStyle = {}
        const newLastIdealVelocity: Velocity = {}

        for (const key in destStyle) {
          if (!Object.prototype.hasOwnProperty.call(destStyle, key))
            continue

          const styleValue = destStyle[key]
          if (typeof styleValue === 'number') {
            newCurrentStyle[key] = styleValue
            newCurrentVelocity[key] = 0
            newLastIdealStyle[key] = styleValue
            newLastIdealVelocity[key] = 0
          }
          else {
            let newLastIdealStyleValue = lastIdealStyles[i][key]
            let newLastIdealVelocityValue = lastIdealVelocities[i][key]
            for (let j = 0; j < framesToCatchUp; j++) {
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

        newCurrentStyles[i] = newCurrentStyle
        newCurrentVelocities[i] = newCurrentVelocity
        newLastIdealStyles[i] = newLastIdealStyle
        newLastIdealVelocities[i] = newLastIdealVelocity
      }

      animationIDRef.current = null
      accumulatedTimeRef.current -= framesToCatchUp * msPerFrame

      setCurrentStyles(newCurrentStyles)
      setCurrentVelocities(newCurrentVelocities)
      setLastIdealStyles(newLastIdealStyles)
      setLastIdealVelocities(newLastIdealVelocities)

      unreadPropStylesRef.current = null

      startAnimationIfNecessary()
    })
  }

  useEffect(() => {
    prevTimeRef.current = defaultNow()
    startAnimationIfNecessary()
    return () => {
      unmountingRef.current = true
      if (animationIDRef.current !== null) {
        defaultRaf.cancel(animationIDRef.current)
        animationIDRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (unreadPropStylesRef.current !== null)
      clearUnreadPropStyle(unreadPropStylesRef.current)

    unreadPropStylesRef.current = styles(lastIdealStyles)
    if (animationIDRef.current === null) {
      prevTimeRef.current = defaultNow()
      startAnimationIfNecessary()
    }
  }, [styles])

  return children(currentStyles)
}

export default StaggeredMotion
