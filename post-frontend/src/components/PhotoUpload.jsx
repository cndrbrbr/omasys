import React, { useState, useRef } from 'react'

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv', '.m4v']
const MAX_FILES = 5

function isVideoFile(file) {
  if (!file) return false
  if (file.type.startsWith('video/')) return true
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return VIDEO_EXTS.includes(ext)
}

function isVideoFilename(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase()
  return VIDEO_EXTS.includes(ext)
}

function buildEntry(file) {
  const isVid = isVideoFile(file)
  return {
    file,
    isVid,
    preview: isVid ? URL.createObjectURL(file) : null,
    caption: '',
    uploading: false,
    done: false,
    error: null,
  }
}

function readImagePreview(entry) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => resolve({ ...entry, preview: e.target.result })
    reader.readAsDataURL(entry.file)
  })
}

export default function PhotoUpload({ token, photos, onPhotosChange }) {
  const [entries, setEntries] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadingAll, setUploadingAll] = useState(false)
  const inputRef = useRef()

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') || isVideoFile(f))
      .slice(0, MAX_FILES)

    const slots = MAX_FILES - entries.length
    if (slots <= 0) return
    const toAdd = incoming.slice(0, slots)

    const built = toAdd.map(buildEntry)
    // Load image previews (videos already have object URLs)
    const withPreviews = await Promise.all(
      built.map(e => e.isVid ? e : readImagePreview(e))
    )
    setEntries(prev => [...prev, ...withPreviews])
  }

  const removeEntry = (i) => {
    setEntries(prev => {
      const e = prev[i]
      if (e.isVid && e.preview) URL.revokeObjectURL(e.preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  const setCaption = (i, value) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, caption: value } : e))
  }

  const uploadAll = async () => {
    if (uploadingAll) return
    setUploadingAll(true)

    const updated = [...entries]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].done) continue
      updated[i] = { ...updated[i], uploading: true, error: null }
      setEntries([...updated])

      const formData = new FormData()
      formData.append('photo', updated[i].file)
      formData.append('caption', updated[i].caption)
      try {
        const r = await fetch('/api/photos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        if (!r.ok) throw new Error(await r.text())
        if (updated[i].isVid) URL.revokeObjectURL(updated[i].preview)
        updated[i] = { ...updated[i], uploading: false, done: true }
      } catch (e) {
        updated[i] = { ...updated[i], uploading: false, error: 'Fehler: ' + e.message }
      }
      setEntries([...updated])
    }

    // Remove successfully uploaded entries
    setEntries(prev => prev.filter(e => !e.done))
    setUploadingAll(false)
  }

  const deletePhoto = async (id) => {
    if (!confirm('Datei löschen?')) return
    try {
      await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      alert('Fehler beim Löschen')
    }
  }

  const pendingCount = entries.filter(e => !e.done).length

  return (
    <div className="card">
      <h3>📸 Bilder & Videos senden</h3>

      {entries.length < MAX_FILES && (
        <div
          className={`dropzone${dragOver ? ' active' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        >
          <div className="dropzone-icon">📷</div>
          <p>
            Bilder/Videos ablegen oder klicken
            {entries.length > 0 && ` (${entries.length}/${MAX_FILES})`}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f5f7fa', borderRadius: 8, padding: 8 }}>
              <div style={{ flexShrink: 0, width: 80, height: 60, borderRadius: 6, overflow: 'hidden', background: '#000', position: 'relative' }}>
                {e.isVid ? (
                  <>
                    <video src={e.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', pointerEvents: 'none' }}>▶</span>
                  </>
                ) : (
                  <img src={e.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', color: '#7a8499', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.file.name}
                </div>
                <input
                  className="caption-input"
                  style={{ marginBottom: 0, width: '100%' }}
                  placeholder="Beschriftung (optional)..."
                  value={e.caption}
                  onChange={ev => setCaption(i, ev.target.value)}
                  disabled={e.uploading || e.done}
                />
                {e.error && <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 4 }}>{e.error}</div>}
                {e.uploading && <div style={{ color: '#7a8499', fontSize: '0.8rem', marginTop: 4 }}>Wird hochgeladen...</div>}
              </div>
              <button
                onClick={() => removeEntry(i)}
                disabled={e.uploading}
                style={{ flexShrink: 0, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                title="Entfernen"
              >✕</button>
            </div>
          ))}

          <button className="upload-btn" onClick={uploadAll} disabled={uploadingAll || pendingCount === 0}>
            {uploadingAll
              ? 'Wird gesendet...'
              : `📤 ${pendingCount === 1 ? '1 Datei' : `${pendingCount} Dateien`} an Oma senden`}
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <div style={{ fontSize: '0.85rem', color: '#7a8499', marginTop: 16, marginBottom: 8 }}>
            Gesendete Dateien ({photos.length})
          </div>
          <div className="photo-grid">
            {photos.slice(0, 12).map(p => (
              <div key={p.id} className="photo-thumb">
                {isVideoFilename(p.filename) ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video
                      src={`/uploads/${p.filename}`}
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{ position: 'absolute', fontSize: '1.5rem', pointerEvents: 'none' }}>▶</span>
                  </div>
                ) : (
                  <img src={`/uploads/${p.filename}`} alt={p.caption} />
                )}
                <button className="photo-thumb-delete" onClick={() => deletePhoto(p.id)} title="Löschen">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
