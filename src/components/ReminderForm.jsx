import React, { useState } from 'react';

export default function ReminderForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title && !text) return;
    onAdd({ title, text, date, time });
    setTitle('');
    setText('');
    setDate('');
    setTime('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
      <br></br>
      <input
        type="text"
        placeholder="Reminder title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={styles.input}
      />
      <textarea
        placeholder="Reminder text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={styles.textarea}
      />
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.input}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={styles.input}
        />
      </div>
      <button type="submit" style={styles.button}>Add Reminder</button>
    </form>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    height: '80px',
    marginBottom: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 14px',
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};