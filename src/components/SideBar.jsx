import React from 'react';
import { Lightbulb, Bell, Archive, Trash2, Tag, Edit, FileText, Link } from 'lucide-react';

function Sidebar({ isOpen, currentView, onViewChange }) {
  const menuItems = [
    { id: 'notes', label: 'Notes', icon: Lightbulb },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'documentManager', label: 'Document Manager', icon: FileText },
    { id: 'urlManager', label: 'URL Manager', icon: Link }, // New URL Manager item
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const labels = [
    'collaboration',
    'label',
    'archive',
    'document',
    'bookmarks', // Added bookmark label for URLs
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <button className="sidebar-item">
            <Edit size={20} />
            <span>Edit labels</span>
          </button>
        </div>

        <div className="sidebar-section">
          {labels.map(label => (
            <button key={label} className="sidebar-item">
              <Tag size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style jsx>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: #f8f9fa;
          border-right: 1px solid #e9ecef;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .sidebar-nav {
          padding: 16px 0;
        }

        .sidebar-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
          color: #495057;
        }

        .sidebar-item:hover {
          background-color: #e9ecef;
        }

        .sidebar-item.active {
          background-color: #ffeaa7;
          color: #2d3436;
          font-weight: 500;
        }

        .sidebar-divider {
          height: 1px;
          background-color: #e9ecef;
          margin: 16px 0;
        }

        .sidebar-section {
          margin-bottom: 8px;
        }

        .sidebar-section .sidebar-item {
          font-size: 14px;
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;