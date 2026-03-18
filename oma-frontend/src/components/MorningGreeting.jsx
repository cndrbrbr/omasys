import React from 'react'

export default function MorningGreeting({ message, sub, onDismiss }) {
  return (
    <div className="morning-overlay">
      <div className="morning-box">
        <div className="morning-sun">☀️</div>
        <h1 className="morning-title">{message}</h1>
        <p className="morning-sub">{sub}</p>
        <button className="btn-dismiss" onClick={onDismiss}>
          Guten Morgen! 😊
        </button>
      </div>
    </div>
  )
}
