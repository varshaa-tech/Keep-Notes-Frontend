import React, { useState, useRef, useEffect } from 'react';
import { Pin, Archive, MoreVertical, Palette, Trash2, CheckSquare, Bell, Calendar, Clock, FileText, RotateCcw, Trash } from 'lucide-react';
import ApiService from '../services/api';

function NoteCard({ note, onUpdate, onDelete, onTogglePin, onToggleArchive, onChangeColor, onRestore, isTrashView = false }) {
  const [showMore, setShowMore] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [editTodos, setEditTodos] = useState(note.todos || []);
  const [editIsChecklist, setEditIsChecklist] = useState(note.isChecklist);
  const [editReminderDate, setEditReminderDate] = useState(note.reminderDate || '');
  const [editReminderTime, setEditReminderTime] = useState(note.reminderTime || '');
  
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [todoInputText, setTodoInputText] = useState('');
  const todoInputRef = useRef(null);

  const colors = [
    '#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90',
    '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8'
  ];

  // Generate unique ID for todos
  const generateTodoId = () => {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`;
  };

  // Auto-calculation function for simplification
  const evaluateExpression = (expression) => {
    try {
      // Remove any whitespace and the equals sign if present
      const cleanExpr = expression.replace(/\s+/g, '').replace(/=$/, '');
      
      // Safety check - only allow numbers, basic operators, and parentheses
      if (!/^[0-9+\-*/().\s]+$/.test(cleanExpr)) {
        return expression; // Return original if contains unsafe characters
      }
      
      // Use Function constructor for safe evaluation
      const result = new Function(`return ${cleanExpr}`)();
      
      // Check if result is a valid number
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        // Format to avoid long decimal places
        return Number.isInteger(result) ? result.toString() : result.toFixed(2);
      }
      
      return expression;
    } catch (error) {
      console.log('Calculation error:', error);
      return expression; // Return original if evaluation fails
    }
  };

  // Handle content change with auto-calculation
  const handleContentChange = (content) => {
    setEditContent(content);
    
    // Check if content ends with "=" for auto-calculation
    if (content.trim().endsWith('=')) {
      const calculated = evaluateExpression(content);
      if (calculated !== content) {
        // Small delay to show the calculation happening
        setTimeout(() => {
          setEditContent(calculated);
        }, 100);
      }
    }
  };

  // Handle todo text change with auto-calculation
  const handleTodoTextChange = (todoId, newText) => {
    const updatedTodos = editTodos.map(todo => {
      if (String(todo.id) === String(todoId)) {
        let finalText = newText;
        
        // Check if text ends with "=" for auto-calculation
        if (newText.trim().endsWith('=')) {
          const calculated = evaluateExpression(newText);
          if (calculated !== newText) {
            finalText = calculated;
          }
        }
        
        return { ...todo, text: finalText };
      }
      return todo;
    });
    
    setEditTodos(updatedTodos);
  };

  // UPDATED: Handle delete with correct method calls
 // Fixed handleDelete method in NoteCard.js

const handleDelete = async () => {
  if (isDeleting) return;
  
  try {
    setIsDeleting(true);
    setShowMore(false);
    
    console.log('Frontend - Delete operation:', {
      noteId: note.id,
      isTrashView: isTrashView,
      noteTitle: note.title
    });
    
    if (!note.id) {
      throw new Error('No valid note ID found');
    }
    
    if (isTrashView) {
      // Permanently delete from trash
      console.log('Frontend - Permanently deleting note:', note.id);
      await ApiService.deleteNote(note.id);
      console.log('Frontend - Permanent deletion successful');
    } else {
      // Move to trash - use the regular delete endpoint without permanent flag
      console.log('Frontend - Moving note to trash:', note.id);
      await ApiService.deleteNote(note.id, false); // false = not permanent
      console.log('Frontend - Move to trash successful');
    }
    
    onDelete(note.id);
  } catch (error) {
    console.error('Frontend - Error in delete operation:', error);
    alert(`Failed to ${isTrashView ? 'permanently delete' : 'move to trash'} note: ${error.message}`);
  } finally {
    setIsDeleting(false);
  }
};

  // UPDATED: Handle restore from trash
  const handleRestore = async () => {
    if (isRestoring) return;
    
    try {
      setIsRestoring(true);
      setShowMore(false);
      
      if (!note.id) throw new Error('No valid note ID found in note object');
      
      console.log('Frontend - Restoring note from trash:', note.id);
      const restoredNote = await ApiService.restoreNoteFromTrash(note.id);
      onRestore(note.id, restoredNote);
    } catch (error) {
      console.error('Frontend - Error restoring note:', error);
      alert('Failed to restore note: ' + error.message);
      setIsRestoring(false);
    }
  };

  // UPDATED: Handle archive
  const handleArchive = async () => {
    if (isArchiving) return;
    
    try {
      setIsArchiving(true);
      console.log('Frontend - Archiving note:', note.id);
      await ApiService.archiveNote(note.id);
      
      // Remove the note from current view after successful archive
      onDelete(note.id);
    } catch (error) {
      console.error('Frontend - Error archiving note:', error);
      alert('Failed to archive note: ' + error.message);
      setIsArchiving(false);
    }
  };

  const handleTodoToggle = async (todoId) => {
    console.log('Toggling todo:', todoId, 'in note:', note.id);
    
    const updatedTodos = note.todos.map(todo => {
      const isMatch = String(todo.id) === String(todoId);
      return isMatch ? { ...todo, checked: !todo.checked } : todo;
    });
    
    try {
      const updateData = {
        todos: updatedTodos,
        updatedAt: new Date().toISOString()
      };
      
      const updatedNote = await ApiService.updateNote(note.id, updateData);
      onUpdate(note.id, updatedNote);
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleSave = async () => {
    try {
      const filteredTodos = editTodos.filter(todo => todo.text.trim());
      
      const updateData = {
        title: editTitle,
        content: editIsChecklist ? '' : editContent,
        isChecklist: editIsChecklist,
        todos: editIsChecklist ? filteredTodos : [],
        reminderDate: editReminderDate,
        reminderTime: editReminderTime,
      };

      console.log('Frontend - Updating note with ID:', note.id);
      console.log('Frontend - Update data:', updateData);

      const updatedNote = await ApiService.updateNote(note.id, updateData);
      onUpdate(note.id, updatedNote);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note: ' + error.message);
    }
  };

  const handleStartEdit = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTodos(note.todos || []);
    setEditIsChecklist(note.isChecklist);
    setEditReminderDate(note.reminderDate || '');
    setEditReminderTime(note.reminderTime || '');
    setIsEditing(true);
    setShowMore(false);
  };

  const handleColorChange = async (color) => {
    try {
      const updatedNote = await ApiService.updateNote(note.id, { color });
      onChangeColor(note.id, updatedNote);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error changing color:', error);
      alert('Failed to change color: ' + error.message);
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    let result = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (timeStr) result += ` at ${timeStr}`;
    return result;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  };

  const isReminderSet = note.reminderDate && note.reminderDate.trim() !== '';

  // Different styles for trashed notes
  const cardStyle = {
    backgroundColor: note.color || '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px',
    minWidth: '240px',
    maxWidth: '300px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif',
    position: 'relative',
    ...(isTrashView && {
      opacity: 0.8,
      border: '2px dashed #dc3545',
      backgroundColor: note.color ? `${note.color}80` : '#f8f9fa'
    })
  };

  // Editing mode UI
  if (isEditing) {
    return (
      <div style={{display:'flex'}}>
        <div className="note-card-editing" style={cardStyle}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            style={{
              width: '100%',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              padding: '4px',
              background: 'transparent',
              borderBottom: '1px solid #eee'
            }}
          />

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={editIsChecklist}
                onChange={(e) => setEditIsChecklist(e.target.checked)}
              />
              Checklist Mode
            </label>
          </div>

          {editIsChecklist ? (
            <div style={{ marginBottom: '16px' }}>
              {editTodos.map((todo) => (
                <div key={String(todo.id)} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={todo.checked || false}
                    onChange={() => {
                      const updatedTodos = editTodos.map(t => 
                        String(t.id) === String(todo.id) ? { ...t, checked: !t.checked } : t
                      );
                      setEditTodos(updatedTodos);
                    }}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <input
                    type="text"
                    value={todo.text}
                    onChange={(e) => handleTodoTextChange(todo.id, e.target.value)}
                    placeholder="Todo item..."
                    style={{
                      flex: 1,
                      border: 'none',
                      borderBottom: '1px solid #eee',
                      padding: '4px',
                      fontSize: '14px',
                      background: 'transparent'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        // Add new todo on Enter
                        setEditTodos([...editTodos, { id: generateTodoId(), text: '', checked: false }]);
                      }
                    }}
                  />
                  <button
                    onClick={() => setEditTodos(editTodos.filter(t => String(t.id) !== String(todo.id)))}
                    style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditTodos([...editTodos, { id: generateTodoId(), text: '', checked: false }])}
                style={{
                  background: 'none',
                  border: '1px dashed #ccc',
                  padding: '8px',
                  width: '100%',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '14px'
                }}
              >
                + Add Item
              </button>
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Take a note..."
              style={{
                width: '100%',
                border: 'none',
                fontSize: '14px',
                lineHeight: '1.5',
                marginBottom: '16px',
                padding: '4px',
                background: 'transparent',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'Arial, sans-serif'
              }}
            />
          )}

          {/* Reminder picker in edit mode */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={editReminderDate}
              onChange={(e) => setEditReminderDate(e.target.value)}
              style={{ fontSize: '12px', padding: '4px' }}
            />
            <input
              type="time"
              value={editReminderTime}
              onChange={(e) => setEditReminderTime(e.target.value)}
              style={{ fontSize: '12px', padding: '4px' }}
            />
            {(editReminderDate || editReminderTime) && (
              <button
                onClick={() => {
                  setEditReminderDate('');
                  setEditReminderTime('');
                }}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                background: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: '#1976d2',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex'}}>
      <div className="note-card" style={cardStyle}>

        {/* Show trash indicator */}
        {isTrashView && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#dc3545',
            color: 'white',
            borderRadius: '12px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            TRASH
          </div>
        )}

        <div className="note-card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            opacity: isTrashView ? 0.7 : 1
          }}>
            {note.isChecklist && <CheckSquare size={16} style={{ marginRight: '6px' }} />}
            {!note.isChecklist && <FileText size={16} style={{ marginRight: '6px' }} />}
            {note.title}
          </h3>

          {/* Don't show pin button in trash view */}
          {!isTrashView && (
            <button
              onClick={() => onTogglePin(note.id)}
              title={note.pinned ? 'Unpin note' : 'Pin note'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: note.pinned ? '#1976d2' : '#666',
                padding: '4px'
              }}
            >
              <Pin size={16} />
            </button>
          )}
        </div>

        <div className="note-card-content" style={{ marginBottom: '16px', opacity: isTrashView ? 0.7 : 1 }}>
          {note.isChecklist ? (
            (note.todos || []).map(todo => (
              <div key={String(todo.id)} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={todo.checked || false}
                  onChange={() => !isTrashView && handleTodoToggle(todo.id)}
                  disabled={isTrashView}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  textDecoration: todo.checked ? 'line-through' : 'none',
                  color: todo.checked ? '#666' : '#000'
                }}>
                  {todo.text || ''}
                </span>
              </div>
            ))
          ) : (
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
              {note.content}
            </p>
          )}
        </div>

        {/* Show when note was trashed */}
        {isTrashView && note.trashedAt && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8d7da',
            color: '#721c24',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '12px',
            border: '1px solid #f5c6cb'
          }}>
            <Trash2 size={12} />
            <span>Deleted {formatDate(note.trashedAt)}</span>
          </div>
        )}

        {/* Show reminder if set (only for non-trashed notes) */}
        {!isTrashView && !isEditing && isReminderSet && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fff3cd',
            color: '#856404',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '12px',
            border: '1px solid #ffeaa7'
          }}>
            <Bell size={12} />
            <span>{formatDateTime(note.reminderDate, note.reminderTime)}</span>
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          {formatDate(note.updatedAt)}
        </div>

        {/* Different buttons for trash view */}
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          {isTrashView ? (
            <>
              <button 
                onClick={handleRestore}
                title="Restore note"
                disabled={isRestoring}
                style={{
                  ...buttonStyle,
                  color: isRestoring ? '#999' : '#28a745',
                  cursor: isRestoring ? 'not-allowed' : 'pointer'
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={handleDelete}
                title="Delete permanently"
                disabled={isDeleting}
                style={{
                  ...buttonStyle,
                  color: isDeleting ? '#999' : '#dc3545',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash size={16} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditReminderDate(note.reminderDate || '');
                  setEditReminderTime(note.reminderTime || '');
                  setShowReminderPicker(!showReminderPicker);
                }} 
                title={isReminderSet ? 'Edit reminder' : 'Add reminder'} 
                style={{
                  ...buttonStyle,
                  color: isReminderSet ? '#1976d2' : '#666'
                }}
              >
                <Bell size={16} />
              </button>
              <button 
                onClick={handleArchive}
                title="Archive"
                disabled={isArchiving}
                style={{
                  ...buttonStyle,
                  color: isArchiving ? '#999' : '#666',
                  cursor: isArchiving ? 'not-allowed' : 'pointer'
                }}
              >
                <Archive size={16} />
              </button>
              <button onClick={() => setShowColorPicker(!showColorPicker)} title="Change color" style={buttonStyle}>
                <Palette size={16} />
              </button>
              <button 
                onClick={handleDelete} 
                title="Move to trash" 
                disabled={isDeleting}
                style={{ 
                  ...buttonStyle, 
                  color: isDeleting ? '#999' : '#c00',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
              <button onClick={() => setShowMore(!showMore)} title="More options" style={buttonStyle}>
                <MoreVertical size={16} />
              </button>
            </>
          )}
        </div>

        {/* Existing popups remain the same for non-trash view only */}
        {!isTrashView && showColorPicker && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            width: '120px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            {colors.map(color => (
              <button key={color} onClick={() => handleColorChange(color)} style={{
                backgroundColor: color,
                width: '24px',
                height: '24px',
                border: '1px solid #ddd',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0
              }} />
            ))}
          </div>
        )}

        {/* Show more menu for non-trash view */}
        {!isTrashView && showMore && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            <button onClick={handleStartEdit} style={{
              display: 'block',
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Edit
            </button>
            <button 
              onClick={handleDelete} 
              disabled={isDeleting}
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '8px 12px',
                textAlign: 'left',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                color: isDeleting ? '#999' : '#dc3545'
              }}
            >
              {isDeleting ? 'Moving to trash...' : 'Move to trash'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const buttonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#666',
  padding: '8px',
  borderRadius: '4px'
};

export default NoteCard;