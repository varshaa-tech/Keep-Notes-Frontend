// services/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // If you're using cookie-based refresh tokens
  headers: {
    'Content-Type': 'application/json',
  },
});

// ================================
// Setup Axios Interceptors
// ================================
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (response && (response.status === 401 || response.status === 403)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

// ================================
// Track ongoing operations to avoid duplicates
// ================================
const ongoingOperations = {
  delete: new Set(),
  update: new Set(),
  archive: new Set(),
  restore: new Set()
};

function getOperationKey(type, id) {
  return `${type}-${id}`;
}

// ================================
// API METHODS
// ================================


const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null;
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};

const ApiService = {
  // ============================================================================
  // USER AUTHENTICATION
  // ============================================================================
  
  async signup(userData) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    return await res.json();
  },

  async login(credentials) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await res.json();
    
    if (data.token && typeof window !== 'undefined') {
      window.localStorage?.setItem('token', data.token);
    }
    
    return data;
  },

  // ============================================================================
  // NOTES OPERATIONS
  // ============================================================================

  async getNotes(status = 'active') {
    const queryParam = status !== 'active' ? `?status=${status}` : '';
    const res = await fetch(`${BASE_URL}/notes${queryParam}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch notes');
    }
    
    const notes = await res.json();
    return notes.map(note => ({
      ...note,
      id: note._id || note.id
    }));
  },

  async createNote(note) {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(note),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot create note');
    }
    
    return res.json();
  },

  async updateNote(id, updates) {
    const operationKey = `update-note-${id}`;
    
    if (ongoingOperations.update.has(operationKey)) {
      throw new Error('Update already in progress');
    }
    
    ongoingOperations.update.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Cannot update note');
      }
      
      return res.json();
    } finally {
      ongoingOperations.update.delete(operationKey);
    }
  },

  async deleteNote(id, permanent = false) {
    const operationKey = permanent ? `delete-note-${id}` : `trash-note-${id}`;
    
    if (ongoingOperations.delete.has(operationKey)) {
      throw new Error(`${permanent ? 'Delete' : 'Move to trash'} already in progress`);
    }
    
    ongoingOperations.delete.add(operationKey);
    
    try {
      const url = permanent 
        ? `${BASE_URL}/notes/${id}?permanent=true`
        : `${BASE_URL}/notes/${id}`;
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Cannot ${permanent ? 'delete' : 'move to trash'} note`);
      }
      
      return res.status === 204 
        ? { message: `Note ${permanent ? 'deleted permanently' : 'moved to trash'}` }
        : await res.json();
    } finally {
      ongoingOperations.delete.delete(operationKey);
    }
  },

  async restoreNoteFromTrash(id) {
    const operationKey = `restore-note-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Restore already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/notes/${id}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Cannot restore note');
      }
      
      return res.json();
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async archiveNote(id) {
    const operationKey = `archive-note-${id}`;
    
    if (ongoingOperations.archive.has(operationKey)) {
      throw new Error('Archive already in progress');
    }
    
    ongoingOperations.archive.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/notes/${id}/archive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot archive note');
      }
      
      return res.json();
    } finally {
      ongoingOperations.archive.delete(operationKey);
    }
  },

  async unarchiveNote(id) {
    const operationKey = `unarchive-note-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Unarchive already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/notes/${id}/unarchive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot unarchive note');
      }
      
      return res.json();
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async getTrashedNotes() {
    return this.getNotes('trashed');
  },

  async getArchivedNotes() {
    return this.getNotes('archived');
  },

  // ============================================================================
  // REMINDERS OPERATIONS
  // ============================================================================

  async getReminders(status = 'active') {
    const queryParam = status !== 'active' ? `?status=${status}` : '';
    const res = await fetch(`${BASE_URL}/reminders${queryParam}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch reminders');
    }
    
    const reminders = await res.json();
    return reminders.map(reminder => ({
      ...reminder,
      id: reminder._id || reminder.id
    }));
  },

  async createReminder(reminder) {
    const res = await fetch(`${BASE_URL}/reminders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reminder),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot create reminder');
    }
    
    return res.json();
  },

  async updateReminder(id, updates) {
    const operationKey = `update-reminder-${id}`;
    
    if (ongoingOperations.update.has(operationKey)) {
      throw new Error('Update already in progress');
    }
    
    ongoingOperations.update.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/reminders/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Cannot update reminder');
      }
      
      const result = await res.json();
      if (result.reminder) {
        result.reminder.id = result.reminder._id || result.reminder.id;
      }
      return result;
    } finally {
      ongoingOperations.update.delete(operationKey);
    }
  },

  async deleteReminder(id, permanent = false) {
    const operationKey = permanent ? `delete-reminder-${id}` : `trash-reminder-${id}`;
    
    if (ongoingOperations.delete.has(operationKey)) {
      throw new Error(`${permanent ? 'Delete' : 'Move to trash'} already in progress`);
    }
    
    ongoingOperations.delete.add(operationKey);
    
    try {
      const url = permanent 
        ? `${BASE_URL}/reminders/${id}?permanent=true`
        : `${BASE_URL}/reminders/${id}`;
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Cannot ${permanent ? 'delete' : 'move to trash'} reminder`);
      }
      
      return res.status === 204 
        ? { message: `Reminder ${permanent ? 'deleted permanently' : 'moved to trash'}` }
        : await res.json();
    } finally {
      ongoingOperations.delete.delete(operationKey);
    }
  },

  async restoreReminderFromTrash(id) {
    const operationKey = `restore-reminder-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Restore already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/reminders/${id}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Cannot restore reminder');
      }
      
      const result = await res.json();
      if (result.reminder) {
        result.reminder.id = result.reminder._id || result.reminder.id;
      }
      return result;
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async archiveReminder(id) {
    const operationKey = `archive-reminder-${id}`;
    
    if (ongoingOperations.archive.has(operationKey)) {
      throw new Error('Archive already in progress');
    }
    
    ongoingOperations.archive.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/reminders/${id}/archive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot archive reminder');
      }
      
      return res.json();
    } finally {
      ongoingOperations.archive.delete(operationKey);
    }
  },

  async unarchiveReminder(id) {
    const operationKey = `unarchive-reminder-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Unarchive already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/reminders/${id}/unarchive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot unarchive reminder');
      }
      
      return res.json();
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async getTrashedReminders() {
    return this.getReminders('trashed');
  },

  async getArchivedReminders() {
    return this.getReminders('archived');
  },

  // ============================================================================
  // DOCUMENTS OPERATIONS
  // ============================================================================

  async getDocuments(status = 'active') {
    const queryParam = status !== 'active' ? `?status=${status}` : '';
    const res = await fetch(`${BASE_URL}/documents${queryParam}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch documents');
    }
    
    const documents = await res.json();
    return documents.map(doc => ({
      ...doc,
      id: doc._id || doc.id
    }));
  },

  async createDocument(documentData) {
    const token = typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null;
    const formData = new FormData();
    
    formData.append('file', documentData.file);
    formData.append('title', documentData.title || '');
    formData.append('description', documentData.description || '');
    formData.append('tags', documentData.tags.join(','));
    formData.append('reminderDate', documentData.reminderDate || '');
    formData.append('reminderTime', documentData.reminderTime || '');

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot create document');
    }
    
    return res.json();
  },

  async updateDocument(id, updates) {
    const operationKey = `update-document-${id}`;
    
    if (ongoingOperations.update.has(operationKey)) {
      throw new Error('Update already in progress');
    }
    
    ongoingOperations.update.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/documents/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot update document');
      }
      
      return res.json();
    } finally {
      ongoingOperations.update.delete(operationKey);
    }
  },

  async deleteDocument(id, permanent = false) {
    const operationKey = permanent ? `delete-document-${id}` : `trash-document-${id}`;
    
    if (ongoingOperations.delete.has(operationKey)) {
      throw new Error(`${permanent ? 'Delete' : 'Move to trash'} already in progress`);
    }
    
    ongoingOperations.delete.add(operationKey);
    
    try {
      const url = permanent 
        ? `${BASE_URL}/documents/${id}?permanent=true`
        : `${BASE_URL}/documents/${id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Cannot ${permanent ? 'delete' : 'move to trash'} document`);
      }

      return res.status === 204 
        ? { message: `Document ${permanent ? 'deleted permanently' : 'moved to trash'}` }
        : await res.json();
    } finally {
      ongoingOperations.delete.delete(operationKey);
    }
  },

  async restoreDocumentFromTrash(id) {
    const operationKey = `restore-document-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Restore already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/documents/${id}/restore`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot restore document');
      }

      return res.json();
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async archiveDocument(id) {
    const operationKey = `archive-document-${id}`;
    
    if (ongoingOperations.archive.has(operationKey)) {
      throw new Error('Archive already in progress');
    }
    
    ongoingOperations.archive.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/documents/${id}/archive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot archive document');
      }

      return res.json();
    } finally {
      ongoingOperations.archive.delete(operationKey);
    }
  },

  async unarchiveDocument(id) {
    const operationKey = `unarchive-document-${id}`;
    
    if (ongoingOperations.restore.has(operationKey)) {
      throw new Error('Unarchive already in progress');
    }
    
    ongoingOperations.restore.add(operationKey);
    
    try {
      const res = await fetch(`${BASE_URL}/documents/${id}/unarchive`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (typeof window !== 'undefined') {
            window.localStorage?.removeItem('token');
          }
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error('Cannot unarchive document');
      }

      return res.json();
    } finally {
      ongoingOperations.restore.delete(operationKey);
    }
  },

  async getTrashedDocuments() {
    return this.getDocuments('trashed');
  },

  async getArchivedDocuments() {
    return this.getDocuments('archived');
  },

  async downloadDocument(id) {
    const res = await fetch(`${BASE_URL}/documents/${id}/download`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot download document');
    }

    return res.blob();
  },

  // ============================================================================
  // UNIFIED TRASH MANAGEMENT
  // ============================================================================

  async getTrashItems() {
    const res = await fetch(`${BASE_URL}/trash`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch trash items');
    }
    
    return res.json();
  },

  async getTrashStats() {
    const res = await fetch(`${BASE_URL}/trash/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch trash stats');
    }
    
    return res.json();
  },

  async emptyTrash() {
    const res = await fetch(`${BASE_URL}/trash/empty`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot empty trash');
    }
    
    return res.json();
  },

  // ============================================================================
  // UNIFIED ARCHIVE MANAGEMENT
  // ============================================================================

  async getArchiveItems() {
    const res = await fetch(`${BASE_URL}/archive`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch archive items');
    }
    
    return res.json();
  },

  async getArchiveStats() {
    const res = await fetch(`${BASE_URL}/archive/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot fetch archive stats');
    }
    
    return res.json();
  },

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkRestoreFromTrash(items) {
    const res = await fetch(`${BASE_URL}/trash/bulk/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot bulk restore items');
    }
    
    return res.json();
  },

  async bulkPermanentDelete(items) {
    const res = await fetch(`${BASE_URL}/trash/bulk/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot bulk delete items');
    }
    
    return res.json();
  },

  async bulkMoveToTrash(items) {
    const res = await fetch(`${BASE_URL}/trash/bulk/move`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot bulk move to trash');
    }
    
    return res.json();
  },

  async bulkArchive(items) {
    const res = await fetch(`${BASE_URL}/archive/bulk/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot bulk archive items');
    }
    
    return res.json();
  },

  async bulkUnarchive(items) {
    const res = await fetch(`${BASE_URL}/archive/bulk/unarchive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot bulk unarchive items');
    }
    
    return res.json();
  },

  // ============================================================================
  // SEARCH FUNCTIONALITY
  // ============================================================================

  async searchItems(query, filters = {}) {
    const params = new URLSearchParams();
    params.append('q', query);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const res = await fetch(`${BASE_URL}/search?${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot search items');
    }
    
    return res.json();
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Clear all ongoing operations (useful for cleanup)
  clearOngoingOperations() {
    ongoingOperations.delete.clear();
    ongoingOperations.update.clear();
    ongoingOperations.archive.clear();
    ongoingOperations.restore.clear();
  },

  // Check if an operation is currently ongoing
  isOperationInProgress(type, id) {
    const operationKey = `${type}-${id}`;
    return ongoingOperations[type]?.has(operationKey) || false;
  },

  // Get current authentication status
  isAuthenticated() {
    return typeof window !== 'undefined' && !!window.localStorage?.getItem('token');
  },

  // Logout user
  logout() {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('token');
    }
    this.clearOngoingOperations();
  },

  // ============================================================================
  // CONVENIENCE METHODS (Backward Compatibility)
  // ============================================================================

  // Alias methods for backward compatibility
  async moveNoteToTrash(id) {
    return this.deleteNote(id, false);
  },

  async moveReminderToTrash(id) {
    return this.deleteReminder(id, false);
  },

  async moveDocumentToTrash(id) {
    return this.deleteDocument(id, false);
  },

  async permanentlyDeleteNote(id) {
    return this.deleteNote(id, true);
  },

  async permanentlyDeleteReminder(id) {
    return this.deleteReminder(id, true);
  },

  async permanentlyDeleteDocument(id) {
    return this.deleteDocument(id, true);
  },

  // Type-specific bulk operations for convenience
  async bulkMoveNotesToTrash(noteIds) {
    const items = noteIds.map(id => ({ type: 'note', id }));
    return this.bulkMoveToTrash(items);
  },

  async bulkMoveRemindersToTrash(reminderIds) {
    const items = reminderIds.map(id => ({ type: 'reminder', id }));
    return this.bulkMoveToTrash(items);
  },

  async bulkMoveDocumentsToTrash(documentIds) {
    const items = documentIds.map(id => ({ type: 'document', id }));
    return this.bulkMoveToTrash(items);
  },

  async bulkRestoreNotesFromTrash(noteIds) {
    const items = noteIds.map(id => ({ type: 'note', id }));
    return this.bulkRestoreFromTrash(items);
  },

  async bulkRestoreRemindersFromTrash(reminderIds) {
    const items = reminderIds.map(id => ({ type: 'reminder', id }));
    return this.bulkRestoreFromTrash(items);
  },

  async bulkRestoreDocumentsFromTrash(documentIds) {
    const items = documentIds.map(id => ({ type: 'document', id }));
    return this.bulkRestoreFromTrash(items);
  },

  async bulkArchiveNotes(noteIds) {
    const items = noteIds.map(id => ({ type: 'note', id }));
    return this.bulkArchive(items);
  },

  async bulkArchiveReminders(reminderIds) {
    const items = reminderIds.map(id => ({ type: 'reminder', id }));
    return this.bulkArchive(items);
  },

  async bulkArchiveDocuments(documentIds) {
    const items = documentIds.map(id => ({ type: 'document', id }));
    return this.bulkArchive(items);
  },

  async bulkUnarchiveNotes(noteIds) {
    const items = noteIds.map(id => ({ type: 'note', id }));
    return this.bulkUnarchive(items);
  },

  async bulkUnarchiveReminders(reminderIds) {
    const items = reminderIds.map(id => ({ type: 'reminder', id }));
    return this.bulkUnarchive(items);
  },

  async bulkUnarchiveDocuments(documentIds) {
    const items = documentIds.map(id => ({ type: 'document', id }));
    return this.bulkUnarchive(items);
  },

  async bulkPermanentDeleteNotes(noteIds) {
    const items = noteIds.map(id => ({ type: 'note', id }));
    return this.bulkPermanentDelete(items);
  },

  async bulkPermanentDeleteReminders(reminderIds) {
    const items = reminderIds.map(id => ({ type: 'reminder', id }));
    return this.bulkPermanentDelete(items);
  },

  async bulkPermanentDeleteDocuments(documentIds) {
    const items = documentIds.map(id => ({ type: 'document', id }));
    return this.bulkPermanentDelete(items);
  },
  // Add these URL management methods to your ApiService object

// ============================================================================
// URL MANAGEMENT OPERATIONS
// ============================================================================

async getUrls(status = 'active') {
  const queryParam = status !== 'active' ? `?status=${status}` : '';
  const res = await fetch(`${BASE_URL}/urls${queryParam}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== 'undefined') {
        window.localStorage?.removeItem('token');
      }
      throw new Error('Authentication failed. Please login again.');
    }
    throw new Error('Cannot fetch URLs');
  }
  
  const urls = await res.json();
  return urls.map(url => ({
    ...url,
    id: url._id || url.id
  }));
},

