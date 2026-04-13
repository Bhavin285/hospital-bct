import { useState, useEffect, useRef } from 'react'
import './AnimalView.css'
import PdfService from '../../utils/pdfService'
import trustLogo from '../../assets/images/logo.png'

const getCurrentDateTime = () => {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  let h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const time = `${String(h).padStart(2, '0')}:${m} ${ap}`
  return { date, time }
}

function AnimalView({ record, onBack }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  // ── Treatment history ────────────────────────────────────────
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // ── Treatment form ───────────────────────────────────────────
  const [form, setForm] = useState(() => ({ status: 're_open', ...getCurrentDateTime(), description: '', photo: null }))
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const photoRef = useRef(null)
  const formRef = useRef(null)

  // ── PDF download ─────────────────────────────────────────────
  const [logoBase64, setLogoBase64] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch(trustLogo)
        const blob = await res.blob()
        setLogoBase64(await PdfService.imageFileToBase64(blob))
      } catch {}
    }
    loadLogo()
  }, [])

  const buildViewPdf = async () => {
    let photoBase64 = null
    if (record.photo) {
      try {
        const res = await fetch(record.photo)
        const blob = await res.blob()
        photoBase64 = await PdfService.imageFileToBase64(blob)
      } catch {}
    }
    const formData = {
      tagNo: record.tagNo,
      name: record.name, mobile: record.mobile, address: record.address,
      animal_name: record.animalName, diagnosis: record.diagnosis,
      animal_injury: record.animalInjury, sex: record.sex,
      age: record.age, breed: record.breed, body_colour: record.bodyColor,
      date: record.date, time: record.time,
      present_dr: record.presentDoctor, present_staff: record.presentStaff,
    }
    return PdfService.generateViewPdf(formData, history, photoBase64, logoBase64)
  }

  const handleDownloadViewPdf = async () => {
    setPdfLoading('download')
    try {
      const pdf = await buildViewPdf()
      await PdfService.downloadPdf(pdf, `animal-${record.tagNo}-report.pdf`)
    } catch {
      showMsg('error', 'PDF generation failed.')
    } finally {
      setPdfLoading(null)
    }
  }

  const handleShareViewPdf = async () => {
    setPdfLoading('share')
    try {
      const pdf = await buildViewPdf()
      await PdfService.sharePdf(pdf, `animal-${record.tagNo}-report.pdf`, `Animal Report - ${record.animalName}`)
    } catch {
      showMsg('error', 'Share failed.')
    } finally {
      setPdfLoading(null)
    }
  }

  const handlePrintViewPdf = async () => {
    setPdfLoading('print')
    try {
      const pdf = await buildViewPdf()
      await PdfService.printPdf(pdf)
    } catch {
      showMsg('error', 'Print failed.')
    } finally {
      setPdfLoading(null)
    }
  }

  // ── Delete treatment ──────────────────────────────────────────
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/discharge_summary/${record.admit_id}/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `HTTP ${res.status}`) }
      setHistory(prev => prev.filter(e => e.id !== id))
      showMsg('success', 'Entry deleted.')
    } catch (err) {
      showMsg('error', err.message || 'Failed to delete entry.')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  // ── Lightbox ──────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState(null) // { src, name }

  const openLightbox = (src, name) => setLightbox({ src, name })
  const closeLightbox = () => setLightbox(null)

  const downloadPhoto = () => {
    if (!lightbox) return
    const a = document.createElement('a')
    a.href = lightbox.src
    a.download = `${lightbox.name || 'photo'}.jpg`
    a.click()
  }

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('authToken')
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTimeToAMPM = (t) => {
    if (!t) return ''
    if (t.includes('AM') || t.includes('PM')) return t
    const [h, m] = t.split(':')
    const hr = parseInt(h, 10)
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const convertTo24Hour = (t) => {
    if (!t || (!t.includes('AM') && !t.includes('PM'))) return t
    const [time, mod] = t.split(' ')
    let [h, m] = time.split(':')
    if (mod === 'PM' && h !== '12') h = parseInt(h) + 12
    if (mod === 'AM' && h === '12') h = '00'
    return `${String(h).padStart(2, '0')}:${m}`
  }

  const getStatusText = (s) => ({ re_open: 'Re-open', recover: 'Recover', release: 'Release', death: 'Death' }[s] || s)
  const getStatusClass = (s) => ({ re_open: 'av-status-reopen', recover: 'av-status-recover', release: 'av-status-release', death: 'av-status-death' }[s] || '')

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // ── Fetch history ─────────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/discharge_summary/${record.admit_id}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let items = Array.isArray(data) ? data : (data?.data || data?.items || [])
      const processed = items.map((item, i) => {
        let photoUrl = item.photo_url || item.photo || null
        if (photoUrl && typeof photoUrl === 'string' && !photoUrl.startsWith('data:image') && !photoUrl.startsWith('http'))
          photoUrl = `data:image/jpeg;base64,${photoUrl}`
        return {
          id: item.id || `h-${i}`,
          status: item.status,
          date: item.date || (item.created_at ? item.created_at.split('T')[0] : ''),
          time: item.time ? formatTimeToAMPM(item.time) : '',
          description: item.description,
          photo: photoUrl,
          created_at: item.created_at,
        }
      }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      setHistory(processed)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [record.admit_id])

  // ── Photo upload ──────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
      setForm(p => ({ ...p, photo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setForm({ status: 're_open', ...getCurrentDateTime(), description: '', photo: null })
    setPhotoPreview(null)
    if (photoRef.current) photoRef.current.value = ''
  }

  // ── Submit treatment ──────────────────────────────────────────
  const submitTreatment = async () => {
    if (!form.description.trim()) { showMsg('error', 'Description is required.'); return false }
    setSaving(true)
    try {
      const body = {
        tag_number: record.admit_id,
        status: form.status,
        description: form.description,
        created_by: localStorage.getItem('userId') || 'unknown',
        date: form.date,
        time: convertTo24Hour(form.time)
      }
      if (form.photo?.startsWith('data:image')) {
        body.photo = form.photo.split(',')[1]
      }
      const res = await fetch(`${API_BASE_URL}/discharge_summary`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `HTTP ${res.status}`) }
      await fetchHistory()
      return true
    } catch (err) {
      showMsg('error', err.message || 'Failed to save treatment.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const ok = await submitTreatment()
    if (ok) {
      showMsg('success', 'Treatment saved!')
      resetForm()
    }
  }

  const fields = [
    { label: 'Animal Name', value: record.animalName },
    { label: 'Breed', value: record.breed },
    { label: 'Body Colour', value: record.bodyColor },
    { label: 'Sex', value: record.sex ? record.sex.charAt(0).toUpperCase() + record.sex.slice(1) : '' },
    { label: 'Age', value: record.age },
    { label: 'Injury', value: record.animalInjury },
    { label: 'Admission Date', value: formatDate(record.date) },
    { label: 'Admission Time', value: record.time },
    { label: 'Diagnosis', value: record.diagnosis, full: true },
    { label: 'Owner Name', value: record.name },
    { label: 'Mobile', value: record.mobile },
    { label: 'Address', value: record.address, full: true },
    { label: 'Doctor', value: record.presentDoctor },
    { label: 'Staff', value: record.presentStaff },
  ]

  return (
    <div className="av-page">

      {/* Back bar */}
      <div className="av-topbar">
        <button className="av-back-btn" onClick={onBack}>← Back</button>
        <div className="av-topbar-title">
          <span className="av-tag-pill">#{record.tagNo}</span>
          <span className="av-topbar-name">{record.animalName}</span>
        </div>
      </div>

      {/* Message toast */}
      {message.text && (
        <div className={`av-message ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '!'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Animal info card ──────────────────────────────────── */}
      <div className="av-card">
        <div className="av-card-header">Animal Information</div>
        <div className="av-card-body">
          <div className="av-info-layout">
            {record.photo && (
              <div className="av-photo-wrap">
                <img
                  src={record.photo}
                  alt={record.animalName}
                  className="av-photo av-photo-clickable"
                  onClick={() => openLightbox(record.photo, record.animalName)}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}
            <div className="av-fields-grid">
              {fields.map(f => f.value ? (
                <div key={f.label} className={`av-field${f.full ? ' av-field-full' : ''}`}>
                  <span className="av-field-label">{f.label}</span>
                  <span className="av-field-value">{f.value}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Treatment Details form ────────────────── */}
      <div className="av-card" ref={formRef}>
        <div className="av-card-header">Treatment Details</div>
        <div className="av-card-body">
          <form onSubmit={handleSave}>

            {/* Row 1: Status | Date | Time */}
            <div className="av-form-row">
              <div className="av-form-field">
                <label className="av-form-label">Status</label>
                <select
                  className="av-form-select"
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="re_open">Re Open</option>
                  <option value="recover">Recover</option>
                  <option value="release">Release</option>
                  <option value="death">Death</option>
                </select>
              </div>
              <div className="av-form-field">
                <label className="av-form-label">Date</label>
                <input
                  type="date"
                  className="av-form-input"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
              <div className="av-form-field">
                <label className="av-form-label">Time</label>
                <input
                  className="av-form-input"
                  value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  placeholder="HH:MM AM/PM"
                />
              </div>
            </div>

            {/* Row 2: Description | Photo */}
            <div className="av-form-row av-form-row-media">
              <div className="av-form-field av-form-field-grow">
                <label className="av-form-label">Description / Details <span className="av-req">*</span></label>
                <textarea
                  className="av-form-textarea"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows="5"
                  placeholder="Treatment details, medications, observations..."
                  required
                />
              </div>
              <div className="av-form-field av-form-field-photo">
                <label className="av-form-label">Photo (optional)</label>
                <div className="av-photo-upload-box">
                  <input
                    type="file"
                    ref={photoRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="av-photo-file-input"
                    id="av-treatment-photo"
                  />
                  {photoPreview ? (
                    <div className="av-photo-preview-wrap">
                      <img src={photoPreview} alt="Preview" className="av-photo-preview-img" />
                      <button
                        type="button"
                        className="av-photo-remove-btn"
                        onClick={() => { setPhotoPreview(null); setForm(p => ({ ...p, photo: null })); if (photoRef.current) photoRef.current.value = '' }}
                      >×</button>
                    </div>
                  ) : (
                    <label htmlFor="av-treatment-photo" className="av-photo-upload-label">
                      <span className="av-photo-upload-icon">📷</span>
                      <span>Tap to upload photo</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="av-form-actions">
              <button type="submit" className="av-btn-save" disabled={saving}>
                {saving ? <><span className="av-spinner-sm"></span>Saving…</> : 'Save'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* ── Section 2: Treatment History ─────────────────────── */}
      <div className="av-timeline-section">
        <div className="av-timeline-heading">
          <span>Treatment History</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="av-timeline-count">{history.length} {history.length === 1 ? 'entry' : 'entries'}</span>
            <button className="av-pdf-download-btn" onClick={handleDownloadViewPdf} disabled={!!pdfLoading} title="Download PDF">
              {pdfLoading === 'download' ? '…' : '⬇ Download'}
            </button>
            <button className="av-pdf-share-btn" onClick={handleShareViewPdf} disabled={!!pdfLoading} title="Share PDF">
              {pdfLoading === 'share' ? '…' : '↗ Share'}
            </button>
            <button className="av-pdf-print-btn" onClick={handlePrintViewPdf} disabled={!!pdfLoading} title="Print PDF">
              {pdfLoading === 'print' ? '…' : '🖨 Print'}
            </button>
          </div>
        </div>

        {historyLoading ? (
          <div className="av-loading">
            <div className="av-spinner"></div>
            <span>Loading history…</span>
          </div>
        ) : history.length === 0 ? (
          <div className="av-empty">No treatment entries yet. Use the form above to add one.</div>
        ) : (
          <div className="av-history-list">
            {history.map((entry, idx) => (
              <div key={entry.id} className="av-history-item">
                {/* Left rail */}
                <div className="av-timeline-left">
                  <div className={`av-timeline-dot ${getStatusClass(entry.status)}`}></div>
                  {idx < history.length - 1 && <div className="av-timeline-line"></div>}
                </div>

                {/* Content: description left, photo right */}
                <div className="av-history-content">
                  <div className="av-history-meta">
                    <span className={`av-status-badge ${getStatusClass(entry.status)}`}>
                      {getStatusText(entry.status)}
                    </span>
                    <span className="av-entry-datetime">
                      {formatDate(entry.date)}{entry.time ? ` · ${entry.time}` : ''}
                    </span>
                    <div className="av-history-delete-wrap">
                      {confirmId === entry.id ? (
                        <>
                          <span className="av-delete-confirm-text">Delete?</span>
                          <button
                            className="av-delete-confirm-yes"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                          >{deletingId === entry.id ? '…' : 'Yes'}</button>
                          <button
                            className="av-delete-confirm-no"
                            onClick={() => setConfirmId(null)}
                          >No</button>
                        </>
                      ) : (
                        <button
                          className="av-delete-btn"
                          onClick={() => setConfirmId(entry.id)}
                          title="Delete entry"
                        >🗑</button>
                      )}
                    </div>
                  </div>
                  <div className="av-history-body">
                    <div className="av-history-desc">
                      <p>{entry.description}</p>
                    </div>
                    <div className="av-history-photo-col">
                      {entry.photo ? (
                        <img
                          src={entry.photo}
                          alt="Treatment"
                          className="av-history-photo av-photo-clickable"
                          onClick={() => openLightbox(entry.photo, `treatment-${formatDate(entry.date)}`)}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="av-history-photo-placeholder">
                          <span className="av-placeholder-icon">📷</span>
                          <span>No photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightbox && (
        <div className="av-lightbox-overlay" onClick={closeLightbox}>
          <div className="av-lightbox-box" onClick={e => e.stopPropagation()}>
            <button className="av-lightbox-close" onClick={closeLightbox}>×</button>
            <img src={lightbox.src} alt={lightbox.name} className="av-lightbox-img" />
            <div className="av-lightbox-footer">
              <button className="av-lightbox-download" onClick={downloadPhoto}>
                ↓ Download
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AnimalView
