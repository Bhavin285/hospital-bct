// LoginPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ mobile: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const savedMobile = localStorage.getItem('rememberedMobile')
    if (savedMobile) {
      setFormData(prev => ({ ...prev, mobile: savedMobile }))
      setRememberMe(true)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'mobile') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 10) }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.mobile || !formData.password) {
      setError('Please enter both mobile number and password.')
      return
    }
    if (formData.mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const userInfo = await login(formData.mobile, formData.password)
      if (rememberMe) {
        localStorage.setItem('rememberedMobile', formData.mobile)
      } else {
        localStorage.removeItem('rememberedMobile')
      }
      if (userInfo.role === 'admin') navigate('/admin')
      else navigate('/user')
    } catch {
      setError('Invalid mobile number or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* ── Left: Brand Panel ── */}
      <div className="brand-panel">
        <div className="brand-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        <div className="brand-content">
          <div className="brand-logo">🐾</div>
          <h1 className="brand-name">Bezubaan<br />Charitable Trust</h1>
          <p className="brand-tagline">Animal Care Management System</p>

          <div className="brand-features">
            <div className="brand-feature">
              <span className="feature-check">✦</span>
              <span>Track animal records &amp; history</span>
            </div>
            <div className="brand-feature">
              <span className="feature-check">✦</span>
              <span>Manage treatments &amp; diagnoses</span>
            </div>
            <div className="brand-feature">
              <span className="feature-check">✦</span>
              <span>Generate &amp; share reports instantly</span>
            </div>
          </div>
        </div>

        <p className="brand-footer">© 2026 Bezubaan Charitable Trusts</p>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="form-panel">
        <div className="login-card">

          {/* Mobile brand header */}
          <div className="mobile-brand">
            <span className="mobile-logo">🐾</span>
            <div>
              <h2 className="mobile-name">Bezubaan Charitable Trust</h2>
              <p className="mobile-tagline">Animal Care Management System</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {/* Mobile field */}
            <div className="field">
              <label className="field-label">Mobile Number</label>
              <div className="field-input-wrap">
                <span className="field-prefix">+91</span>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  disabled={loading}
                  className={`field-input has-prefix${error ? ' field-error' : ''}`}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={loading}
                  className={`field-input${error ? ' field-error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex="-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="options-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="remember-check"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>

          </form>

          <p className="card-footer">© 2026 Bezubaan Charitable Trusts. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