async createUrl(urlData) {
  const res = await fetch(`${BASE_URL}/urls`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(urlData),
  });
  
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== 'undefined') {
        window.localStorage?.removeItem('token');
      }
      throw new Error('Authentication failed. Please login again.');
    }
    throw new Error('Cannot create URL');
  }
  
  const result = await res.json();
  return {
    ...result,
    id: result._id || result.id
  };
},

async updateUrl(id, updates) {
  const operationKey = `update-url-${id}`;
  
  if (ongoingOperations.update.has(operationKey)) {
    throw new Error('Update already in progress');
  }
  
  ongoingOperations.update.add(operationKey);
  
  try {
    const res = await fetch(`${BASE_URL}/urls/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Cannot update URL');
    }
    
    const result = await res.json();
    return {
      ...result,
      id: result._id || result.id
    };
  } finally {
    ongoingOperations.update.delete(operationKey);
  }
},

async deleteUrl(id, permanent = false) {
  const operationKey = permanent ? `delete-url-${id}` : `trash-url-${id}`;
  
  if (ongoingOperations.delete.has(operationKey)) {
    throw new Error(`${permanent ? 'Delete' : 'Move to trash'} already in progress`);
  }
  
  ongoingOperations.delete.add(operationKey);
  
  try {
    const url = permanent 
      ? `${BASE_URL}/urls/${id}?permanent=true`
      : `${BASE_URL}/urls/${id}`;
    
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Cannot ${permanent ? 'delete' : 'move to trash'} URL`);
    }
    
    return res.status === 204 
      ? { message: `URL ${permanent ? 'deleted permanently' : 'moved to trash'}` }
      : await res.json();
  } finally {
    ongoingOperations.delete.delete(operationKey);
  }
},

