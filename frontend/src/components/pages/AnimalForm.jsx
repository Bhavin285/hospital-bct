import React, { useState, useEffect, useRef } from 'react'
import './AnimalForm.css'
import PdfService from '../../utils/pdfService'
import trustLogo from '../../assets/images/logo.png'
import { createAnimal, updateAnimal } from '../../api/animals'
import { useAuth } from '../../hooks/useAuth'

function Dashboard({ editData = null, onBack = null }) {
  const userData = useAuth()
  const isEditMode = !!editData

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    animal_name: '',
    diagnosis: '',
    date: '',
    animal_injury: '',
    sex: 'unknown',
    age: '',
    body_colour: '',
    breed: '',
    photo: null,
    time: '',
    present_dr: '',
    present_staff: '',
    created_by: ''
  })

  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [submittedTagNo, setSubmittedTagNo] = useState('')
  const [submittedFormData, setSubmittedFormData] = useState(null)
  const [submittedPhotoPreview, setSubmittedPhotoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [logoBase64, setLogoBase64] = useState(null)

  const fileInputRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(trustLogo)
        const blob = await response.blob()
        const base64 = await PdfService.imageFileToBase64(blob)
        setLogoBase64(base64)
      } catch {
        try {
          const base64 = await PdfService.loadLocalImageAsBase64('/logo.png')
          if (base64) setLogoBase64(base64)
        } catch {}
      }
    }
    loadLogo()
  }, [])

  const getCurrentDate = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  const getCurrentTime12Hour = () => {
    const now = new Date()
    let hours = now.getHours()
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
  }

  const convertTo12Hour = (time24) => {
    if (!time24) return ''
    if (time24.includes('AM') || time24.includes('PM')) return time24
    const [hours, minutes] = time24.split(':')
    let hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${String(hour).padStart(2, '0')}:${minutes} ${ampm}`
  }

  const convertTo24Hour = (time12) => {
    if (!time12) return ''
    if (!time12.includes('AM') && !time12.includes('PM')) return time12
    const [time, modifier] = time12.split(' ')
    let [hours, minutes] = time.split(':')
    if (modifier === 'PM' && hours !== '12') hours = parseInt(hours) + 12
    if (modifier === 'AM' && hours === '12') hours = '00'
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }

  const handleTimeChange = (e) => {
    let value = e.target.value
    if (value && !value.includes('AM') && !value.includes('PM') && value.includes(':')) {
      value = convertTo12Hour(value)
    }
    setFormData(prev => ({ ...prev, time: value }))
    if (fieldErrors.time) setFieldErrors(prev => ({ ...prev, time: '' }))
  }

  useEffect(() => {
    if (isEditMode && editData) {
      setFormData({
        name: editData.name || '',
        mobile: editData.mobile || '',
        address: editData.address || '',
        animal_name: editData.animalName || '',
        diagnosis: editData.diagnosis || '',
        date: editData.date || getCurrentDate(),
        animal_injury: editData.animalInjury || '',
        sex: editData.sex || '',
        age: editData.age || '',
        body_colour: editData.bodyColor || '',
        breed: editData.breed || '',
        photo: null,
        time: convertTo12Hour(editData.originalTime || editData.time) || getCurrentTime12Hour(),
        present_dr: editData.presentDoctor || '',
        present_staff: editData.presentStaff || '',
        created_by: editData.created_by || userData?.user_id || 'unknown'
      })
      if (editData.photo) setPhotoPreview(typeof editData.photo === 'string' ? editData.photo : null)
    } else {
      setFormData(prev => ({
        ...prev,
        created_by: userData?.user_id || userData?.username || 'unknown',
        date: getCurrentDate(),
        time: getCurrentTime12Hour()
      }))
    }
  }, [isEditMode])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handlePhotoChange = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, photo: 'File size should be less than 5MB' }))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setFieldErrors(prev => ({ ...prev, photo: 'Please select a valid image file (JPEG, PNG, GIF, WEBP)' }))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFieldErrors(prev => ({ ...prev, photo: '' }))
    setFormData(prev => ({ ...prev, photo: file }))
    const reader = new FileReader()
    reader.onloadstart = () => setUploadProgress(10)
    reader.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90 + 10))
    }
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 500)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const convertPhotoToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  const resetForm = () => {
    setFormData({
      name: '', mobile: '', address: '', animal_name: '', diagnosis: '',
      date: getCurrentDate(), animal_injury: '', sex: 'unknown', age: '', body_colour: '',
      breed: '', photo: null, time: getCurrentTime12Hour(), present_dr: '',
      present_staff: '', created_by: userData?.user_id || 'unknown'
    })
    setPhotoPreview(null)
    setFieldErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadProgress(0)
  }

  const scrollToField = (fieldName) => {
    const el = formRef.current?.querySelector(`[name="${fieldName}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => el.focus(), 300)
    }
  }

  const validateForm = () => {
    const errors = {}
    const requiredFields = [
      'name', 'mobile', 'address', 'animal_name',
      'diagnosis', 'date', 'animal_injury', 'age',
      'body_colour', 'breed', 'time', 'present_dr', 'present_staff'
    ]
    requiredFields.forEach(field => {
      const value = formData[field]
      if (!value || value.toString().trim() === '') {
        errors[field] = 'This field is required'
      }
    })
    if (!errors.mobile && !/^[0-9]{10}$/.test(formData.mobile)) {
      errors.mobile = 'Enter a valid 10-digit mobile number'
    }
    if (!errors.time && !/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(formData.time)) {
      errors.time = 'Format: HH:MM AM/PM (e.g., 02:30 PM)'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0]
      scrollToField(firstField)
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const requestBody = {
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        animal_name: formData.animal_name,
        diagnosis: formData.diagnosis,
        date: formData.date,
        animal_injury: formData.animal_injury,
        sex: formData.sex.charAt(0).toUpperCase() + formData.sex.slice(1),
        age: formData.age,
        body_colour: formData.body_colour,
        breed: formData.breed,
        time: convertTo24Hour(formData.time),
        present_dr: formData.present_dr,
        present_staff: formData.present_staff,
        created_by: formData.created_by || userData?.user_id || 'unknown',
        release_place_date: ''
      }
      if (formData.photo) {
        requestBody.photo = await convertPhotoToBase64(formData.photo)
      }

      if (isEditMode) {
        await updateAnimal(editData.tagNo, requestBody)
        if (onBack) onBack()
      } else {
        const responseData = await createAnimal(requestBody)
        const tagNo = responseData.tag_number || responseData.tag_no || responseData.admit_id || 'N/A'
        setSubmittedTagNo(tagNo)
        setSubmittedFormData({ ...formData, tagNo })
        setSubmittedPhotoPreview(photoPreview)
        setShowSuccessPopup(true)
        resetForm()
      }
    } catch (error) {
      setFieldErrors({ _submit: error.message || 'Failed to submit. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false)
    setSubmittedTagNo('')
    setSubmittedFormData(null)
    setSubmittedPhotoPreview(null)
  }

  const handleSuccessDownload = async () => {
    if (!submittedFormData) return
    setPdfLoading(true)
    try {
      const pdf = await PdfService.generateAdmissionPdf(submittedFormData, submittedPhotoPreview, logoBase64)
      await PdfService.downloadPdf(pdf, `animal-${submittedFormData.tagNo}.pdf`)
    } catch (err) {
      console.error('PDF failed:', err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSuccessShare = async () => {
    if (!submittedFormData) return
    setPdfLoading(true)
    try {
      const pdf = await PdfService.generateAdmissionPdf(submittedFormData, submittedPhotoPreview, logoBase64)
      await PdfService.sharePdf(pdf, `animal-${submittedFormData.tagNo}.pdf`, `Animal - ${submittedFormData.animal_name}`)
    } catch (err) {
      console.error('PDF failed:', err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSuccessPrint = async () => {
    if (!submittedFormData) return
    setPdfLoading(true)
    try {
      const pdf = await PdfService.generateAdmissionPdf(submittedFormData, submittedPhotoPreview, logoBase64)
      await PdfService.printPdf(pdf)
    } catch (err) {
      console.error('PDF failed:', err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const triggerFileInput = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleRemovePhoto = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setPhotoPreview(null)
    setFormData(prev => ({ ...prev, photo: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const fc = (name) => fieldErrors[name] ? 'reg-input field-error' : 'reg-input'
  const fct = (name) => fieldErrors[name] ? 'reg-textarea field-error' : 'reg-textarea'

  return (
    <div className="reg-page">
      <div className="reg-header">
        <div>
          {isEditMode && onBack && (
            <button className="reg-back-btn" onClick={onBack} type="button">
              ← Back to Records
            </button>
          )}
          <h1 className="reg-title">{isEditMode ? 'Edit Animal Details' : 'Animal Registration'}</h1>
          <p className="reg-subtitle">
            {isEditMode
              ? `Editing record — Tag #${editData?.tagNo}`
              : 'Fill in all required details to register an animal'}
          </p>
        </div>
      </div>

      {fieldErrors._submit && (
        <div className="reg-message error">
          <span className="reg-msg-icon">!</span>
          <span>{fieldErrors._submit}</span>
          <button className="reg-msg-close" onClick={() => setFieldErrors(p => ({ ...p, _submit: '' }))}>×</button>
        </div>
      )}

      <div className="reg-card">
        <form className="reg-form" onSubmit={handleSubmit} ref={formRef}>

          {/* ── OWNER INFORMATION ── */}
          <div className="reg-section">
            <div className="reg-section-header owner-header">
              <span className="reg-section-dot"></span>
              <span>OWNER INFORMATION</span>
            </div>
            <div className="owner-layout">
              <div className="owner-fields">
                <div className="reg-row">
                  <div className="reg-field">
                    <label className="reg-label">Name <span className="req">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Owner's full name"
                      disabled={loading}
                      className={fc('name')}
                    />
                    {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
                  </div>
                  <div className="reg-field">
                    <label className="reg-label">Mobile No. <span className="req">*</span></label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      maxLength="10"
                      disabled={loading}
                      className={fc('mobile')}
                    />
                    {fieldErrors.mobile && <span className="field-error-text">{fieldErrors.mobile}</span>}
                  </div>
                </div>
                <div className="reg-row">
                  <div className="reg-field full">
                    <label className="reg-label">Address <span className="req">*</span></label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Complete address"
                      disabled={loading}
                      className={fct('address')}
                      rows="3"
                    />
                    {fieldErrors.address && <span className="field-error-text">{fieldErrors.address}</span>}
                  </div>
                </div>
              </div>
              <div className="photo-panel">
                <label className="reg-label">Animal Photo</label>
                <div className={`photo-upload ${fieldErrors.photo ? 'field-error' : ''}`} onClick={triggerFileInput}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    capture="environment"
                    onChange={handlePhotoChange}
                    onClick={(e) => e.stopPropagation()}
                    disabled={loading}
                    className="photo-file-input"
                  />
                  {photoPreview ? (
                    <div className="photo-preview-box">
                      <img src={photoPreview} alt="Preview" />
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={handleRemovePhoto}
                        disabled={loading}
                      >×</button>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="photo-progress">
                          <div className="photo-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="photo-placeholder">
                      <span className="photo-icon">📷</span>
                      <span>Tap to upload</span>
                      <span className="photo-hint">JPG, PNG (Max 5MB)</span>
                    </div>
                  )}
                </div>
                {fieldErrors.photo && <span className="field-error-text">{fieldErrors.photo}</span>}
              </div>
            </div>
          </div>

          {/* ── ANIMAL INFORMATION ── */}
          <div className="reg-section">
            <div className="reg-section-header animal-header">
              <span className="reg-section-dot"></span>
              <span>ANIMAL INFORMATION</span>
            </div>

            {/* Row 1: Animal Name | Breed */}
            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Animal Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="animal_name"
                  value={formData.animal_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Cow, Dog, Cat"
                  disabled={loading}
                  className={fc('animal_name')}
                />
                {fieldErrors.animal_name && <span className="field-error-text">{fieldErrors.animal_name}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Breed <span className="req">*</span></label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  placeholder="Enter breed"
                  disabled={loading}
                  className={fc('breed')}
                />
                {fieldErrors.breed && <span className="field-error-text">{fieldErrors.breed}</span>}
              </div>
            </div>

            {/* Row 2: Body Colour | Sex */}
            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Body Colour <span className="req">*</span></label>
                <input
                  type="text"
                  name="body_colour"
                  value={formData.body_colour}
                  onChange={handleInputChange}
                  placeholder="e.g., Brown, Black, White"
                  disabled={loading}
                  className={fc('body_colour')}
                />
                {fieldErrors.body_colour && <span className="field-error-text">{fieldErrors.body_colour}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Sex</label>
                <div className={`reg-radio-group ${fieldErrors.sex ? 'field-error' : ''}`}>
                  <label className="reg-radio">
                    <input
                      type="radio"
                      name="sex"
                      value="unknown"
                      checked={formData.sex === 'unknown'}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    <span>Unknown</span>
                  </label>
                  <label className="reg-radio">
                    <input
                      type="radio"
                      name="sex"
                      value="male"
                      checked={formData.sex === 'male'}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    <span>Male</span>
                  </label>
                  <label className="reg-radio">
                    <input
                      type="radio"
                      name="sex"
                      value="female"
                      checked={formData.sex === 'female'}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    <span>Female</span>
                  </label>
                </div>
                {fieldErrors.sex && <span className="field-error-text">{fieldErrors.sex}</span>}
              </div>
            </div>

            {/* Row 3: Age | Animal Injury */}
            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Age <span className="req">*</span></label>
                <input
                  type="text"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="e.g., 2 years, 3 months"
                  disabled={loading}
                  className={fc('age')}
                />
                {fieldErrors.age && <span className="field-error-text">{fieldErrors.age}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Animal Injury <span className="req">*</span></label>
                <input
                  type="text"
                  name="animal_injury"
                  value={formData.animal_injury}
                  onChange={handleInputChange}
                  placeholder="Type of injury"
                  disabled={loading}
                  className={fc('animal_injury')}
                />
                {fieldErrors.animal_injury && <span className="field-error-text">{fieldErrors.animal_injury}</span>}
              </div>
            </div>

            {/* Row 4: Admission Date | Admission Time */}
            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Admission Date <span className="req">*</span></label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={fc('date')}
                />
                {fieldErrors.date && <span className="field-error-text">{fieldErrors.date}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Admission Time <span className="req">*</span></label>
                <input
                  type="text"
                  name="time"
                  value={formData.time}
                  onChange={handleTimeChange}
                  placeholder="HH:MM AM/PM"
                  title="Format: HH:MM AM/PM (e.g., 02:30 PM)"
                  disabled={loading}
                  className={fc('time')}
                />
                <small className="reg-hint">e.g., 02:30 PM</small>
                {fieldErrors.time && <span className="field-error-text">{fieldErrors.time}</span>}
              </div>
            </div>

            {/* Row 5: Diagnosis */}
            <div className="reg-row">
              <div className="reg-field full">
                <label className="reg-label">Diagnosis <span className="req">*</span></label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="Enter detailed diagnosis"
                  disabled={loading}
                  className={fct('diagnosis')}
                  rows="3"
                />
                {fieldErrors.diagnosis && <span className="field-error-text">{fieldErrors.diagnosis}</span>}
              </div>
            </div>
          </div>

          {/* ── DOCTOR & STAFF ── */}
          <div className="reg-section">
            <div className="reg-section-header doctor-header">
              <span className="reg-section-dot"></span>
              <span>DOCTOR &amp; STAFF</span>
            </div>
            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Present Doctor <span className="req">*</span></label>
                <input
                  type="text"
                  name="present_dr"
                  value={formData.present_dr}
                  onChange={handleInputChange}
                  placeholder="Doctor's name"
                  disabled={loading}
                  className={fc('present_dr')}
                />
                {fieldErrors.present_dr && <span className="field-error-text">{fieldErrors.present_dr}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Present Staff <span className="req">*</span></label>
                <input
                  type="text"
                  name="present_staff"
                  value={formData.present_staff}
                  onChange={handleInputChange}
                  placeholder="Staff name"
                  disabled={loading}
                  className={fc('present_staff')}
                />
                {fieldErrors.present_staff && <span className="field-error-text">{fieldErrors.present_staff}</span>}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="reg-actions">
            <button type="submit" className="reg-btn submit-btn" disabled={loading}>
              {loading
                ? <><span className="reg-spinner"></span>{isEditMode ? 'Saving...' : 'Submitting...'}</>
                : isEditMode ? 'Save' : 'Submit'
              }
            </button>
          </div>

        </form>
      </div>

      {/* Success Modal */}
      {showSuccessPopup && (
        <div className="reg-modal-overlay" onClick={closeSuccessPopup}>
          <div className="reg-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-header">
              <div className="success-check">✓</div>
              <h2>Registration Successful!</h2>
              <button className="success-close" onClick={closeSuccessPopup}>×</button>
            </div>
            <div className="success-modal-body">
              <p>Animal has been registered successfully</p>
              <div className="tag-display">
                <span className="tag-label">Tag Number</span>
                <span className="tag-value">{submittedTagNo}</span>
              </div>
              <p className="tag-note">Please save this tag number for future reference</p>
            </div>
            <div className="success-modal-pdf">
              <p className="pdf-section-label">Print / Download Admission Form</p>
              <div className="pdf-action-btns">
                <button className="pdf-action-btn pdf-download" onClick={handleSuccessDownload} disabled={pdfLoading}>
                  {pdfLoading ? <><span className="reg-spinner"></span>Wait…</> : 'Download PDF'}
                </button>
                <button className="pdf-action-btn pdf-share" onClick={handleSuccessShare} disabled={pdfLoading}>
                  {pdfLoading ? <><span className="reg-spinner"></span>Wait…</> : 'Share PDF'}
                </button>
                <button className="pdf-action-btn pdf-print" onClick={handleSuccessPrint} disabled={pdfLoading}>
                  {pdfLoading ? <><span className="reg-spinner"></span>Wait…</> : 'Print'}
                </button>
              </div>
            </div>
            <div className="success-modal-footer">
              <button className="success-ok-btn" onClick={closeSuccessPopup}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
