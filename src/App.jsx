import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Sidebar from './components/SideBar';
import PermanentNoteForm from './components/PermanentNoteForm';
import NoteCard from './components/NoteCard';
import ReminderPage from './components/ReminderPage';
import TrashView from './components/TrashView';
import ArchiveView from './components/ArchiveView';
import DocumentManager from './components/DocumentManager';
import UrlManager from './components/URLManager';
import AuthModal from './components/Auth/AuthModal';
import UserProfile from './components/Auth/UserProfile';
import ApiService from './services/api';
import './App.css';

function AppContent() {
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [urls, setUrls] = useState([]);
  
  // Auth-related state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showProfile, setShowProfile] = useState(false);

  const handleAddDocument = (newDoc) => {
    setDocuments(prevDocs => [newDoc, ...prevDocs]);
  };

  const handleUpdateDocument = (updatedDoc) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
    );
  };

  useEffect(() => {
  if (reminders.length > 0) {
    try {
      localStorage.setItem('reminders', JSON.stringify(reminders));
    } catch (error) {
      console.error('Failed to save reminders to localStorage:', error);
    }
  }
}, [reminders]);

useEffect(() => {
  if (notes.length > 0) {
    try {
      localStorage.setItem('notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save notes to localStorage:', error);
    }
  }
}, [notes]);

useEffect(() => {
  if (urls.length > 0) {
    try {
      localStorage.setItem('urls', JSON.stringify(urls));
    } catch (error) {
      console.error('Failed to save URLs to localStorage:', error);
    }
  }
}, [urls]);

// 3. Improve the loadUrls function with better error handling:
const loadUrls = async () => {
  try {
    const urlsData = await ApiService.getUrls();
    if (Array.isArray(urlsData)) {
      setUrls(urlsData);
    } else {
      throw new Error('Invalid URLs data format');
    }
  } catch (err) {
    console.error('Cannot fetch URLs from backend, loading from localStorage:', err);
    try {
      const savedUrls = localStorage.getItem('urls');
      if (savedUrls) {
        const parsedUrls = JSON.parse(savedUrls);
        if (Array.isArray(parsedUrls)) {
          setUrls(parsedUrls);
        } else {
          setUrls([]);
        }
      }
    } catch (parseError) {
      console.error('Error parsing URLs from localStorage:', parseError);
      setUrls([]);
    }
  }
};

