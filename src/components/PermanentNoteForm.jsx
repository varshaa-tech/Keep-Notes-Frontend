import React, { useState, useRef, useEffect } from 'react';
import { Bell, Palette, CheckSquare, X, Plus, FileText } from 'lucide-react';

const PermanentNoteForm = ({ onAddNote = () => {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState([{ id: generateTodoId(), text: '', checked: false }]);
  
  // New state for direct todo input
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [todoInputText, setTodoInputText] = useState('');
  const todoInputRef = useRef(null);
  
  const formRef = useRef(null);

  // Generate unique ID for todos
  function generateTodoId() {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`;
  }

  // Focus on todo input when it appears
  useEffect(() => {
    if (showTodoInput && todoInputRef.current) {
      todoInputRef.current.focus();
    }
  }, [showTodoInput]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (formRef.current && !formRef.current.contains(e.target)) {
        saveNote();
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, title, content, checklistItems]);

  // Enhanced function to convert content to todo items
  const convertContentToTodos = (textContent) => {
    if (!textContent || textContent.trim() === '') {
      return [{ id: generateTodoId(), text: '', checked: false }];
    }
    
    const lines = textContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return [{ id: generateTodoId(), text: '', checked: false }];
    }
    
    const todoItems = lines.map(line => ({
      id: generateTodoId(),
      text: line,
      checked: false
    }));

    // Add one empty todo at the end for easy addition
    todoItems.push({ id: generateTodoId(), text: '', checked: false });
    
    return todoItems;
  };

  // Convert todos back to content
  const convertTodosToContent = (todoList) => {
    return todoList
      .map(todo => todo.text)
      .filter(text => text.trim().length > 0)
      .join('\n');
  };

  // Handle toggle between note and checklist
  const handleToggleMode = () => {
    if (isChecklist) {
      // Converting from checklist to note
      const convertedContent = convertTodosToContent(checklistItems);
      setContent(convertedContent);
      setChecklistItems([{ id: generateTodoId(), text: '', checked: false }]);
      setIsChecklist(false);
      setShowTodoInput(false);
      
      console.log('Converted from checklist to note:', convertedContent);
    } else {
      // Converting from note to checklist
      const convertedTodos = convertContentToTodos(content);
      setChecklistItems(convertedTodos);
      setContent('');
      setIsChecklist(true);
      
      console.log('Converted from note to checklist:', convertedTodos);
    }
  };

  // Handle clicking the todo button to start adding todos
  const handleTodoButtonClick = () => {
    if (!isChecklist) {
      setIsChecklist(true);
      setContent('');
    }
    setShowTodoInput(true);
  };

  // Handle adding a new todo from the input
  const handleAddTodoFromInput = () => {
    if (todoInputText.trim()) {
      const newTodo = {
        id: generateTodoId(),
        text: todoInputText.trim(),
        checked: false
      };
      setChecklistItems(prev => [...prev.filter(item => item.text.trim()), newTodo, { id: generateTodoId(), text: '', checked: false }]);
      setTodoInputText('');
    }
  };

  // Handle key presses in todo input
  const handleTodoInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodoFromInput();
    } else if (e.key === 'Escape') {
      setShowTodoInput(false);
      setTodoInputText('');
    }
  };

  // Close todo input
  const closeTodoInput = () => {
    setShowTodoInput(false);
    setTodoInputText('');
  };

  const saveNote = () => {
    const hasChecklistContent = checklistItems.some(item => item.text.trim());

    if (!title && !content && !hasChecklistContent) {
      setIsExpanded(false);
      return;
    }

    const filteredChecklistItems = checklistItems.filter(item => item.text.trim());
    
    const checklistText = filteredChecklistItems
      .map(item => `${item.checked ? '✅' : '⬜'} ${item.text.trim()}`)
      .join('\n');

    onAddNote({
      id: Date.now(),
      title: title.trim(),
      content: isChecklist ? checklistText : content.trim(),
      todos: isChecklist ? filteredChecklistItems : [],
      isChecklist,
      color: '#ffffff',
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setChecklistItems([{ id: generateTodoId(), text: '', checked: false }]);
    setIsExpanded(false);
    setShowTodoInput(false);
    setTodoInputText('');
  };

  const handleChecklistChange = (id, value) => {
    const updated = checklistItems.map(item => 
      item.id === id ? { ...item, text: value } : item
    );
    setChecklistItems(updated);

    // Add new empty item if this was the last item and now has content
    const currentItem = checklistItems.find(item => item.id === id);
    const isLastItem = checklistItems[checklistItems.length - 1].id === id;
    
    if (isLastItem && value.trim() && !currentItem?.text.trim()) {
      setChecklistItems([...updated, { id: generateTodoId(), text: '', checked: false }]);
    }
  };

  const toggleChecklistItem = (id) => {
    const updated = checklistItems.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklistItems(updated);
  };

  const removeChecklistItem = (id) => {
    const updated = checklistItems.filter(item => item.id !== id);
    // Ensure at least one empty item remains
    if (updated.length === 0 || updated.every(item => item.text.trim())) {
      updated.push({ id: generateTodoId(), text: '', checked: false });
    }
    setChecklistItems(updated);
  };

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { id: generateTodoId(), text: '', checked: false }]);
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '20px auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div ref={formRef}>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: isExpanded ? '16px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: !isExpanded ? 'pointer' : 'default',
            minHeight: isExpanded ? 'auto' : '48px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {isExpanded && (
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                marginBottom: '12px',
                padding: '4px 0'
              }}
              autoFocus
            />
          )}

          {isExpanded && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={handleToggleMode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '16px',
                  backgroundColor: isChecklist ? '#e3f2fd' : '#f5f5f5',
                  color: isChecklist ? '#1976d2' : '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isChecklist ? 'bold' : 'normal',
                  transition: 'all 0.2s ease'
                }}
                title={isChecklist ? 'Convert to note' : 'Convert text to checklist'}
              >
                <CheckSquare size={14} />
                {isChecklist ? 'Checklist Mode' : 'Make Checklist'}
                {!isChecklist && content.trim() && (
                  <span style={{
                    marginLeft: '4px',
                    fontSize: '10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '1px 4px',
                    lineHeight: '1'
                  }}>
                    {content.split('\n').filter(line => line.trim()).length}
                  </span>
                )}
              </button>

              {!isChecklist && (
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '16px',
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    cursor: 'default',
                    fontSize: '12px'
                  }}
                  disabled
                >
                  <FileText size={14} />
                  Note Mode
                </button>
              )}
            </div>
          )}

          {/* Conversion Preview for Note Mode */}
          {isExpanded && !isChecklist && content.trim() && (
            <div style={{
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #c3e6c3',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#2e7d32'
            }}>
              <strong>💡 Tip:</strong> Click "Make Checklist" to convert each line into a todo item.
              <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
                Found {content.split('\n').filter(line => line.trim()).length} line(s) ready to convert
              </div>
            </div>
          )}

          {/* Direct Todo Input Field */}
          {isExpanded && showTodoInput && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#495057',
                  marginBottom: '6px'
                }}>
                  Enter todo item:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    ref={todoInputRef}
                    type="text"
                    value={todoInputText}
                    onChange={(e) => setTodoInputText(e.target.value)}
                    onKeyDown={handleTodoInputKeyDown}
                    placeholder="Type your todo item here..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTodoFromInput}
                    disabled={!todoInputText.trim()}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: todoInputText.trim() ? '#28a745' : '#6c757d',
                      color: '#ffffff',
                      cursor: todoInputText.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6c757d' }}>
                <span>Press Enter to add • Press Esc to close</span>
                <button
                  type="button"
                  onClick={closeTodoInput}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: 'underline'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }}>
            {!isChecklist ? (
              <textarea
                placeholder={isExpanded ? "Take a note... (Each line will become a todo item when converted)" : "Take a note..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={isExpanded ? 4 : 1}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  fontFamily: 'inherit',
                  lineHeight: '1.4'
                }}
              />
            ) : (
              <div>
                {checklistItems.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      style={{ transform: 'scale(1.1)' }}
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                      placeholder="List item"
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        textDecoration: item.checked ? 'line-through' : 'none',
                        color: item.checked ? '#666' : '#000',
                        padding: '2px 4px'
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.border = '1px solid #ddd';
                        e.target.style.borderRadius = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.border = 'none';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addChecklistItem();
                        } else if (e.key === 'Backspace' && item.text === '' && checklistItems.length > 1) {
                          e.preventDefault();
                          removeChecklistItem(item.id);
                        }
                      }}
                    />
                    {checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#999',
                          padding: '4px',
                          fontSize: '16px'
                        }}
                        title="Remove item"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={addChecklistItem}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 0'
                  }}
                >
                  <Plus size={14} />
                  Add item
                </button>
              </div>
            )}
          </div>

          {/* Conversion Confirmation */}
          {isExpanded && isChecklist && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#f0f7ff',
              border: '1px solid #b3d9ff',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#0d47a1'
            }}>
              <strong>✅ Converted to checklist!</strong>
              <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                {checklistItems.filter(t => t.text.trim()).length} todo items ready
              </div>
            </div>
          )}

          {isExpanded && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #eee'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Add reminder"
                >
                  <Bell size={16} />
                </button>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Change color"
                >
                  <Palette size={16} />
                </button>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Add image"
                >
                  📷
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '6px',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermanentNoteForm;