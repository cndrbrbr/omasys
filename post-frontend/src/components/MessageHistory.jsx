import React, { useEffect, useRef } from 'react'

function formatTime(str) {
  const d = new Date(str)
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MessageHistory({ messages }) {
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="card">
      <h3>📜 Verlauf</h3>
      <div className="history-list">
        {messages.length === 0 && (
          <div style={{ color: '#7a8499', fontSize: '0.9rem', textAlign: 'center', padding: 16 }}>
            Noch keine Nachrichten
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`history-msg ${msg.sender === 'Oma Sigrid' ? 'oma' : 'family'}`}
          >
            <div className="history-sender">{msg.sender}</div>
            {msg.text}
            <div className="history-time">{formatTime(msg.sent_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
