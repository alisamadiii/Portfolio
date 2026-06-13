import type { CSSProperties } from 'react'
import { MONO } from './constants'

export const eyebrow = (color = '#71717A'): CSSProperties => ({
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: '0.16em',
  color,
})

export const h2Style: CSSProperties = {
  margin: '0 0 18px',
  fontSize: 'clamp(32px, 4vw, 52px)',
  fontWeight: 600,
  letterSpacing: '-0.035em',
  lineHeight: 1.08,
}

export const container = (extra?: CSSProperties): CSSProperties => ({
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 clamp(20px, 4vw, 32px)',
  ...extra,
})
