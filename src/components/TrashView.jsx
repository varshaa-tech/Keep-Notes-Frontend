import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import NoteCard from './NoteCard';
import { Clock, Calendar, Bell, RotateCcw, Trash2 } from 'lucide-react';
import './TrashView.css';

const TrashView = ({ onRefresh }) => {
  const [trashedItems, setTrashedItems] = useState({
    notes: [],
    reminders: [],
    documents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    loadTrashedItems();
    loadTrashStats();
  }, []);

  const loadTrashedItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const [notes, reminders, documents] = await Promise.all([
        ApiService.getTrashedNotes().catch(err => {
          console.warn('Failed to load trashed notes:', err);
          return [];
        }),
        ApiService.getTrashedReminders().catch(err => {
          console.warn('Failed to load trashed reminders:', err);
          return [];
        }),
        Promise.resolve([])  // Placeholder for documents
      ]);

      console.log('Loaded trashed items:', { notes: notes?.length, reminders: reminders?.length });

      setTrashedItems({
        notes: notes || [],
        reminders: reminders || [],
        documents: documents || []
      });
    } catch (err) {
      console.error('Error loading trashed items:', err);
      setError('Failed to load trash. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrashStats = async () => {
    try {
      const stats = await ApiService.getTrashStats();
      console.log('Loaded trash stats:', stats);
      setStats(stats);
    } catch (err) {
      console.error('Error loading trash stats:', err);
    }
  };

  const handleRestoreItem = async (type, id) => {
    if (isOperating) return;
    
    try {
      setIsOperating(true);
      console.log(`Attempting to restore ${type} with ID:`, id);
      
      let restoredItem;
      
      switch (type) {
        case 'note':
          restoredItem = await ApiService.restoreNoteFromTrash(id);
          break;
        case 'reminder':
          restoredItem = await ApiService.restoreReminderFromTrash(id);
          break;
        case 'document':
          // restoredItem = await ApiService.restoreDocumentFromTrash(id);
          throw new Error('Document restore not yet implemented');
        default:
          throw new Error('Invalid item type');
      }

      console.log(`${type} restored successfully:`, restoredItem);

      // Remove from trashed items
      setTrashedItems(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(item => item.id !== id)
      }));

      // Update stats
      if (stats) {
        setStats(prev => ({
          ...prev,
          [type + 's']: Math.max(0, (prev[type + 's'] || 0) - 1),
          total: Math.max(0, prev.total - 1)
        }));
      }

      if (onRefresh) onRefresh();
      
      // Show success message
      const message = `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!`;
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }
      
    } catch (err) {
      console.error(`Error restoring ${type}:`, err);
      const errorMessage = err.message.includes('already in progress') 
        ? `${type} restore already in progress` 
        : `Failed to restore ${type}. ${err.message}`;
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handlePermanentDelete = async (type, id, title = 'item') => {
    if (isOperating) return;
    
    if (!window.confirm(`Permanently delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsOperating(true);
      console.log(`Attempting to permanently delete ${type} with ID:`, id);
      
      switch (type) {
        case 'note':
          await ApiService.deleteNote(id, true);
          break;
        case 'reminder':
          await ApiService.permanentlyDeleteReminder(id);
          break;
        case 'document':
          // await ApiService.deleteDocument(id, true);
          throw new Error('Document deletion not yet implemented');
        default:
          throw new Error('Invalid item type');
      }

      console.log(`${type} permanently deleted successfully`);

      // Remove from trashed items
      setTrashedItems(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(item => item.id !== id)
      }));

      // Update stats
      if (stats) {
        setStats(prev => ({
          ...prev,
          [type + 's']: Math.max(0, (prev[type + 's'] || 0) - 1),
          total: Math.max(0, prev.total - 1)
        }));
      }

      const message = `${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted!`;
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }
      
    } catch (err) {
      console.error(`Error permanently deleting ${type}:`, err);
      const errorMessage = `Failed to delete ${type}. ${err.message}`;
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleEmptyTrash = async () => {
    const totalItems = trashedItems.notes.length + 
                      trashedItems.reminders.length + 
                      trashedItems.documents.length;

    if (totalItems === 0) {
      alert('Trash is already empty!');
      return;
    }

    if (!window.confirm(`Permanently delete all ${totalItems} items in trash? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsOperating(true);
      const result = await ApiService.emptyTrash();
      console.log('Trash emptied successfully:', result);
      
      setTrashedItems({
        notes: [],
        reminders: [],
        documents: []
      });
      setStats({ total: 0, notes: 0, reminders: 0, documents: 0 });
      setSelectedItems([]);
      
      const message = result.message || 'Trash emptied successfully!';
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }
      
    } catch (err) {
      console.error('Error emptying trash:', err);
      const errorMessage = `Failed to empty trash. ${err.message}`;
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to restore.');
      return;
    }

    if (!window.confirm(`Restore ${selectedItems.length} selected items?`)) {
      return;
    }

    try {
      setIsOperating(true);
      const result = await ApiService.bulkRestoreFromTrash(selectedItems);
      console.log('Bulk restore completed:', result);
      
      await loadTrashedItems();
      await loadTrashStats();
      setSelectedItems([]);
      
      if (onRefresh) onRefresh();
      
      const message = result.message || `${selectedItems.length} items restored successfully!`;
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }
      
    } catch (err) {
      console.error('Error bulk restoring:', err);
      const errorMessage = `Failed to restore some items. ${err.message}`;
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete.');
      return;
    }

    if (!window.confirm(`Permanently delete ${selectedItems.length} selected items? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsOperating(true);
      const result = await ApiService.bulkPermanentDelete(selectedItems);
      console.log('Bulk delete completed:', result);
      
      await loadTrashedItems();
      await loadTrashStats();
      setSelectedItems([]);
      
      const message = result.message || `${selectedItems.length} items permanently deleted!`;
      if (window.showToast) {
        window.showToast(message, 'success');
      } else {
        alert(message);
      }
      
    } catch (err) {
      console.error('Error bulk deleting:', err);
      const errorMessage = `Failed to delete some items. ${err.message}`;
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsOperating(false);
    }
  };

  const handleSelectItem = (type, id) => {
    const itemKey = `${type}_${id}`;
    setSelectedItems(prev => {
      const isSelected = prev.some(item => `${item.type}_${item.id}` === itemKey);
      if (isSelected) {
        return prev.filter(item => `${item.type}_${item.id}` !== itemKey);
      } else {
        return [...prev, { type, id }];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredItems = getFilteredItems();
    const allItems = [
      ...filteredItems.notes.map(note => ({ type: 'note', id: note.id })),
      ...filteredItems.reminders.map(reminder => ({ type: 'reminder', id: reminder.id })),
      ...filteredItems.documents.map(doc => ({ type: 'document', id: doc.id }))
    ];

    if (selectedItems.length === allItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allItems);
    }
  };

  const getFilteredItems = () => {
    const search = searchTerm.toLowerCase();
    
    const filterBySearch = (items) => {
      if (!search) return items;
      return items.filter(item => 
        item.title?.toLowerCase().includes(search) ||
        item.content?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    };

    const filtered = {
      notes: filterBySearch(trashedItems.notes),
      reminders: filterBySearch(trashedItems.reminders),
      documents: filterBySearch(trashedItems.documents)
    };

    switch (activeTab) {
      case 'notes':
        return { notes: filtered.notes, reminders: [], documents: [] };
      case 'reminders':
        return { notes: [], reminders: filtered.reminders, documents: [] };
      case 'documents':
        return { notes: [], reminders: [], documents: filtered.documents };
      default:
        return filtered;
    }
  };

  const filteredItems = getFilteredItems();
  const totalFilteredItems = filteredItems.notes.length + 
                             filteredItems.reminders.length + 
                             filteredItems.documents.length;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatReminderTime = (dateString, timeString) => {
    if (!dateString) return 'No date set';
    
    const date = new Date(dateString);
    let formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (timeString) {
      formattedDate += ` at ${timeString}`;
    }
    
    return formattedDate;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="trash-view loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading trash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trash-view">
      <div className="trash-header">
        <div className="trash-title">
          <h2>🗑️ Trash</h2>
          <p>Items in trash will be automatically deleted after 30 days</p>
        </div>
        
        {stats && (
          <div className="trash-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.notes || 0}</span>
              <span className="stat-label">Notes</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.reminders || 0}</span>
              <span className="stat-label">Reminders</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.documents || 0}</span>
              <span className="stat-label">Documents</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={loadTrashedItems} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="trash-controls">
        <div className="search-and-tabs">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search trash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="tab-buttons">
            <button 
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
            >
              All ({trashedItems.notes.length + trashedItems.reminders.length + trashedItems.documents.length})
            </button>
            <button 
              className={activeTab === 'notes' ? 'active' : ''}
              onClick={() => setActiveTab('notes')}
            >
              Notes ({trashedItems.notes.length})
            </button>
            <button 
              className={activeTab === 'reminders' ? 'active' : ''}
              onClick={() => setActiveTab('reminders')}
            >
              Reminders ({trashedItems.reminders.length})
            </button>
            <button 
              className={activeTab === 'documents' ? 'active' : ''}
              onClick={() => setActiveTab('documents')}
            >
              Documents ({trashedItems.documents.length})
            </button>
          </div>
        </div>

        {totalFilteredItems > 0 && (
          <div className="bulk-actions">
            <button 
              onClick={handleSelectAll}
              className="select-all-btn"
              disabled={isOperating}
            >
              {selectedItems.length === totalFilteredItems ? 'Deselect All' : 'Select All'}
            </button>
            {selectedItems.length > 0 && (
              <>
                <button 
                  onClick={handleBulkRestore}
                  className="bulk-restore-btn"
                  disabled={isOperating}
                >
                  {isOperating ? 'Restoring...' : `Restore (${selectedItems.length})`}
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="bulk-delete-btn"
                  disabled={isOperating}
                >
                  {isOperating ? 'Deleting...' : `Delete Forever (${selectedItems.length})`}
                </button>
              </>
            )}
            <button 
              onClick={handleEmptyTrash}
              className="empty-trash-btn"
              disabled={stats?.total === 0 || isOperating}
            >
              {isOperating ? 'Emptying...' : 'Empty Trash'}
            </button>
          </div>
        )}
      </div>

      {totalFilteredItems === 0 ? (
        <div className="empty-trash">
          <div className="empty-icon">🗑️</div>
          <h3>
            {searchTerm 
              ? `No trash items match "${searchTerm}"` 
              : activeTab === 'all' 
                ? 'Trash is empty'
                : `No ${activeTab} in trash`
            }
          </h3>
          <p>
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Items you delete will appear here temporarily before being permanently removed.'
            }
          </p>
        </div>
      ) : (
        <div className="trash-content">
          {/* Trashed Notes */}
          {filteredItems.notes.length > 0 && (
            <section className="trash-section">
              <h3>📝 Notes in Trash</h3>
              <div className="items-grid">
                {filteredItems.notes.map(note => (
                  <div 
                    key={note.id} 
                    className={`trash-item-wrapper ${selectedItems.some(item => item.type === 'note' && item.id === note.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'note' && item.id === note.id)}
                        onChange={() => handleSelectItem('note', note.id)}
                        disabled={isOperating}
                      />
                    </div>
                    <div className="trash-item">
                      <NoteCard
                        note={note}
                        isTrashView={true}
                        onRestore={() => handleRestoreItem('note', note.id)}
                        onPermanentDelete={() => handlePermanentDelete('note', note.id, note.title)}
                        disabled={isOperating}
                      />
                      <div className="trash-meta">
                        <span className="delete-date">
                          Deleted: {formatDate(note.deletedAt || note.trashedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trashed Reminders */}
          {filteredItems.reminders.length > 0 && (
            <section className="trash-section">
              <h3>⏰ Reminders in Trash</h3>
              <div className="items-grid">
                {filteredItems.reminders.map(reminder => (
                  <div 
                    key={reminder.id} 
                    className={`trash-item-wrapper ${selectedItems.some(item => item.type === 'reminder' && item.id === reminder.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'reminder' && item.id === reminder.id)}
                        onChange={() => handleSelectItem('reminder', reminder.id)}
                        disabled={isOperating}
                      />
                    </div>
                    <div className="trash-item reminder-item">
                      <div className="reminder-content">
                        <div className="reminder-header">
                          <h4 style={{ margin: '0 8px 0 0' }}>{reminder.title}</h4>
                          <div className="reminder-badges">
                            <span 
                              className="priority-badge"
                              style={{
                                backgroundColor: getPriorityColor(reminder.priority),
                                color: reminder.priority === 'medium' ? '#000' : 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase'
                              }}
                            >
                              {reminder.priority || 'medium'}
                            </span>
                            {reminder.completed && (
                              <span 
                                className="completed-badge"
                                style={{
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  marginLeft: '4px'
                                }}
                              >
                                COMPLETED
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {reminder.description && (
                          <p style={{ 
                            margin: '8px 0', 
                            color: '#666', 
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}>
                            {reminder.description}
                          </p>
                        )}
                        
                        <div className="reminder-details">
                          {(reminder.date || reminder.time) && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              fontSize: '13px',
                              color: '#666',
                              marginBottom: '4px'
                            }}>
                              <Clock size={12} />
                              <span>{formatReminderTime(reminder.date, reminder.time)}</span>
                            </div>
                          )}
                          
                          {reminder.notified && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              fontSize: '13px',
                              color: '#28a745'
                            }}>
                              <Bell size={12} />
                              <span>Notification sent</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="trash-actions">
                        <button 
                          onClick={() => handleRestoreItem('reminder', reminder.id)}
                          className="restore-btn"
                          title="Restore reminder"
                          disabled={isOperating}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '8px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <RotateCcw size={12} />
                          {isOperating ? 'Restoring...' : 'Restore'}
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete('reminder', reminder.id, reminder.title)}
                          className="permanent-delete-btn"
                          title="Delete permanently"
                          disabled={isOperating}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '8px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <Trash2 size={12} />
                          {isOperating ? 'Deleting...' : 'Delete Forever'}
                        </button>
                      </div>
                      
                      <div className="trash-meta">
                        <span className="delete-date" style={{ fontSize: '12px', color: '#888' }}>
                          Deleted: {formatDate(reminder.deletedAt || reminder.trashedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trashed Documents */}
          {filteredItems.documents.length > 0 && (
            <section className="trash-section">
              <h3>📄 Documents in Trash</h3>
              <div className="items-grid">
                {filteredItems.documents.map(document => (
                  <div 
                    key={document.id} 
                    className={`trash-item-wrapper ${selectedItems.some(item => item.type === 'document' && item.id === document.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'document' && item.id === document.id)}
                        onChange={() => handleSelectItem('document', document.id)}
                        disabled={isOperating}
                      />
                    </div>
                    <div className="trash-item document-item">
                      <div className="document-content">
                        <h4>{document.title}</h4>
                        {document.description && <p>{document.description}</p>}
                        <div className="document-info">
                          <span className="file-type">{document.fileType || 'Unknown'}</span>
                          {document.fileSize && (
                            <span className="file-size">
                              {(document.fileSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="trash-actions">
                        <button 
                          onClick={() => handleRestoreItem('document', document.id)}
                          className="restore-btn"
                          title="Restore document"
                          disabled={isOperating}
                        >
                          {isOperating ? 'Restoring...' : 'Restore'}
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete('document', document.id, document.title)}
                          className="permanent-delete-btn"
                          title="Delete permanently"
                          disabled={isOperating}
                        >
                          {isOperating ? 'Deleting...' : 'Delete Forever'}
                        </button>
                      </div>
                      <div className="trash-meta">
                        <span className="delete-date">
                          Deleted: {formatDate(document.deletedAt || document.trashedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default TrashView;