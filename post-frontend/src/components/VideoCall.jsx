import React from 'react'

const JITSI_ROOM = 'OmaSigridFamilie'

export default function VideoCall({ onEnd }) {
  return (
    <div className="videocall-overlay">
      <div className="videocall-bar">
        <h3>📹 Videoanruf mit Oma Sigrid</h3>
        <button className="btn-end-call" onClick={onEnd}>Auflegen ✕</button>
      </div>
      <iframe
        className="videocall-frame"
        src={`https://meet.jit.si/${JITSI_ROOM}`}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        title="Videoanruf"
      />
    </div>
  )
}
