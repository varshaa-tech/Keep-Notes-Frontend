import React from 'react';

export default function ReminderPopup({ reminder, onSnooze, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0px 2px 10px rgba(0,0,0,0.3)',
      zIndex: 9999,
    }}>
      <h3>{reminder.title}</h3>
      <p>{reminder.text}</p>
      <button onClick={onSnooze} style={{ marginRight: '10px' }}>
        Snooze 10 min
      </button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
