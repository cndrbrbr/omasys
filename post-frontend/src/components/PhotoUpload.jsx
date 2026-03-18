import React, { useState, useRef } from 'react'

export default function PhotoUpload({ password, photos, onPhotosChange }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const upload = async () => {
    if (!file || uploading) return
    setUploading(true)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('caption', caption)
    try {
      const r = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'x-password': password },
        body: formData
      })
      if (!r.ok) throw new Error('Upload failed')
      setFile(null)
      setPreview(null)
      setCaption('')
    } catch (e) {
      alert('Upload fehlgeschlagen: ' + e.message)
    }
    setUploading(false)
  }

  const deletePhoto = async (id) => {
    if (!confirm('Bild löschen?')) return
    try {
      await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
        headers: { 'x-password': password }
      })
    } catch (e) {
      alert('Fehler beim Löschen')
    }
  }

  return (
    <div className="card">
      <h3>📸 Bilder senden</h3>

      <div
        className={`dropzone${dragOver ? ' active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <div className="dropzone-icon">📷</div>
        <p>Bild hier ablegen oder klicken zum Auswählen</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {preview && (
        <>
          <img src={preview} alt="Vorschau" className="upload-preview" />
          <input
            className="caption-input"
            placeholder="Bildunterschrift (optional)..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
          <button className="upload-btn" onClick={upload} disabled={uploading}>
            {uploading ? 'Wird gesendet...' : '📤 An Oma senden'}
          </button>
        </>
      )}

      {photos.length > 0 && (
        <>
          <div style={{ fontSize: '0.85rem', color: '#7a8499', marginTop: 16, marginBottom: 8 }}>
            Gesendete Bilder ({photos.length})
          </div>
          <div className="photo-grid">
            {photos.slice(0, 12).map(p => (
              <div key={p.id} className="photo-thumb">
                <img src={`/uploads/${p.filename}`} alt={p.caption} />
                <button className="photo-thumb-delete" onClick={() => deletePhoto(p.id)} title="Löschen">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