// 4. Add error boundary component (create this as a separate file):


  const handleDeleteDocument = (id) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
  };

  // URL Manager handlers
  const handleAddUrl = (newUrl) => {
    setUrls(prevUrls => [newUrl, ...prevUrls]);
  };

  const handleUpdateUrl = (updatedUrl) => {
    setUrls(prevUrls =>
      prevUrls.map(url => url.id === updatedUrl.id ? updatedUrl : url)
    );
  };

  const handleDeleteUrl = (id) => {
    setUrls(prevUrls => prevUrls.filter(url => url.id !== id));
  };

  // Auth handlers to match your existing Header interface
  const handleOpenAuth = (mode) => {
    setAuthMode(mode === 'signup' ? 'register' : 'login');
    setShowAuthModal(true);
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  useEffect(() => {
    checkBackend();
    loadNotes();
    loadReminders();
    loadDocuments();
    loadUrls();
  }, []);

  // Save reminders to localStorage whenever reminders state changes
  useEffect(() => {
    if (reminders.length > 0) {
      localStorage.setItem('reminders', JSON.stringify(reminders));
    }
  }, [reminders]);

  // Save notes to localStorage whenever notes state changes
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('notes', JSON.stringify(notes));
    }
  }, [notes]);

  // Save URLs to localStorage whenever urls state changes
  useEffect(() => {
    if (urls.length > 0) {
      localStorage.setItem('urls', JSON.stringify(urls));
    }
  }, [urls]);

  const checkBackend = async () => {
    try {
      await ApiService.getNotes();
      setIsOnline(true);
    } catch {
      setIsOnline(false);
      setError('Backend (Express.js) is offline. Please start backend server.');
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesData = await ApiService.getNotes();
      // Filter out trashed notes for main view
      const activeNotes = notesData.filter(note => !note.trashed);
      setNotes(activeNotes);
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Cannot fetch notes from backend.');
      // Try to load from localStorage as fallback
      const localNotes = localStorage.getItem('notes');
      if (localNotes) {
        const parsedNotes = JSON.parse(localNotes);
        const activeNotes = parsedNotes.filter(note => !note.trashed);
        setNotes(activeNotes);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = () => {
    try {
      const savedReminders = localStorage.getItem('reminders');
      if (savedReminders) {
        const parsedReminders = JSON.parse(savedReminders);
        setReminders(parsedReminders);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const documentsData = await ApiService.getDocuments();
      setDocuments(documentsData);
    } catch (err) {
      console.error('Cannot fetch documents from backend:', err);
    }
  };

  

  const addNote = async (noteData) => {
    try {
      const newNote = await ApiService.createNote(noteData);
      setNotes([newNote, ...notes]);
      setError(null);
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Failed to create note. Check backend.');
    }
  };

  const addReminder = (reminderData) => {
    const newReminder = {
      id: Date.now().toString(),
      ...reminderData,
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    setReminders(prev => [newReminder, ...prev]);
  };

  const updateReminder = (id, updates) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.id === id ? { ...reminder, ...updates } : reminder
      )
    );
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  const toggleReminderComplete = (id) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.id === id 
          ? { ...reminder, completed: !reminder.completed }
          : reminder
      )
    );
  };

  const updateNote = async (id, updates) => {
    try {
      const updatedNote = await ApiService.updateNote(id, updates);
      setNotes(notes.map(note => note.id === id ? { ...note, ...updatedNote } : note));
      setIsOnline(true);
    } catch {
      setIsOnline(false);
      setError('Failed to update note.');
    }
  };

  // Modified to handle trash system - moves note to trash instead of permanent deletion
  const deleteNote = async (id) => {
    try {
      // This will move the note to trash (not permanently delete)
      await ApiService.deleteNote(id);
      // Remove from main notes view (it's now in trash)
      setNotes(notes.filter(n => n.id !== id));
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Failed to move note to trash.');
    }
  };

  // Function to handle note restoration from archive
  const handleUnarchiveNote = (noteId) => {
    // Reload notes to reflect the unarchived note
    loadNotes();
  };

  // New function to handle pin toggle
  const togglePin = async (id) => {
    try {
      const note = notes.find(n => n.id === id);
      const updatedNote = await ApiService.updateNote(id, { 
        pinned: !note.pinned 
      });
      setNotes(notes.map(n => n.id === id ? { ...n, ...updatedNote } : n));
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Failed to toggle pin.');
    }
  };

  // New function to handle archive toggle
  const toggleArchive = async (id) => {
    try {
      const note = notes.find(n => n.id === id);
      const updatedNote = await ApiService.updateNote(id, { 
        archived: !note.archived 
      });
      setNotes(notes.map(n => n.id === id ? { ...n, ...updatedNote } : n));
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Failed to toggle archive.');
    }
  };

  // New function to handle color change
  const changeColor = async (id, color) => {
    try {
      const updatedNote = await ApiService.updateNote(id, { color });
      setNotes(notes.map(n => n.id === id ? { ...n, color } : n));
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
      setError('Failed to change color.');
    }
  };

  const retryConnection = () => {
    setError(null);
    checkBackend();
    loadNotes();
  };

  // FIXED: Separate filtering logic for notes and reminders
  const getFilteredNotesForView = () => {
    const search = searchTerm.toLowerCase();
    
    // Filter by current view (ONLY for note views)
    let viewFiltered = [];
    switch (currentView) {
      case 'notes':
        viewFiltered = notes.filter(note => !note.archived);
        break;
      case 'archive':
        viewFiltered = notes.filter(note => note.archived);
        break;
      // REMOVED: reminders case from here - we don't want notes in reminders view
      default:
        viewFiltered = notes.filter(note => !note.archived);
    }

    // Apply search filter
    return viewFiltered.filter(note => 
      note.title.toLowerCase().includes(search) ||
      note.content.toLowerCase().includes(search) ||
      (note.todos && note.todos.some(todo => 
        todo.text.toLowerCase().includes(search)
      ))
    );
  };

  const filteredNotes = getFilteredNotesForView();
  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.pinned);

  if (loading) {
    return <p>Loading notes...</p>;
  }

  return (
    <div className="app">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenAuth={handleOpenAuth}
        onShowProfile={handleShowProfile}
      />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={retryConnection}>Retry</button>
        </div>
      )}

      <div className="app-body">
        <Sidebar
          isOpen={sidebarOpen}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        <main className="main-content">
          {/* FIXED: Separate Reminders Page - Only shows reminders, no notes */}
          {currentView === 'reminders' && (
            <ReminderPage
              reminders={reminders}
              onAddReminder={addReminder}
              onUpdateReminder={updateReminder}
              onDeleteReminder={deleteReminder}
              onToggleComplete={toggleReminderComplete}
            />
          )}

          {/* Trash View */}
          {currentView === 'trash' && (
            <TrashView onRefresh={loadNotes} />
          )}

          {/* Archive View */}
          {currentView === 'archive' && (
            <ArchiveView 
              onUnarchiveNote={handleUnarchiveNote}
              searchTerm={searchTerm}
            />
          )}

          {/* Notes Views - Only for 'notes' view */}
          {currentView === 'notes' && (
            <>
              <PermanentNoteForm onAddNote={addNote} />
              
              <div className="notes-container">
                {filteredNotes.length === 0 ? (
                  <p>
                    {searchTerm ? `No notes match "${searchTerm}"` : 'No notes found.'}
                  </p>
                ) : (
                  <>
                    {pinnedNotes.length > 0 && (
                      <>
                        <h3>Pinned</h3>
                        <div style={{display:'flex', flexWrap: 'wrap', gap: '8px'}}>
                          {pinnedNotes.map(note => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              onUpdate={updateNote}
                              onDelete={deleteNote}
                              onTogglePin={togglePin}
                              onToggleArchive={toggleArchive}
                              onChangeColor={changeColor}
                              isTrashView={false}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {unpinnedNotes.length > 0 && (
                      <>
                        <h3>Notes</h3>
                        <div style={{display:'flex', flexWrap: 'wrap', gap: '8px'}}>
                          {unpinnedNotes.map(note => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              onUpdate={updateNote}
                              onDelete={deleteNote}
                              onTogglePin={togglePin}
                              onToggleArchive={toggleArchive}
                              onChangeColor={changeColor}
                              isTrashView={false}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Document Manager */}
          {currentView === 'documentManager' && (
            <DocumentManager
              documents={documents}
              onAddDocument={handleAddDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {/* URL Manager */}
          {currentView === 'urlManager' && (
  <UrlManager
    urls={urls}  // Changed from yourUrlsArray to urls
    onAddUrl={handleAddUrl}
    onUpdateUrl={handleUpdateUrl}
    onDeleteUrl={handleDeleteUrl}
    searchTerm={searchTerm}
  />
          )}
        </main>
      </div>

      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? '🟢 Online' : '🔴 Offline'}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {/* User Profile Modal */}
      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}

// Main App component wrapped with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;