async restoreUrlFromTrash(id) {
  const operationKey = `restore-url-${id}`;
  
  if (ongoingOperations.restore.has(operationKey)) {
    throw new Error('Restore already in progress');
  }
  
  ongoingOperations.restore.add(operationKey);
  
  try {
    const res = await fetch(`${BASE_URL}/urls/${id}/restore`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Cannot restore URL');
    }
    
    const result = await res.json();
    return {
      ...result,
      id: result._id || result.id
    };
  } finally {
    ongoingOperations.restore.delete(operationKey);
  }
},

async archiveUrl(id) {
  const operationKey = `archive-url-${id}`;
  
  if (ongoingOperations.archive.has(operationKey)) {
    throw new Error('Archive already in progress');
  }
  
  ongoingOperations.archive.add(operationKey);
  
  try {
    const res = await fetch(`${BASE_URL}/urls/${id}/archive`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeToken('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot archive URL');
    }
    
    return res.json();
  } finally {
    ongoingOperations.archive.delete(operationKey);
  }
},

async unarchiveUrl(id) {
  const operationKey = `unarchive-url-${id}`;
  
  if (ongoingOperations.restore.has(operationKey)) {
    throw new Error('Unarchive already in progress');
  }
  
  ongoingOperations.restore.add(operationKey);
  
  try {
    const res = await fetch(`${BASE_URL}/urls/${id}/unarchive`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error('Cannot unarchive URL');
    }
    
    return res.json();
  } finally {
    ongoingOperations.restore.delete(operationKey);
  }
},

