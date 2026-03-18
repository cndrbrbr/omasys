import React, { useState, useEffect, useRef } from 'react'

export default function PhotoDisplay({ photos }) {
  const [index, setIndex] = useState(0)
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(null)

  useEffect(() => {
    if (photos.length === 0) return
    setIndex(0)
  }, [photos.length])

  // Auto-advance every 8s, skips when manually paused
  useEffect(() => {
    if (photos.length <= 1) return
    const t = setInterval(() => {
      if (!pausedRef.current) {
        setIndex(i => (i + 1) % photos.length)
      }
    }, 8000)
    return () => clearInterval(t)
  }, [photos.length])

  const navigate = (dir) => {
    setIndex(i => (i + dir + photos.length) % photos.length)
    // Pause auto-advance for 30s after manual navigation
    pausedRef.current = true
    clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => { pausedRef.current = false }, 30000)
  }

  if (photos.length === 0) {
    return (
      <div className="photo-display">
        <div className="no-photos">
          <div className="no-photos-icon">🖼️</div>
          <span>Noch keine Bilder</span>
          <span style={{ fontSize: '1rem', color: '#666' }}>Familie schickt bald welche!</span>
        </div>
      </div>
    )
  }

  const photo = photos[index]

  return (
    <div className="photo-display">
      <div className="photo-main">
        <img src={`/uploads/${photo.filename}`} alt={photo.caption || 'Foto'} />
        {photo.caption && <div className="photo-caption">{photo.caption}</div>}
        <div className="photo-counter">{index + 1} / {photos.length}</div>

        {photos.length > 1 && (
          <>
            <button className="photo-arrow photo-arrow-left" onClick={() => navigate(-1)}>‹</button>
            <button className="photo-arrow photo-arrow-right" onClick={() => navigate(1)}>›</button>
          </>
        )}
      </div>
    </div>
  )
}
