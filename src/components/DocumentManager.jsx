import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Tag, Download, Trash2, Eye, Upload, X, Filter, AlertCircle } from 'lucide-react';
import ApiService from '../services/api';

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
const getFileUrl = (document) => {
  if (!document || !document.content || !document.fileType) return null;
  return `data:${document.fileType};base64,${document.content}`;
};

  // Load documents from backend
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getDocuments();
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Handle document creation with progress tracking
  const handleAddDocument = async (documentData) => {
    try {
      setUploadProgress(0);
      
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      const newDocument = await ApiService.createDocument(documentData, config);
      setDocuments(prev => [...prev, newDocument]);
      setShowUploadForm(false);
      setUploadProgress(0);
      return true;
    } catch (err) {
      console.error('Failed to add document:', err);
      setUploadProgress(0);
      throw err;
    }
  };

 const [deletingId, setDeletingId] = useState(null);

const handleDeleteDocument = async (id) => {
  setDeletingId(id);
  const previousDocuments = [...documents];
  setDocuments(prev => prev.filter(doc => doc.id !== id));

  try {
    console.log(`Deleting document ID: ${id}`);
    await ApiService.deleteDocument(id);
    console.log(`Deleted document ID: ${id}`);
  } catch (err) {
    console.error(`Failed to delete document ID ${id}:`, err);
    setDocuments(previousDocuments);
    alert('Failed to delete document. Please try again.');
  } finally {
    setDeletingId(null);
  }
};



  // Extract unique tags from documents
  const allTags = [...new Set(documents.flatMap(doc => doc.tags || []))];

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !selectedTag || (doc.tags && doc.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'dateAdded':
        default:
          return new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded);
      }
    });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('text')) return '📄';
    return '📎';
  };

  const DocumentCard = ({ document }) => (
    <div className="document-card">
      <div className="document-header">
        <div className="document-icon">
          {getFileIcon(document.type)}
        </div>
        <div className="document-info">
          <h3 className="document-title">{document.title}</h3>
          <p className="document-description">{document.description}</p>
          <div className="document-meta">
            <span className="file-size">{formatFileSize(document.size)}</span>
            <span className="date-added">{formatDate(document.dateAdded)}</span>
          </div>
        </div>
      </div>
      
      {document.tags && document.tags.length > 0 && (
        <div className="document-tags">
          {document.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
      
      {document.reminder && (
        <div className="document-reminder">
          <Calendar size={14} />
          <span>Reminder: {formatDate(document.reminder)}</span>
        </div>
      )}
      
      <div className="document-actions">
        <button 
          onClick={() => {
            setSelectedDocument(document);
            setShowPreview(true);
          }}
          className="action-btn preview-btn"
        >
          <Eye size={16} />
          Preview
        </button>
        <button 
  onClick={() => {
    const link = document.createElement('a');
    link.href = getFileUrl(document);
    link.download = document.fileName || document.title;
    link.click();
  }}
  className="action-btn download-btn"
>
  <Download size={16} />
  Download
</button>

        <button 
          onClick={() => handleDeleteDocument(document.id)}
          className="action-btn delete-btn"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );

  const DocumentUploadForm = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      tags: '',
      file: null,
      reminderDate: '',
      reminderTime: ''
    });
    const [uploading, setUploading] = useState(false);

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10MB limit');
        return;
      }

      setFormData(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.split('.')[0]
      }));
      setUploadError('');
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.file) {
        setUploadError('Please select a file to upload');
        return;
      }

      setUploading(true);
      setUploadError('');

      try {
        const tags = formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);

        const documentData = {
          title: formData.title,
          description: formData.description,
          tags: tags.length > 0 ? tags : [],
          reminderDate: formData.reminderDate || '',
          reminderTime: formData.reminderTime || '',
          file: formData.file
        };

        const success = await handleAddDocument(documentData);
        
        if (success) {
          setFormData({
            title: '',
            description: '',
            tags: '',
            file: null,
            reminderDate: '',
            reminderTime: ''
          });
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || 
                           err.message || 
                           'Upload failed. Please try again.';
        setUploadError(errorMessage);
        
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            handleSubmit(e);
          }, 2000);
        }
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="upload-form-overlay">
        <div className="upload-form">
          <div className="upload-form-header">
            <h2>Upload Document</h2>
            <button 
              onClick={() => {
                setShowUploadForm(false);
                setUploadProgress(0);
              }}
              className="close-btn"
              disabled={uploading}
            >
              <X size={20} />
            </button>
          </div>

          {uploadError && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{uploadError}</span>
              {retryCount > 0 && (
                <span className="retry-count">(Retry {retryCount}/3)</span>
              )}
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress">
              <div 
                className="progress-bar"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <span>{uploadProgress}%</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>File</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                required
                disabled={uploading}
              />
              {formData.file && (
                <div className="file-info">
                  <span>✓ {formData.file.name}</span>
                  <span>{formatFileSize(formData.file.size)}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter document title"
                required
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter description"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., important, project, meeting"
                disabled={uploading}
              />
              <small>Separate tags with commas</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Reminder Date</label>
                <input
                  type="date"
                  name="reminderDate"
                  value={formData.reminderDate}
                  onChange={handleInputChange}
                  disabled={uploading}
                />
              </div>
              <div className="form-group">
                <label>Reminder Time</label>
                <input
                  type="time"
                  name="reminderTime"
                  value={formData.reminderTime}
                  onChange={handleInputChange}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadProgress(0);
                }}
                disabled={uploading}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !formData.file}
                className="submit-btn"
              >
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DocumentPreview = ({ document }) => (
    <div className="preview-overlay">
      <div className="preview-modal">
        <div className="preview-header">
          <h2>{document.title}</h2>
          <button 
            onClick={() => setShowPreview(false)}
            className="close-btn"
          >
            <X size={20} />
          </button>
        </div>
        <div className="preview-content">
          <div className="preview-info">
            <p><strong>Description:</strong> {document.description}</p>
            <p><strong>File Size:</strong> {formatFileSize(document.size)}</p>
            <p><strong>Date Added:</strong> {formatDate(document.dateAdded)}</p>
            {document.tags && document.tags.length > 0 && (
              <div className="preview-tags">
                <strong>Tags:</strong>
                {document.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
          {document.type?.includes('image') && (
            <img 
              src={document.url} 
              alt={document.title}
              className="preview-image"
            />
          )}
          {document.type?.includes('text') && (
            <div className="preview-text">
              <p>Text file preview would go here</p>
            </div>
          )}
          {!document.type?.includes('image') && !document.type?.includes('text') && (
            <div className="preview-placeholder">
              <FileText size={48} />
              <p>Preview not available for this file type</p>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = document.url;
                  link.download = document.filename;
                  link.click();
                }}
                className="download-btn"
              >
                <Download size={16} />
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && documents.length === 0) {
    return (
      <div className="document-manager">
        <div className="loading-state">
          Loading documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-manager">
        <div className="error-state">
          {error}
          <button onClick={loadDocuments}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-manager">
      <style jsx>{`
        .document-manager {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-state, .error-state {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }

        .error-state button {
          margin-top: 10px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .upload-progress {
          margin: 10px 0;
          height: 20px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background: #4CAF50;
          transition: width 0.3s ease;
        }

        .upload-progress span {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: white;
          font-size: 12px;
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          border: 1px solid #ffcdd2;
        }

        .error-message .retry-count {
          margin-left: auto;
          font-size: 12px;
          color: #666;
        }

        /* Rest of your existing CSS styles */
        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .document-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .upload-btn:hover {
          background: #0056b3;
        }

        .document-controls {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 12px;
          min-width: 300px;
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          margin-left: 8px;
          font-size: 14px;
          flex: 1;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          font-size: 14px;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .document-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .document-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .document-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .document-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .document-info {
          flex: 1;
        }

        .document-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0 0 4px 0;
        }

        .document-description {
          font-size: 14px;
          color: #666;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .document-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #888;
        }

        .document-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .document-reminder {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff3e0;
          color: #f57c00;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .document-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          color:black;
          font-size: 12px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f8f9fa;
        }

        .preview-btn:hover {
          background: #e3f2fd;
          border-color: #1976d2;
          color: #1976d2;
        }

        .download-btn:hover {
          background: #e8f5e8;
          border-color: #4caf50;
          color: #4caf50;
        }

        .delete-btn:hover {
          background: #ffebee;
          border-color: #f44336;
          color: #f44336;
        }

        .upload-form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .upload-form {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .upload-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: #f0f0f0;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-group small {
          color: #666;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .file-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding: 8px;
          background: #f0f8ff;
          border-radius: 4px;
          font-size: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-btn {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .preview-modal {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .preview-content {
          padding: 20px;
        }

        .preview-info {
          margin-bottom: 20px;
        }

        .preview-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .preview-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }

        .preview-placeholder {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .documents-grid {
            grid-template-columns: 1fr;
          }
          
          .document-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-box {
            min-width: auto;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="document-header">
        <h1 className="document-title">Document Manager</h1>
        <button 
          onClick={() => setShowUploadForm(true)}
          className="upload-btn"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      <div className="document-controls">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={selectedTag} 
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="dateAdded">Date Added</option>
            <option value="title">Title</option>
            <option value="size">File Size</option>
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>No documents found</h3>
          <p>
            {documents.length === 0 
              ? "Upload your first document to get started"
              : "Try adjusting your search or filter criteria"
            }
          </p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map(document => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}

      {showUploadForm && <DocumentUploadForm />}
      {showPreview && selectedDocument && (
        <DocumentPreview document={selectedDocument} />
      )}
    </div>
  );
};

export default DocumentManager;