async recordUrlClick(id) {
  try {
    const res = await fetch(`${BASE_URL}/urls/${id}/click`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem('token');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      // Don't throw error for click recording failures - it's not critical
      console.warn('Failed to record URL click');
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.warn('Error recording URL click:', error);
    return null;
  }
},

async getTrashedUrls() {
  return this.getUrls('trashed');
},

async getArchivedUrls() {
  return this.getUrls('archived');
},

// URL-specific bulk operations
async bulkMoveUrlsToTrash(urlIds) {
  const items = urlIds.map(id => ({ type: 'url', id }));
  return this.bulkMoveToTrash(items);
},

async bulkRestoreUrlsFromTrash(urlIds) {
  const items = urlIds.map(id => ({ type: 'url', id }));
  return this.bulkRestoreFromTrash(items);
},

async bulkArchiveUrls(urlIds) {
  const items = urlIds.map(id => ({ type: 'url', id }));
  return this.bulkArchive(items);
},

async bulkUnarchiveUrls(urlIds) {
  const items = urlIds.map(id => ({ type: 'url', id }));
  return this.bulkUnarchive(items);
},

async bulkPermanentDeleteUrls(urlIds) {
  const items = urlIds.map(id => ({ type: 'url', id }));
  return this.bulkPermanentDelete(items);
},

// Convenience methods for backward compatibility
async moveUrlToTrash(id) {
  return this.deleteUrl(id, false);
},

async permanentlyDeleteUrl(id) {
  return this.deleteUrl(id, true);
}
};

export default ApiService;