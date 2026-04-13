// Sidebar.jsx
import React, { useState, useEffect } from 'react'
import './Sidebar.css'
import logoImg from '../assets/images/logo.png'

function Sidebar({ activePage, setActivePage, onLogout, adminName = 'Admin' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [usersExpanded, setUsersExpanded] = useState(false)

  const menuItems = [
    { id: 'form', label: 'Registration' },
    { id: 'dashboard', label: 'Animal Records' },
  ]

  const usersSubItems = [
    { id: 'create-user', label: 'Create User' },
    { id: 'change-password', label: 'Change Password' },
  ]

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setIsOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && isOpen && 
          !e.target.closest('.sidebar') && 
          !e.target.closest('.mobile-menu-toggle')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobile, isOpen])

  const handleItemClick = (itemId) => {
    setActivePage(itemId)
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout()
    }
  }

  // Get initials for avatar (up to 2 letters)
  const getInitials = () => {
    if (!adminName || adminName === 'Admin') return 'A'
    
    const nameParts = adminName.split(' ')
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    }
    return adminName.charAt(0).toUpperCase()
  }

  return (
    <>
      {/* Mobile Menu Toggle Button - Hidden when sidebar is open */}
      <button 
        className={`mobile-menu-toggle ${isOpen ? 'hidden' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span className="toggle-icon">☰</span>
      </button>

      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="admin-info-container">
            <div className="admin-avatar admin-logo-avatar" role="img" aria-label="BCT Logo">
              <img src={logoImg} alt="Bezuban Charitable Trust" />
            </div>
            <div className="admin-details">
              <span className="admin-name">{adminName}</span>
              <span className="admin-panel-label">Bezuban Charitable Trust</span>
            </div>
          </div>
          
          {/* Close button on top right - Always visible when sidebar is open on mobile */}
          {isMobile && (
            <button 
              className="sidebar-close" 
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav" aria-label="Main navigation">
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  aria-current={activePage === item.id ? 'page' : undefined}
                >
                  <span className="sidebar-label">{item.label}</span>
                  {activePage === item.id && (
                    <span className="active-dot" aria-hidden="true"></span>
                  )}
                </button>
              </li>
            ))}

            {/* Users section - admin only */}
            <li>
              <button
                className={`sidebar-item ${usersSubItems.some(s => s.id === activePage) ? 'active' : ''}`}
                onClick={() => setUsersExpanded(!usersExpanded)}
              >
                <span className="sidebar-label">Users</span>
                <span className="sidebar-arrow">{usersExpanded ? '▾' : '▸'}</span>
              </button>
              {usersExpanded && (
                <ul className="sidebar-submenu">
                  {usersSubItems.map((item) => (
                    <li key={item.id}>
                      <button
                        className={`sidebar-item sidebar-subitem ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => handleItemClick(item.id)}
                        aria-current={activePage === item.id ? 'page' : undefined}
                      >
                        <span className="sidebar-label">{item.label}</span>
                        {activePage === item.id && (
                          <span className="active-dot" aria-hidden="true"></span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="sidebar-logout" 
            onClick={handleLogoutClick}
            aria-label="Logout"
          >
            <span className="sidebar-icon" aria-hidden="true">🚪</span>
            <span className="sidebar-label">Logout</span>
            <span className="logout-hint">→</span>
          </button>
          
          {/* Version info */}
          <div className="sidebar-version">
            <span>v2.0.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar