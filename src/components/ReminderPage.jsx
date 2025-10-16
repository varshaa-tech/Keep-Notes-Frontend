import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Clock, Calendar, Plus, Edit2, Bell, Volume2 } from 'lucide-react';

const ReminderPage = ({ 
  reminders, 
  onAddReminder, 
  onUpdateReminder, 
  onDeleteReminder, 
  onToggleComplete 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    priority: 'medium'
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationSound, setNotificationSound] = useState('beep');
  const [customSoundFile, setCustomSoundFile] = useState(null);
  
  const audioContextRef = useRef(null);
  const customAudioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize audio context with proper error handling
  useEffect(() => {
    const initAudioContext = () => {
      try {
        if (window.AudioContext || window.webkitAudioContext) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    };

    initAudioContext();

    // Cleanup function
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
    };
  }, []);

  // Create beep sound with error handling
  const createBeepSound = useCallback(() => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext || audioContext.state === 'closed') return;

      // Resume context if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Error creating beep sound:', error);
    }
  }, []);

  const handleSoundFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      // Clean up previous file URL
      if (customAudioRef.current) {
        URL.revokeObjectURL(customAudioRef.current.src);
      }
      
      setCustomSoundFile(file);
      setNotificationSound('custom');
    }
  };

  const showNotification = useCallback((reminder) => {
    // Play sound based on selected option
    try {
      if (notificationSound === 'custom' && customSoundFile) {
        const audioUrl = URL.createObjectURL(customSoundFile);
        const audio = new Audio(audioUrl);
        customAudioRef.current = audio;
        
        audio.play()
          .then(() => {
            // Clean up URL after playing
            setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
          })
          .catch(err => {
            console.warn('Error playing custom sound:', err);
            URL.revokeObjectURL(audioUrl);
          });
      } else if (notificationSound === 'beep') {
        createBeepSound();
      }
      // If 'none' is selected, no sound plays
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }

    // Create visual notification
    const notification = {
      id: Date.now(),
      reminder,
      timestamp: new Date()
    };

    setNotifications(prev => [notification, ...prev]);

    // Browser notification if permission granted
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Reminder: ${reminder.title}`, {
          body: reminder.description || 'Time for your reminder!',
          icon: '/favicon.ico',
          tag: reminder.id
        });
      }
    } catch (error) {
      console.warn('Error showing browser notification:', error);
    }

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
  }, [notificationSound, customSoundFile, createBeepSound]);

  // Check for due reminders every minute - SINGLE INSTANCE
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');
      const currentDate = now.toISOString().split('T')[0];

      reminders.forEach(reminder => {
        // Only check reminders that are NOT completed and NOT already notified
        if (reminder.date && reminder.time && !reminder.completed && !reminder.notified) {
          if (reminder.date === currentDate && reminder.time === currentTime) {
            showNotification(reminder);
            // Mark as notified to prevent repeated notifications
            onUpdateReminder(reminder.id, { notified: true });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [reminders, onUpdateReminder, showNotification]);

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.warn);
    }
  }, []);

  // Cleanup function for audio URLs
  useEffect(() => {
    return () => {
      if (customAudioRef.current) {
        URL.revokeObjectURL(customAudioRef.current.src);
      }
    };
  }, []);

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleSubmit = () => {
    if (!newReminder.title.trim()) return;
    
    if (editingReminder) {
      // Update existing reminder
      onUpdateReminder(editingReminder.id, {
        ...newReminder,
        notified: false // Reset notification status when editing
      });
      setEditingReminder(null);
    } else {
      // Add new reminder
      onAddReminder({
        ...newReminder,
        id: Date.now().toString(),
        notified: false
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setNewReminder({
      title: '',
      description: '',
      date: '',
      time: '',
      priority: 'medium'
    });
    setShowForm(false);
    setEditingReminder(null);
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setNewReminder({
      title: reminder.title,
      description: reminder.description || '',
      date: reminder.date || '',
      time: reminder.time || '',
      priority: reminder.priority || 'medium'
    });
    setShowForm(true);
  };

  const handleDelete = (reminderId) => {
    console.log('Deleting reminder with ID:', reminderId);
    if (reminderId && reminderId !== 'undefined') {
      onDeleteReminder(reminderId);
    } else {
      console.error('Invalid reminder ID:', reminderId);
    }
  };

  const testNotification = () => {
    const testReminder = {
      id: 'test',
      title: 'Test Notification',
      description: 'This is a test notification with sound!'
    };
    showNotification(testReminder);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Notification Panel */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 1000,
          width: '350px'
        }}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              style={{
                backgroundColor: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Bell size={16} style={{ color: '#856404' }} />
                    <strong style={{ color: '#856404' }}>Reminder Alert!</strong>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#856404' }}>
                    {notification.reminder.title}
                  </h4>
                  {notification.reminder.description && (
                    <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                      {notification.reminder.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#856404',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px' 
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Reminders</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={testNotification}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Volume2 size={16} />
            Test Sound
          </button>
          <button
            onClick={() => {
              setEditingReminder(null);
              setShowForm(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Add Reminder
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginTop: 0 }}>
            {editingReminder ? 'Edit Reminder' : 'New Reminder'}
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Reminder title"
              value={newReminder.title}
              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <textarea
              placeholder="Description (optional)"
              value={newReminder.description}
              onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                Date
              </div>
              <input
                type="date"
                value={newReminder.date}
                onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                Time
              </div>
              <input
                type="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
              Priority
            </div>
            <select
              value={newReminder.priority}
              onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Notification Sound Settings */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'block', marginBottom: '10px', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
              Notification Sound
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="notificationSound"
                    value="beep"
                    checked={notificationSound === 'beep'}
                    onChange={(e) => setNotificationSound(e.target.value)}
                  />
                  <span>Default Beep</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="notificationSound"
                    value="custom"
                    checked={notificationSound === 'custom'}
                    onChange={(e) => setNotificationSound(e.target.value)}
                  />
                  <span>Custom Sound</span>
                </label>
              </div>
              
              {notificationSound === 'custom' && (
                <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleSoundFileChange}
                    style={{
                      fontSize: '12px',
                      padding: '4px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#f9f9f9'
                    }}
                  />
                  {customSoundFile && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Selected: {customSoundFile.name}
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="notificationSound"
                    value="none"
                    checked={notificationSound === 'none'}
                    onChange={(e) => setNotificationSound(e.target.value)}
                  />
                  <span>No Sound</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {editingReminder ? 'Update Reminder' : 'Save Reminder'}
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {reminders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #eee'
          }}>
            <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '16px' }}>No reminders yet</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              Click "Add Reminder" to create your first reminder
            </p>
          </div>
        ) : (
          reminders.map(reminder => (
            <div
              key={reminder.id}
              style={{
                backgroundColor: 'white',
                border: `2px solid ${
                  reminder.priority === 'high' ? '#dc3545' :
                  reminder.priority === 'medium' ? '#ffc107' : '#28a745'
                }`,
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                opacity: reminder.completed ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={reminder.completed === true}
                      onChange={() => onToggleComplete(reminder.id)}
                      style={{ 
                        transform: 'scale(1.2)',
                        accentColor: reminder.completed ? '#28a745' : '#007bff'
                      }}
                    />
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      textDecoration: reminder.completed ? 'line-through' : 'none',
                      color: reminder.completed ? '#666' : '#333',
                      flex: 1
                    }}>
                      {reminder.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        backgroundColor: reminder.priority === 'high' ? '#dc3545' :
                                       reminder.priority === 'medium' ? '#ffc107' : '#28a745',
                        color: reminder.priority === 'medium' ? '#000' : 'white',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {reminder.priority}
                      </span>
                      {reminder.completed && (
                        <span style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          COMPLETED
                        </span>
                      )}
                      {reminder.notified && (
                        <Bell size={14} style={{ color: '#28a745' }} title="Notification sent" />
                      )}
                    </div>
                  </div>

                  {reminder.description && (
                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {reminder.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666' }}>
                    {reminder.date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        <span>{new Date(reminder.date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {reminder.time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        <span>{reminder.time}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(reminder)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#007bff',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Edit reminder"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete reminder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ReminderPage;