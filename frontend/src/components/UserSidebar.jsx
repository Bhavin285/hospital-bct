// UserSidebar.jsx
import React, { useState, useEffect } from 'react'
import './UserSidebar.css'
import logoImg from '../assets/images/logo.png'

function UserSidebar({ activePage, setActivePage, onLogout, userName }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const menuItems = [
    { id: 'dashboard', label: 'Registration' },
    { id: 'records', label: 'Animal Records' },
  ]

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleItemClick = (itemId) => {
    setActivePage(itemId)
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  const handleLogoutClick = () => {
    onLogout()
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  const getAvatarLetter = () => {
    return userName ? userName.charAt(0).toUpperCase() : 'U'
  }

  const getAvatarGradient = () => {
    const gradients = [
      'linear-gradient(135deg, #4F46E5, #7C3AED)',
      'linear-gradient(135deg, #059669, #10B981)',
      'linear-gradient(135deg, #DC2626, #EF4444)',
      'linear-gradient(135deg, #D97706, #F59E0B)',
      'linear-gradient(135deg, #7C3AED, #C026D3)'
    ]
    const index = (userName?.length || 0) % gradients.length
    return gradients[index]
  }

  return (
    <>
      {isMobile && (
        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'hidden' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      <aside className={`user-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-gradient"></div>
        
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar-wrapper user-logo-avatar">
              <img src={logoImg} alt="Bezuban Charitable Trust" />
            </div>
            <div className="user-details">
              <span className="user-greeting">Welcome back,</span>
              <span className="user-name">{userName || 'User'}</span>
              <span className="user-role">Bezuban Charitable Trust</span>
            </div>
          </div>
          
          {/* Close button on top right - Only visible on mobile when sidebar is open */}
          {isMobile && isMobileMenuOpen && (
            <button 
              className="sidebar-close" 
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  aria-current={activePage === item.id ? 'page' : undefined}
                >
                  <span className="nav-label">{item.label}</span>
                  {activePage === item.id && (
                    <span className="active-indicator"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-content">
            <button className="logout-btn" onClick={handleLogoutClick}>
              <div className="logout-icon-wrapper">
                <span className="nav-icon">🚪</span>
              </div>
              <span className="nav-label">Logout</span>
              <span className="logout-hint">→</span>
            </button>
            
            <div className="app-version">
              <span>v2.0.0</span>
            </div>
          </div>
        </div>
      </aside>

      {isMobile && isMobileMenuOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </>
  )
}

export default UserSidebar