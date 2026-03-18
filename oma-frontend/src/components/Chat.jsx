import React, { useState, useEffect, useRef } from 'react'

function formatTime(str) {
  const d = new Date(str)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function Chat({ messages, socket }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await fetch('/api/messages/oma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      setInput('')
    } catch (e) {
      console.error(e)
    }
    setSending(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter') send()
  }

  return (
    <div className="chat-box">
      <div className="chat-header">💬 Nachrichten</div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{color: '#666', textAlign: 'center', marginTop: 20, fontSize: '1rem'}}>
            Noch keine Nachrichten
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.sender === 'Oma Sigrid' ? 'from-oma' : 'from-family'}`}
          >
            <div className="chat-sender">{msg.sender}</div>
            {msg.text}
            <div className="chat-time">{formatTime(msg.sent_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Antworten..."
          maxLength={500}
        />
        <button className="chat-send-btn" onClick={send} disabled={sending}>➤</button>
      </div>
    </div>
  )
}
