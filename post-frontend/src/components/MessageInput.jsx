import React, { useState } from 'react'

export default function MessageInput({ token }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: text.trim(), sender: 'Familie' })
      })
      setText('')
      setSent(true)
      setTimeout(() => setSent(false), 2000)
    } catch (e) {
      alert('Fehler: ' + e.message)
    }
    setSending(false)
  }

  return (
    <div className="card">
      <h3>💬 Nachricht an Oma</h3>
      <div className="msg-input-area">
        <textarea
          className="msg-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') send() }}
          placeholder="Schreib Oma etwas Liebes... (Strg+Enter zum Senden)"
          maxLength={1000}
        />
        {sent && <div className="msg-sent-indicator">✓ Nachricht gesendet!</div>}
        <button className="msg-send-btn" onClick={send} disabled={sending || !text.trim()}>
          {sending ? 'Wird gesendet...' : '✈️ Senden'}
        </button>
      </div>
    </div>
  )
}
