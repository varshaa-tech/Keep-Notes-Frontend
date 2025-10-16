import React, { useState } from 'react';

const UrlManager = ({ urls, onAddUrl, onUpdateUrl, onDeleteUrl, searchTerm }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('title');
  const [filterCategory, setFilterCategory] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    category: '',
    description: '',
    tags: '',
    priority: 'medium',
    folder: 'default'
  });

  const categories = ['Work', 'Personal', 'Learning', 'Entertainment', 'Tools', 'Reference', 'News', 'Shopping', 'Other'];
  const priorities = ['low', 'medium', 'high'];
  const sortOptions = [
    { value: 'title', label: 'Title A-Z' },
    { value: 'created', label: 'Date Added' },
    { value: 'updated', label: 'Last Updated' },
    { value: 'category', label: 'Category' }
  ];

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.url.trim()) {
      errors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url.startsWith('http') ? formData.url : `https://${formData.url}`);
      } catch {
        errors.url = 'Please enter a valid URL';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const urlData = {
        id: editingId || Date.now().toString(),
        title: formData.title.trim(),
        url: formData.url.startsWith('http') ? formData.url : `https://${formData.url}`,
        category: formData.category || 'Other',
        description: formData.description.trim(),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        priority: formData.priority || 'medium',
        folder: formData.folder.trim() || 'default',
        createdAt: editingId ? (urls.find(u => u && u.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clickCount: editingId ? (urls.find(u => u && u.id === editingId)?.clickCount || 0) : 0
      };

      if (editingId) {
        if (typeof onUpdateUrl === 'function') {
          onUpdateUrl(urlData);
        }
        setEditingId(null);
      } else {
        if (typeof onAddUrl === 'function') {
          onAddUrl(urlData);
        }
        setIsAdding(false);
      }

      resetForm();
      setValidationErrors({});
    } catch (error) {
      console.error('Error submitting form:', error);
      setValidationErrors({ general: 'An error occurred while saving the URL' });
    }
  };

  const handleEdit = (url) => {
    setFormData({
      title: url.title || '',
      url: url.url || '',
      category: url.category || '',
      description: url.description || '',
      tags: url.tags ? url.tags.join(', ') : '',
      priority: url.priority || 'medium',
      folder: url.folder || 'default'
    });
    setEditingId(url.id);
    setIsAdding(true);
    setValidationErrors({});
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this URL?')) {
      onDeleteUrl(id);
    }
  };

  const handleUrlClick = (url) => {
    try {
      if (!url || !url.id) return;
      
      // Update click count
      const updatedUrl = {
        ...url,
        clickCount: (url.clickCount || 0) + 1,
        lastClicked: new Date().toISOString()
      };
      
      if (typeof onUpdateUrl === 'function') {
        onUpdateUrl(updatedUrl);
      }
      
      // Open URL
      if (url.url) {
        window.open(url.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error handling URL click:', error);
      // Still try to open the URL if it exists
      if (url && url.url) {
        window.open(url.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      category: '',
      description: '',
      tags: '',
      priority: 'medium',
      folder: 'default'
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
    setValidationErrors({});
  };

  // Enhanced filtering with error handling
  const getFilteredUrls = () => {
    if (!Array.isArray(urls)) return [];
    
    let filtered = urls.filter(url => {
      if (!url || typeof url !== 'object') return false;
      
      const searchMatch = !searchTerm || (
        (url.title && url.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (url.url && url.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (url.category && url.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (url.description && url.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (url.tags && Array.isArray(url.tags) && url.tags.some(tag => 
          tag && tag.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        (url.folder && url.folder.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const categoryMatch = !filterCategory || url.category === filterCategory;

      return searchMatch && categoryMatch;
    });

    // Sort URLs with error handling
    filtered.sort((a, b) => {
      try {
        switch (sortBy) {
          case 'created':
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          case 'updated':
            const updatedA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
            const updatedB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
            return updatedB - updatedA;
          case 'category':
            return (a.category || '').localeCompare(b.category || '');
          default:
            return (a.title || '').localeCompare(b.title || '');
        }
      } catch (error) {
        console.error('Error sorting URLs:', error);
        return 0;
      }
    });

    return filtered;
  };

  const filteredUrls = getFilteredUrls();

  // Group URLs by category with error handling
  const groupedUrls = (() => {
    try {
      return filteredUrls.reduce((groups, url) => {
        if (!url || typeof url !== 'object') return groups;
        
        const category = url.category || 'Other';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(url);
        return groups;
      }, {});
    } catch (error) {
      console.error('Error grouping URLs:', error);
      return {};
    }
  })();

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const getUniqueCategories = () => {
    if (!Array.isArray(urls)) return [];
    try {
      const usedCategories = [...new Set(urls
        .map(url => url && url.category)
        .filter(category => category && category.trim())
      )];
      return usedCategories.sort();
    } catch (error) {
      console.error('Error getting unique categories:', error);
      return [];
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>URL Manager ({Array.isArray(urls) ? urls.length : 0} URLs)</h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </button>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="">All Categories</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Add URL
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>{editingId ? 'Edit URL' : 'Add New URL'}</h3>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${validationErrors.title ? '#f44336' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                {validationErrors.title && (
                  <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                    {validationErrors.title}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  URL *
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com or example.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${validationErrors.url ? '#f44336' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                {validationErrors.url && (
                  <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                    {validationErrors.url}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Folder
                </label>
                <input
                  type="text"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  placeholder="default"
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {editingId ? 'Update' : 'Add'} URL
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Display */}
      {filteredUrls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {searchTerm || filterCategory ? 
            `No URLs match the current filters` : 
            'No URLs saved yet. Click "Add URL" to get started!'
          }
        </div>
      ) : (
        <div>
          {Object.entries(groupedUrls)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categoryUrls]) => (
            <div key={category} style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#333', 
                borderBottom: '2px solid #eee', 
                paddingBottom: '10px',
                marginBottom: '15px'
              }}>
                {category} ({categoryUrls.length})
              </h3>
              <div style={{ 
                display: viewMode === 'grid' ? 'grid' : 'block',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit, minmax(320px, 1fr))' : 'none',
                gap: '15px'
              }}>
                {categoryUrls.map(url => (
                  <div
                    key={url.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: viewMode === 'list' ? '10px' : '0',
                      borderLeft: `4px solid ${getPriorityColor(url.priority)}`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <img
                        src={getFaviconUrl(url.url)}
                        alt=""
                        style={{ width: '16px', height: '16px', marginRight: '8px' }}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#333', flex: 1 }}>
                        {url.title}
                      </h4>
                      <div style={{ 
                        fontSize: '10px', 
                        color: getPriorityColor(url.priority),
                        fontWeight: 'bold',
                        marginRight: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {url.priority}
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(url);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '3px',
                            fontSize: '14px'
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(url.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f44336',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '3px',
                            fontSize: '14px'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div
                      onClick={() => handleUrlClick(url)}
                      style={{
                        color: '#1976d2',
                        textDecoration: 'none',
                        fontSize: '14px',
                        wordBreak: 'break-all',
                        display: 'block',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '3px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      {url.url}
                    </div>

                    {url.description && (
                      <p style={{
                        margin: '0 0 10px 0',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {url.description}
                      </p>
                    )}

                    {url.tags && url.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                        {url.tags.map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              border: '1px solid #bbdefb'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#999', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        Added: {new Date(url.createdAt).toLocaleDateString()}
                        {url.updatedAt !== url.createdAt && (
                          <span> • Updated: {new Date(url.updatedAt).toLocaleDateString()}</span>
                        )}
                        {url.folder && url.folder !== 'default' && (
                          <span> • Folder: {url.folder}</span>
                        )}
                      </div>
                      {url.clickCount > 0 && (
                        <div style={{ fontSize: '11px' }}>
                          Clicks: {url.clickCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UrlManager;