import { useState, useEffect } from 'react'
import './Page.css'
import { fetchUsers, createUser, deleteUser, adminChangePassword } from '../../api/users'
import { useAuth } from '../../hooks/useAuth'

function CreateUser() {
  const currentUser = useAuth()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  })
  const [editFormData, setEditFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({
    passwordMatch: '',
    editPasswordMatch: '',
    apiError: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formKey, setFormKey] = useState(0)

  useEffect(() => { loadUsers() }, [])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const loadUsers = async () => {
    setApiLoading(true)
    try {
      const data = await fetchUsers()
      const transformed = data.map(u => ({
        id: u.username,
        username: u.username,
        name: u.username,
        mobileNo: u.username,
        role: u.role,
        enabled: u.enabled,
        createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'
      }))
      setUsers(transformed)
      setErrors(p => ({ ...p, apiError: '' }))
    } catch (err) {
      setErrors(p => ({ ...p, apiError: `Failed to fetch users: ${err.message}` }))
    } finally {
      setApiLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(p => ({ ...p, [name]: value }))
    if (name === 'password' || name === 'confirmPassword')
      setErrors(p => ({ ...p, passwordMatch: '' }))
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditFormData(p => ({ ...p, [name]: value }))
    if (name === 'password' || name === 'confirmPassword')
      setErrors(p => ({ ...p, editPasswordMatch: '' }))
  }

  const validatePasswords = (password, confirmPassword) => {
    if (password !== confirmPassword) return 'Passwords do not match'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const passErr = validatePasswords(formData.password, formData.confirmPassword)
    if (passErr) { setErrors(p => ({ ...p, passwordMatch: passErr })); return }
    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      setErrors(p => ({ ...p, passwordMatch: 'Please enter a valid 10-digit mobile number' })); return
    }
    setLoading(true)
    setErrors(p => ({ ...p, apiError: '' }))
    try {
      await createUser({ username: formData.mobile, password: formData.password, role: 'staff' })
      showSuccess('User created successfully!')
      setFormData({ username: '', mobile: '', password: '', confirmPassword: '' })
      setErrors({ passwordMatch: '', editPasswordMatch: '', apiError: '' })
      setShowModal(false)
      loadUsers()
    } catch (err) {
      setErrors(p => ({ ...p, apiError: err.message || 'Failed to create user' }))
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const passErr = validatePasswords(editFormData.password, editFormData.confirmPassword)
    if (passErr) { setErrors(p => ({ ...p, editPasswordMatch: passErr })); return }
    setEditLoading(true)
    try {
      await adminChangePassword(selectedUser.username, editFormData.password)
      showSuccess(`Password updated for ${selectedUser.name}!`)
      setEditFormData({ password: '', confirmPassword: '' })
      setErrors(p => ({ ...p, editPasswordMatch: '' }))
      setShowEditModal(false)
      setSelectedUser(null)
    } catch (err) {
      setErrors(p => ({ ...p, editPasswordMatch: err.message || 'Failed to update password' }))
    } finally {
      setEditLoading(false)
    }
  }

  const openModal = () => {
    setFormData({ username: '', mobile: '', password: '', confirmPassword: '' })
    setErrors({ passwordMatch: '', editPasswordMatch: '', apiError: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFormKey(k => k + 1)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setErrors(p => ({ ...p, apiError: '' }))
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditFormData({ password: '', confirmPassword: '' })
    setErrors(p => ({ ...p, editPasswordMatch: '' }))
    setShowEditPassword(false)
    setShowEditConfirmPassword(false)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    setEditFormData({ password: '', confirmPassword: '' })
    setErrors(p => ({ ...p, editPasswordMatch: '' }))
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await deleteUser(userId)
      setUsers(p => p.filter(u => u.id !== userId))
      showSuccess('User deleted successfully!')
    } catch {
      alert('Failed to delete user. Please try again.')
    }
  }

  const filteredUsers = users.filter(u => {
    const s = searchTerm.toLowerCase().trim()
    if (!s) return true
    if (/^\d+$/.test(s)) return u.mobileNo?.toString().includes(s)
    return u.name?.toLowerCase().includes(s) || u.role?.toLowerCase().includes(s)
  })

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="create-user-container">

      {/* Page header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">👥</span>
            User Management
          </h1>
          <p className="page-subtitle">Manage and monitor system users</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadUsers} disabled={apiLoading}>
            <span className="btn-icon">{apiLoading ? '⏳' : '↻'}</span>
            Refresh
          </button>
          <button className="create-btn" onClick={openModal}>
            <span className="btn-icon">+</span>
            Create User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total-users">👥</div>
          <div className="stat-content">
            <span className="stat-label">Total</span>
            <span className="stat-value">{users.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admin-users">👑</div>
          <div className="stat-content">
            <span className="stat-label">Admins</span>
            <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon staff-users">👤</div>
          <div className="stat-content">
            <span className="stat-label">Staff</span>
            <span className="stat-value">{users.filter(u => u.role === 'staff').length}</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errors.apiError && (
        <div className="error-banner">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <strong>Error</strong>
            <p>{errors.apiError}</p>
          </div>
          <button className="banner-btn" onClick={loadUsers}>Retry</button>
        </div>
      )}

      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, mobile or role..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '1rem' }}
        />
      </div>

      {/* Users table/card */}
      <div className="users-grid-container">
        {apiLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading users…</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <>
            {/* Desktop table */}
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Mobile Number</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="table-row">
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-small">{getInitials(user.name)}</div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="mobile-number">{user.mobileNo}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    </td>
                    <td>{user.createdAt}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => openEditModal(user)} title="Change Password">✏️</button>
                        {user.role !== 'admin' && (
                          <button className="action-btn delete" onClick={() => handleDeleteUser(user.id)} title="Delete User">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No users found</h3>
            <p>{searchTerm ? `No users matching "${searchTerm}"` : 'Get started by creating your first user'}</p>
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>Clear Search</button>
            )}
          </div>
        )}
      </div>

      {/* Table footer */}
      {filteredUsers.length > 0 && (
        <div className="table-footer">
          <div className="records-info">
            Showing <strong style={{ margin: '0 3px', color: '#4f46e5' }}>{filteredUsers.length}</strong> of <strong style={{ margin: '0 3px', color: '#4f46e5' }}>{users.length}</strong> users
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content create-modal" style={{ maxWidth: '80vw', width: '80vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="modal-icon">+</span> Create New User</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form key={formKey} onSubmit={handleSubmit} className="create-form" autoComplete="off">

              {/* User info */}
              <div className="form-section">
                <h3><span className="section-icon">📋</span> User Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username <span className="required">*</span></label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="Enter username"
                      className="form-input"
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      required
                      placeholder="10-digit mobile number"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      className="form-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="form-section">
                <h3><span className="section-icon">🔒</span> Security</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Password <span className="required">*</span></label>
                    <div className="password-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Min. 6 characters"
                        className="form-input"
                        minLength="6"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password <span className="required">*</span></label>
                    <div className="password-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                        className={`form-input ${errors.passwordMatch ? 'error' : ''}`}
                        minLength="6"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(p => !p)}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                </div>

                {errors.passwordMatch && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {errors.passwordMatch}
                  </div>
                )}

                {errors.apiError && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {errors.apiError}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !formData.username || !formData.mobile || !formData.password || !formData.confirmPassword}
                >
                  {loading ? <><span className="spinner"></span>Saving…</> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Password Modal ── */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" style={{ maxWidth: '80vw', width: '80vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><span className="modal-icon">✏️</span> Update Password</h2>
              <button className="modal-close" onClick={closeEditModal}>×</button>
            </div>

            <form onSubmit={handleEditSubmit} className="create-form">

              {/* User info card */}
              <div className="user-info-card">
                <div className="user-avatar-large">{getInitials(selectedUser.name)}</div>
                <div className="user-details">
                  <h3 className="user-fullname">{selectedUser.name}</h3>
                  <div className="user-meta">
                    <span className="meta-item">
                      <span className="meta-icon">📱</span>
                      {selectedUser.mobileNo}
                    </span>
                    <span className="meta-item">
                      <span className={`role-badge-small role-${selectedUser.role}`}>{selectedUser.role}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* New password */}
              <div className="form-section">
                <h3><span className="section-icon">🔒</span> New Password</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>New Password <span className="required">*</span></label>
                    <div className="password-wrapper">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        name="password"
                        value={editFormData.password}
                        onChange={handleEditChange}
                        required
                        placeholder="Min. 6 characters"
                        className="form-input"
                        minLength="6"
                        disabled={editLoading}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowEditPassword(p => !p)}>
                        {showEditPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password <span className="required">*</span></label>
                    <div className="password-wrapper">
                      <input
                        type={showEditConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={editFormData.confirmPassword}
                        onChange={handleEditChange}
                        required
                        placeholder="Confirm new password"
                        className={`form-input ${errors.editPasswordMatch ? 'error' : ''}`}
                        minLength="6"
                        disabled={editLoading}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowEditConfirmPassword(p => !p)}>
                        {showEditConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                </div>

                {errors.editPasswordMatch && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {errors.editPasswordMatch}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={editLoading || !editFormData.password || !editFormData.confirmPassword}
                >
                  {editLoading ? <><span className="spinner"></span>Saving…</> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default CreateUser
