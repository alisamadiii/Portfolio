import { useEffect, useState } from 'react'
import { CMD, MID_BP, MOBILE_BP } from './constants'

export function useViewport() {
  const [vp, setVp] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440
    return { isMobile: w < MOBILE_BP, isMid: w >= MOBILE_BP && w < MID_BP }
  })
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      setVp((prev) => {
        const next = { isMobile: w < MOBILE_BP, isMid: w >= MOBILE_BP && w < MID_BP }
        return next.isMobile === prev.isMobile && next.isMid === prev.isMid
          ? prev
          : next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

export function useScrolled() {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 24,
  )
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

export function useReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reveal = (el: HTMLElement) => el.setAttribute('data-on', '1')
    if (!('IntersectionObserver' in window)) {
      els.forEach(reveal)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement)
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export function useCopy(): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(CMD).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return [copied, copy]
}
