import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Clock from './components/Clock'
import MorningGreeting from './components/MorningGreeting'
import PhotoDisplay from './components/PhotoDisplay'
import Chat from './components/Chat'
import MoodButtons from './components/MoodButtons'
import VideoCall from './components/VideoCall'

const socket = io()

export default function App() {
  const [photos, setPhotos] = useState([])
  const [messages, setMessages] = useState([])
  const [morningGreeting, setMorningGreeting] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)

  useEffect(() => {
    // Check if it's morning (07:00 - 10:00)
    const now = new Date()
    const h = now.getHours()
    if (h >= 7 && h < 10) {
      setMorningGreeting({
        message: 'Guten Morgen, Oma Sigrid!',
        sub: 'Ein neuer schöner Tag beginnt. ☀️'
      })
    }

    // Load initial data
    fetch('/api/photos')
      .then(r => r.json())
      .then(setPhotos)
      .catch(console.error)

    fetch('/api/messages')
      .then(r => r.json())
      .then(setMessages)
      .catch(console.error)

    // Socket events
    socket.on('new_photo', photo => {
      setPhotos(prev => [photo, ...prev])
    })
    socket.on('photo_deleted', ({ id }) => {
      setPhotos(prev => prev.filter(p => p.id !== id))
    })
    socket.on('new_message', msg => {
      setMessages(prev => [...prev, msg])
    })
    socket.on('morning_greeting', data => {
      setMorningGreeting(data)
    })
    socket.on('incoming_call', () => {
      setIncomingCall(true)
    })
    socket.on('call_ended', () => {
      setCallActive(false)
      setIncomingCall(false)
    })

    return () => socket.off()
  }, [])

  const dismissGreeting = () => setMorningGreeting(null)

  const acceptCall = () => {
    setIncomingCall(false)
    setCallActive(true)
    socket.emit('call_accepted')
  }

  const endCall = () => {
    setCallActive(false)
    setIncomingCall(false)
    socket.emit('call_ended')
  }

  return (
    <div className="oma-app">
      {morningGreeting && (
        <MorningGreeting
          message={morningGreeting.message}
          sub={morningGreeting.sub}
          onDismiss={dismissGreeting}
        />
      )}

      {incomingCall && !callActive && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-box">
            <div className="call-icon">📞</div>
            <h2>Familie ruft an!</h2>
            <button className="btn-accept" onClick={acceptCall}>Annehmen ✓</button>
            <button className="btn-decline" onClick={() => setIncomingCall(false)}>Ablehnen ✗</button>
          </div>
        </div>
      )}

      {callActive && (
        <VideoCall onEnd={endCall} />
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
            <Chat messages={messages} socket={socket} />
            <MoodButtons socket={socket} />
          </div>
        </div>
      </div>
    </div>
  )
}
