import React, { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import Clock from './components/Clock'
import MorningGreeting from './components/MorningGreeting'
import PhotoDisplay from './components/PhotoDisplay'
import Chat from './components/Chat'
import MoodButtons from './components/MoodButtons'
import VideoCall from './components/VideoCall'

// ── Auth helpers ──────────────────────────────────────────────

function getToken() { return localStorage.getItem('omasys_oma_token') }
function saveToken(t) { localStorage.setItem('omasys_oma_token', t) }
function clearToken() { localStorage.removeItem('omasys_oma_token') }

function isTokenValid(token) {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch { return false }
}

function authFetch(url, options = {}) {
  const token = getToken()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` }
  })
}

// ── PIN Login Screen ──────────────────────────────────────────

function PinLogin({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!pin || loading) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/auth/oma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      const data = await r.json()
      if (r.ok) {
        saveToken(data.token)
        onLogin(data.token)
      } else {
        setError(data.error || 'Falscher PIN')
        setPin('')
      }
    } catch {
      setError('Verbindungsfehler')
    }
    setLoading(false)
  }

  const pressKey = (k) => {
    if (k === '⌫') setPin(p => p.slice(0, -1))
    else if (pin.length < 8) setPin(p => p + k)
  }

  useEffect(() => {
    if (pin.length >= 4) login()
  }, [pin])

  return (
    <div className="pin-screen">
      <div className="pin-box">
        <div className="pin-logo">👵</div>
        <h1 className="pin-title">Hallo, Oma Sigrid!</h1>
        <p className="pin-subtitle">Bitte PIN eingeben</p>
        <div className="pin-dots">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
          ))}
        </div>
        {error && <div className="pin-error">{error}</div>}
        <div className="pin-pad">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button
              key={i}
              className={`pin-key${k === '' ? ' pin-key-empty' : ''}`}
              onClick={() => k !== '' && pressKey(k)}
              disabled={loading || k === ''}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────

let socket = null

export default function App() {
  const [token, setToken] = useState(() => {
    const t = getToken()
    return isTokenValid(t) ? t : null
  })
  const [photos, setPhotos] = useState([])
  const [messages, setMessages] = useState([])
  const [morningGreeting, setMorningGreeting] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)

  const logout = useCallback(() => {
    clearToken()
    setToken(null)
    if (socket) { socket.disconnect(); socket = null }
  }, [])

  useEffect(() => {
    if (!token) return

    // Morning greeting between 07:00–10:00
    const h = new Date().getHours()
    if (h >= 7 && h < 10) {
      setMorningGreeting({ message: 'Guten Morgen, Oma Sigrid!', sub: 'Ein neuer schöner Tag beginnt. ☀️' })
    }

    // Connect socket with JWT
    socket = io({ auth: { token } })

    socket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') logout()
    })

    // Load initial data
    authFetch('/api/photos').then(r => r.ok ? r.json() : []).then(setPhotos)
    authFetch('/api/messages').then(r => r.ok ? r.json() : []).then(setMessages)

    socket.on('new_photo', photo => setPhotos(prev => [photo, ...prev]))
    socket.on('photo_deleted', ({ id }) => setPhotos(prev => prev.filter(p => p.id !== id)))
    socket.on('new_message', msg => setMessages(prev => [...prev, msg]))
    socket.on('morning_greeting', data => setMorningGreeting(data))
    socket.on('incoming_call', () => setIncomingCall(true))
    socket.on('call_ended', () => { setCallActive(false); setIncomingCall(false) })

    return () => { if (socket) { socket.disconnect(); socket = null } }
  }, [token, logout])

  const handleLogin = (t) => setToken(t)

  if (!token) return <PinLogin onLogin={handleLogin} />

  return (
    <div className="oma-app">
      {morningGreeting && (
        <MorningGreeting
          message={morningGreeting.message}
          sub={morningGreeting.sub}
          onDismiss={() => setMorningGreeting(null)}
        />
      )}

      {incomingCall && !callActive && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-box">
            <div className="call-icon">📞</div>
            <h2>Familie ruft an!</h2>
            <button className="btn-accept" onClick={() => { setIncomingCall(false); setCallActive(true); socket?.emit('call_accepted') }}>Annehmen ✓</button>
            <button className="btn-decline" onClick={() => setIncomingCall(false)}>Ablehnen ✗</button>
          </div>
        </div>
      )}

      {callActive && (
        <VideoCall onEnd={() => { setCallActive(false); setIncomingCall(false); socket?.emit('call_ended') }} />
      )}

      <div className="oma-layout">
        <div className="top-bar">
          <Clock />
        </div>
        <div className="main-area">
          <div className="photo-area">
            <PhotoDisplay photos={photos} />
          </div>
          <div className="sidebar">
            <Chat messages={messages} token={token} />
            <MoodButtons token={token} />
          </div>
        </div>
      </div>
    </div>
  )
}
