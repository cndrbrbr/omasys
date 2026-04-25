import React, { useState, useEffect, useRef } from 'react'

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv', '.m4v']

function isVideo(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase()
  return VIDEO_EXTS.includes(ext)
}

export default function PhotoDisplay({ photos }) {
  const [index, setIndex] = useState(0)
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (photos.length === 0) return
    setIndex(0)
  }, [photos.length])

  // Auto-advance every 8s for images; videos advance via onEnded
  useEffect(() => {
    if (photos.length <= 1) return
    const t = setInterval(() => {
      if (!pausedRef.current && !isVideo(photos[index]?.filename || '')) {
        setIndex(i => (i + 1) % photos.length)
      }
    }, 8000)
    return () => clearInterval(t)
  }, [photos.length, index])

  // When index changes to a video, autoplay it
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [index])

  const navigate = (dir) => {
    setIndex(i => (i + dir + photos.length) % photos.length)
    // Pause auto-advance for 30s after manual navigation
    pausedRef.current = true
    clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => { pausedRef.current = false }, 30000)
  }

  const handleVideoEnded = () => {
    if (!pausedRef.current) {
      setIndex(i => (i + 1) % photos.length)
    }
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

  const item = photos[index]
  const itemIsVideo = isVideo(item.filename)

  return (
    <div className="photo-display">
      <div className="photo-main">
        {itemIsVideo ? (
          <video
            key={item.filename}
            ref={videoRef}
            src={`/uploads/${item.filename}`}
            muted
            autoPlay
            controls
            playsInline
            onEnded={handleVideoEnded}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : (
          <img src={`/uploads/${item.filename}`} alt={item.caption || 'Foto'} />
        )}

        {item.caption && <div className="photo-caption">{item.caption}</div>}
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
