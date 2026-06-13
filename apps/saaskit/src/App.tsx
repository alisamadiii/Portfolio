import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Changelog from './pages/Changelog'
import Docs from './pages/Docs'
import License from './pages/License'
import Terms from './pages/Terms'

/** Scroll to top on route change, but honour in-page #hash anchors. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/license" element={<License />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </>
  )
}
