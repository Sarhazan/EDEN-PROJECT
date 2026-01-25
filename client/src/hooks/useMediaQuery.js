import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handleChange = (e) => setMatches(e.matches)

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
