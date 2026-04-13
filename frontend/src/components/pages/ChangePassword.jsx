// ChangePassword.jsx
import { useState, useEffect } from 'react'
import './ChangePassword.css'
import { cognitoChangePassword } from '../../api/cognito'
import { useAuth } from '../../hooks/useAuth'

function ChangePassword() {
  const userData = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Calculate password strength
  useEffect(() => {
    if (!formData.newPassword) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    const password = formData.newPassword

    if (password.length >= 6) strength += 25
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 15
    if (/[a-z]/.test(password)) strength += 15
    if (/[0-9]/.test(password)) strength += 10
    if (/[^A-Za-z0-9]/.test(password)) strength += 10

    setPasswordStrength(Math.min(strength, 100))
  }, [formData.newPassword])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    
    if (message.text) {
      setMessage({ type: '', text: '' })
    }
  }

  const validateForm = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' })
      return false
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return false
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return false
    }

    if (formData.newPassword === formData.currentPassword) {
      setMessage({ type: 'error', text: 'New password must be different' })
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (!userData) {
      setMessage({ type: 'error', text: 'User not authenticated. Please login again.' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await cognitoChangePassword(formData.currentPassword, formData.newPassword)
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      const code = error.code || error.name || ''
      const msg = code === 'NotAuthorizedException'
        ? 'Current password is incorrect'
        : code === 'InvalidPasswordException'
          ? 'Password does not meet requirements (min 6 characters)'
          : error.message || 'Failed to change password'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  // Get password strength color and text
  const getStrengthInfo = () => {
    if (passwordStrength < 30) return { color: '#ef4444', text: 'Weak' }
    if (passwordStrength < 60) return { color: '#f59e0b', text: 'Fair' }
    if (passwordStrength < 80) return { color: '#3b82f6', text: 'Good' }
    return { color: '#10b981', text: 'Strong' }
  }

  // Get user initials
  const getUserInitials = () => {
    if (!userData?.username) return 'U'
    return userData.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const strengthInfo = getStrengthInfo()

  return (
    <div className="cp-container">
      {/* Big Header */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-icon-large">
            <span className="cp-icon-emoji">🔒</span>
          </div>
          <div className="cp-title-wrapper">
            <h1 className="cp-title-large">Change Password</h1>
            <p className="cp-subtitle-large"></p>
          </div>
        </div>
        
        {/* Large User Profile Card */}
        {userData && (
          <div className={`cp-user-card ${userData.role}`}>
            <div className="cp-user-avatar-large">
              {getUserInitials()}
            </div>
            <div className="cp-user-info">
              <span className="cp-user-name-large">{userData.username}</span>
              <div className="cp-user-meta">
                <span className={`cp-role-badge-large ${userData.role}`}>
                  {userData.role}
                </span>
                <span className="cp-user-id">ID: {userData.user_id?.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Big Form Card */}
      <div className="cp-card-large">
        {/* Message Banner */}
        {message.text && (
          <div className={`cp-message-large ${message.type}`}>
            <span className="cp-message-icon-large">{message.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="cp-message-text-large">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="cp-form-large">
          {/* Current Password */}
          <div className="cp-field-large">
            <label className="cp-label-large">
              <span className="cp-label-icon">🔐</span>
              Current Password
              <span className="cp-required">*</span>
            </label>
            <div className="cp-input-wrapper-large">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                disabled={loading}
                className={`cp-input-large ${message.text?.includes('incorrect') ? 'error' : ''}`}
              />
              <button
                type="button"
                className="cp-toggle-large"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex="-1"
              >
                {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {userData?.role === 'staff' && (
              <div className="cp-field-hint">
                <span className="hint-icon">ℹ️</span>
                Current password is required for staff users
              </div>
            )}
          </div>

          {/* New Password */}
          <div className="cp-field-large">
            <label className="cp-label-large">
              <span className="cp-label-icon">🔒</span>
              New Password
              <span className="cp-required">*</span>
            </label>
            <div className="cp-input-wrapper-large">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password"
                disabled={loading}
                className="cp-input-large"
              />
              <button
                type="button"
                className="cp-toggle-large"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex="-1"
              >
                {showNewPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {/* Password Strength Meter */}
            {formData.newPassword && (
              <div className="cp-strength-large">
                <div className="cp-strength-bar-large">
                  <div 
                    className="cp-strength-fill-large" 
                    style={{ 
                      width: `${passwordStrength}%`,
                      backgroundColor: strengthInfo.color
                    }}
                  ></div>
                </div>
                <span className="cp-strength-text-large" style={{ color: strengthInfo.color }}>
                  {strengthInfo.text}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="cp-field-large">
            <label className="cp-label-large">
              <span className="cp-label-icon">✓</span>
              Confirm Password
              <span className="cp-required">*</span>
            </label>
            <div className="cp-input-wrapper-large">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                disabled={loading}
                className={`cp-input-large ${
                  formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'error' : ''
                }`}
              />
              <button
                type="button"
                className="cp-toggle-large"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="cp-match-large">
                <span className={formData.newPassword === formData.confirmPassword ? 'valid' : 'invalid'}>
                  {formData.newPassword === formData.confirmPassword ? '✓' : '✗'} 
                  {formData.newPassword === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}
          </div>

          {/* Password Requirements */}
          {formData.newPassword && (
            <div className="cp-requirements-large">
              <div className="cp-req-title">Password Requirements:</div>
              <div className="cp-req-grid">
                <div className={`cp-req-item ${formData.newPassword.length >= 6 ? 'valid' : ''}`}>
                  <span className="cp-req-icon">
                    {formData.newPassword.length >= 6 ? '✅' : '○'}
                  </span>
                  <span className="cp-req-text">At least 6 characters</span>
                </div>
                <div className={`cp-req-item ${/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}`}>
                  <span className="cp-req-icon">
                    {/[A-Z]/.test(formData.newPassword) ? '✅' : '○'}
                  </span>
                  <span className="cp-req-text">Uppercase letter</span>
                </div>
                <div className={`cp-req-item ${/[0-9]/.test(formData.newPassword) ? 'valid' : ''}`}>
                  <span className="cp-req-icon">
                    {/[0-9]/.test(formData.newPassword) ? '✅' : '○'}
                  </span>
                  <span className="cp-req-text">Number</span>
                </div>
                <div className={`cp-req-item ${/[^A-Za-z0-9]/.test(formData.newPassword) ? 'valid' : ''}`}>
                  <span className="cp-req-icon">
                    {/[^A-Za-z0-9]/.test(formData.newPassword) ? '✅' : '○'}
                  </span>
                  <span className="cp-req-text">Special character</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="cp-actions-large">
            <button 
              type="button" 
              className="cp-btn-large cp-btn-secondary"
              onClick={() => {
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                setMessage({ type: '', text: '' })
              }}
              disabled={loading}
            >
              <span className="btn-icon">🔄</span>
              Clear Form
            </button>
            <button 
              type="submit" 
              className="cp-btn-large cp-btn-primary"
              disabled={loading || !userData}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="btn-icon">✓</span>
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword