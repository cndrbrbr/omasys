import React, { useState } from 'react'

const MOODS = [
  { label: '😊 Sehr gut', value: 'Sehr gut', color: '#27ae60' },
  { label: '🙂 Ganz gut', value: 'Ganz gut', color: '#2980b9' },
  { label: '😕 Durcheinander', value: 'Durcheinander', color: '#f39c12' },
  { label: '😔 Nicht gut', value: 'Nicht gut', color: '#c0392b' },
]

export default function MoodButtons({ socket }) {
  const [sent, setSent] = useState('')

  const sendMood = async (mood) => {
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: mood.value })
      })
      setSent(`Gesendet: ${mood.value}`)
      setTimeout(() => setSent(''), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mood-box">
      <div className="mood-title">Wie geht es dir?</div>
      <div className="mood-grid">
        {MOODS.map(m => (
          <button
            key={m.value}
            className="mood-btn"
            style={{ background: m.color, color: 'white' }}
            onClick={() => sendMood(m)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="mood-sent">{sent}</div>
    </div>
  )
}
