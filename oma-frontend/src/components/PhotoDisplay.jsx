import React, { useState, useEffect } from 'react'

export default function PhotoDisplay({ photos }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length === 0) return
    setIndex(0)
  }, [photos.length])

  useEffect(() => {
    if (photos.length <= 1) return
    const t = setInterval(() => {
      setIndex(i => (i + 1) % photos.length)
    }, 8000)
    return () => clearInterval(t)
  }, [photos.length])

  if (photos.length === 0) {
    return (
      <div className="photo-display">
        <div className="no-photos">
          <div className="no-photos-icon">🖼️</div>
          <span>Noch keine Bilder</span>
          <span style={{fontSize: '1rem', color: '#666'}}>Familie schickt bald welche!</span>
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
      </div>
      {photos.length > 1 && (
        <div className="photo-nav">
          <button className="photo-nav-btn" onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}>◀</button>
          <button className="photo-nav-btn" onClick={() => setIndex(i => (i + 1) % photos.length)}>▶</button>
        </div>
      )}
    </div>
  )
}
