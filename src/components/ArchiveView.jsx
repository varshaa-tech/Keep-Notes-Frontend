import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import NoteCard from './NoteCard';
import './ArchiveView.css';

const ArchiveView = ({ onUnarchiveNote, searchTerm = '' }) => {
  const [archivedItems, setArchivedItems] = useState({
    notes: [],
    reminders: [],
    documents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadArchivedItems();
    loadArchiveStats();
  }, []);

  const loadArchivedItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const [notes, reminders, documents] = await Promise.all([
        ApiService.getArchivedNotes().catch(() => []),
        ApiService.getArchivedReminders().catch(() => []),
        ApiService.getArchivedDocuments().catch(() => [])
      ]);

      setArchivedItems({
        notes: notes || [],
        reminders: reminders || [],
        documents: documents || []
      });
    } catch (err) {
      console.error('Error loading archived items:', err);
      setError('Failed to load archived items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadArchiveStats = async () => {
    try {
      const stats = await ApiService.getArchiveStats();
      setStats(stats);
    } catch (err) {
      console.error('Error loading archive stats:', err);
    }
  };

  const handleUnarchiveItem = async (type, id) => {
    try {
      let restoredItem;
      
      switch (type) {
        case 'note':
          restoredItem = await ApiService.unarchiveNote(id);
          if (onUnarchiveNote) onUnarchiveNote(id);
          break;
        case 'reminder':
          restoredItem = await ApiService.unarchiveReminder(id);
          break;
        case 'document':
          restoredItem = await ApiService.unarchiveDocument(id);
          break;
        default:
          throw new Error('Invalid item type');
      }

      // Remove from archived items
      setArchivedItems(prev => ({
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

      alert(`${type} unarchived successfully!`);
    } catch (err) {
      console.error(`Error unarchiving ${type}:`, err);
      alert(`Failed to unarchive ${type}. Please try again.`);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to unarchive.');
      return;
    }

    if (!window.confirm(`Unarchive ${selectedItems.length} selected items?`)) {
      return;
    }

    try {
      await ApiService.bulkUnarchive(selectedItems);
      await loadArchivedItems();
      await loadArchiveStats();
      setSelectedItems([]);
      alert(`${selectedItems.length} items unarchived successfully!`);
    } catch (err) {
      console.error('Error bulk unarchiving:', err);
      alert('Failed to unarchive some items. Please try again.');
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
    const allItems = [
      ...archivedItems.notes.map(note => ({ type: 'note', id: note.id })),
      ...archivedItems.reminders.map(reminder => ({ type: 'reminder', id: reminder.id })),
      ...archivedItems.documents.map(doc => ({ type: 'document', id: doc.id }))
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
      notes: filterBySearch(archivedItems.notes),
      reminders: filterBySearch(archivedItems.reminders),
      documents: filterBySearch(archivedItems.documents)
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

  if (loading) {
    return (
      <div className="archive-view loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading archived items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-view">
      <div className="archive-header">
        <div className="archive-title">
          <h2>📦 Archive</h2>
          <p>Items you've archived are stored here</p>
        </div>
        
        {stats && (
          <div className="archive-stats">
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
          <button onClick={loadArchivedItems} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="archive-controls">
        <div className="tab-buttons">
          <button 
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All ({archivedItems.notes.length + archivedItems.reminders.length + archivedItems.documents.length})
          </button>
          <button 
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            Notes ({archivedItems.notes.length})
          </button>
          <button 
            className={activeTab === 'reminders' ? 'active' : ''}
            onClick={() => setActiveTab('reminders')}
          >
            Reminders ({archivedItems.reminders.length})
          </button>
          <button 
            className={activeTab === 'documents' ? 'active' : ''}
            onClick={() => setActiveTab('documents')}
          >
            Documents ({archivedItems.documents.length})
          </button>
        </div>

        {totalFilteredItems > 0 && (
          <div className="bulk-actions">
            <button 
              onClick={handleSelectAll}
              className="select-all-btn"
            >
              {selectedItems.length === totalFilteredItems ? 'Deselect All' : 'Select All'}
            </button>
            {selectedItems.length > 0 && (
              <button 
                onClick={handleBulkUnarchive}
                className="bulk-unarchive-btn"
              >
                Unarchive ({selectedItems.length})
              </button>
            )}
          </div>
        )}
      </div>

      {totalFilteredItems === 0 ? (
        <div className="empty-archive">
          <div className="empty-icon">📦</div>
          <h3>
            {searchTerm 
              ? `No archived items match "${searchTerm}"` 
              : activeTab === 'all' 
                ? 'No archived items'
                : `No archived ${activeTab}`
            }
          </h3>
          <p>
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Items you archive will appear here for easy access later.'
            }
          </p>
        </div>
      ) : (
        <div className="archive-content">
          {/* Archived Notes */}
          {filteredItems.notes.length > 0 && (
            <section className="archive-section">
              <h3>📝 Archived Notes</h3>
              <div className="items-grid">
                {filteredItems.notes.map(note => (
                  <div 
                    key={note.id} 
                    className={`archive-item-wrapper ${selectedItems.some(item => item.type === 'note' && item.id === note.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'note' && item.id === note.id)}
                        onChange={() => handleSelectItem('note', note.id)}
                      />
                    </div>
                    <NoteCard
                      note={note}
                      isArchiveView={true}
                      onUnarchive={() => handleUnarchiveItem('note', note.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Archived Reminders */}
          {filteredItems.reminders.length > 0 && (
            <section className="archive-section">
              <h3>⏰ Archived Reminders</h3>
              <div className="reminders-list">
                {filteredItems.reminders.map(reminder => (
                  <div 
                    key={reminder.id} 
                    className={`reminder-item ${selectedItems.some(item => item.type === 'reminder' && item.id === reminder.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'reminder' && item.id === reminder.id)}
                        onChange={() => handleSelectItem('reminder', reminder.id)}
                      />
                    </div>
                    <div className="reminder-content">
                      <h4>{reminder.title}</h4>
                      {reminder.description && <p>{reminder.description}</p>}
                      <div className="reminder-meta">
                        <span className="reminder-date">
                          📅 {new Date(reminder.date).toLocaleDateString()}
                        </span>
                        {reminder.time && (
                          <span className="reminder-time">
                            🕒 {reminder.time}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnarchiveItem('reminder', reminder.id)}
                      className="unarchive-btn"
                      title="Unarchive reminder"
                    >
                      📤
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Archived Documents */}
          {filteredItems.documents.length > 0 && (
            <section className="archive-section">
              <h3>📄 Archived Documents</h3>
              <div className="documents-list">
                {filteredItems.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className={`document-item ${selectedItems.some(item => item.type === 'document' && item.id === doc.id) ? 'selected' : ''}`}
                  >
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.type === 'document' && item.id === doc.id)}
                        onChange={() => handleSelectItem('document', doc.id)}
                      />
                    </div>
                    <div className="document-content">
                      <div className="document-icon">📄</div>
                      <div className="document-details">
                        <h4>{doc.title || doc.originalName}</h4>
                        {doc.description && <p>{doc.description}</p>}
                        <div className="document-meta">
                          <span className="file-type">{doc.fileType}</span>
                          <span className="file-size">{(doc.size / 1024).toFixed(1)} KB</span>
                          <span className="archive-date">
                            Archived: {new Date(doc.archivedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnarchiveItem('document', doc.id)}
                      className="unarchive-btn"
                      title="Unarchive document"
                    >
                      📤
                    </button>
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

export default ArchiveView;