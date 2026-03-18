import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import PhotoUpload from './components/PhotoUpload'
import MessageInput from './components/MessageInput'
import MessageHistory from './components/MessageHistory'
import VideoCall from './components/VideoCall'

const socket = io()

export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem('omasys_pw') || '')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState([])
  const [photos, setPhotos] = useState([])
  const [callActive, setCallActive] = useState(false)
  const [omaOnline, setOmaOnline] = useState(false)

  const login = async () => {
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (r.ok) {
        localStorage.setItem('omasys_pw', password)
        setAuthed(true)
        setAuthError('')
      } else {
        setAuthError('Falsches Passwort')
      }
    } catch (e) {
      setAuthError('Verbindungsfehler')
    }
  }

  useEffect(() => {
    if (!authed) {
      // Try saved password
      if (password) login()
      return
    }

    fetch('/api/messages').then(r => r.json()).then(setMessages)
    fetch('/api/reactions').then(r => r.json()).then(setReactions)
    fetch('/api/photos').then(r => r.json()).then(setPhotos)

    socket.on('new_message', msg => setMessages(prev => [...prev, msg]))
    socket.on('new_reaction', r => setReactions(prev => [r, ...prev]))
    socket.on('new_photo', p => setPhotos(prev => [p, ...prev]))
    socket.on('photo_deleted', ({ id }) => setPhotos(prev => prev.filter(p => p.id !== id)))
    socket.on('call_accepted', () => setCallActive(true))
    socket.on('call_ended', () => setCallActive(false))

    return () => socket.off()
  }, [authed])

  const startCall = () => {
    socket.emit('call_request', { from: 'Familie' })
    setCallActive(true)
  }

  const endCall = () => {
    socket.emit('call_ended')
    setCallActive(false)
  }

  if (!authed) {
    return (
      <div className="login-screen">
        <div className="login-box">
          <div className="login-logo">👵</div>
          <h1>OmaSys</h1>
          <p>Familie – Anmeldung</p>
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="login-input"
          />
          {authError && <div className="login-error">{authError}</div>}
          <button className="login-btn" onClick={login}>Anmelden</button>
        </div>
      </div>
    )
  }

  return (
    <div className="post-app">
      {callActive && <VideoCall onEnd={endCall} />}

      <header className="post-header">
        <div className="post-header-left">
          <span className="header-logo">👵</span>
          <h1>OmaSys</h1>
        </div>
        <div className="post-header-right">
          <button className="call-btn-header" onClick={startCall}>
            📹 Oma anrufen
          </button>
        </div>
      </header>

      <main className="post-main">
        <div className="post-col post-col-left">
          <PhotoUpload password={password} photos={photos} onPhotosChange={setPhotos} />
        </div>

        <div className="post-col post-col-right">
          <MessageInput password={password} />
          <MessageHistory messages={messages} />

          {reactions.length > 0 && (
            <div className="reactions-box">
              <h3>Omas Stimmung 💭</h3>
              <div className="reactions-list">
                {reactions.slice(0, 5).map(r => (
                  <div key={r.id} className="reaction-item">
                    <span>{r.reaction}</span>
                    <span className="reaction-time">{new Date(r.reacted_at).toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
