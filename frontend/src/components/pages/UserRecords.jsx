import { useState, useEffect } from 'react'
import './AnimalRecords.css'
import PdfService from '../../utils/pdfService'
import trustLogo from '../../assets/images/logo.png'

function UserRecords({ setActivePage, onViewAnimal }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  // ── Data state ──────────────────────────────────────────────
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredData, setFilteredData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ from_date: '', to_date: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const itemsPerPage = 20

  // ── Message state ────────────────────────────────────────────
  const [message, setMessage] = useState({ type: '', text: '' })

  // ── PDF state ────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false)
  const [activePdfId, setActivePdfId] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [logoBase64, setLogoBase64] = useState(null)

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

  useEffect(() => {
    const handleClick = () => setActivePdfId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // ── Helpers ──────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('authToken')
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const formatTimeToAMPM = (t) => {
    if (!t) return ''
    if (t.includes('AM') || t.includes('PM')) return t
    const [h, m] = t.split(':')
    const hr = parseInt(h, 10)
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const getImageUrl = (photo) => {
    if (!photo) return null
    if (typeof photo === 'string' && photo.startsWith('data:image')) return photo
    if (typeof photo === 'string' && (photo.startsWith('http://') || photo.startsWith('https://'))) return photo
    if (typeof photo === 'string') return `${API_BASE_URL}${photo.startsWith('/') ? photo : '/' + photo}`
    return null
  }

  // ── Fetch animals ─────────────────────────────────────────────
  const fetchAnimals = async (params = {}) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.append('page', params.page || currentPage)
      q.append('pageSize', itemsPerPage)
      if (params.from_date) q.append('from_date', params.from_date)
      if (params.to_date) q.append('to_date', params.to_date)
      if (params.search) q.append('search', params.search)

      const res = await fetch(`${API_BASE_URL}/admit_form?${q}`, { headers: getAuthHeaders() })
      if (res.status === 401) { showMsg('error', 'Session expired. Please login again.'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      let records = [], total = 0, pages = 0
      if (data?.data && Array.isArray(data.data)) {
        records = data.data
        total = data.pagination?.totalRecords || records.length
        pages = data.pagination?.totalPages || 1
      } else if (Array.isArray(data)) {
        records = data; total = records.length; pages = Math.ceil(total / itemsPerPage)
      }

      const transformed = records.map((r, i) => ({
        id: r.tag_number ? String(r.tag_number) : `tmp-${i}`,
        tagNo: r.tag_number || '',
        admit_id: r.tag_number,
        animalName: r.animal_name || '',
        breed: r.breed || '',
        bodyColor: r.body_colour || '',
        sex: r.sex ? r.sex.toLowerCase() : '',
        age: r.age || '',
        name: r.name || '',
        mobile: r.mobile || '',
        address: r.address || '',
        animalInjury: r.animal_injury || '',
        diagnosis: r.diagnosis || '',
        date: r.date || '',
        time: formatTimeToAMPM(r.time),
        originalTime: r.time,
        presentDoctor: r.present_dr || '',
        presentStaff: r.present_staff || '',
        photo: r.photo_url,
        created_by: r.created_by,
        timestamp: r.created_at ? new Date(r.created_at).getTime() : 0
      })).sort((a, b) => b.timestamp - a.timestamp)

      setAnimals(transformed)
      setFilteredData(transformed)
      setTotalRecords(total)
      setTotalPages(pages)
    } catch (err) {
      showMsg('error', `Failed to load records: ${err.message}`)
      setAnimals([]); setFilteredData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnimals({ page: 1 }) }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAnimals({ page: 1, search: searchTerm, ...filters })
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm, filters.from_date, filters.to_date])

  useEffect(() => {
    fetchAnimals({ page: currentPage, search: searchTerm, ...filters })
  }, [currentPage])

  // ── PDF helpers ───────────────────────────────────────────────
  const buildPdfData = (record) => ({
    tagNo: record.tagNo,
    name: record.name, mobile: record.mobile,
    address: record.address, animal_name: record.animalName,
    diagnosis: record.diagnosis, animal_injury: record.animalInjury,
    sex: record.sex, age: record.age, breed: record.breed,
    body_colour: record.bodyColor, date: record.date,
    time: record.time, present_dr: record.presentDoctor,
    present_staff: record.presentStaff
  })

  const fetchPhotoAsBase64 = async (url) => {
    if (!url) return null
    if (url.startsWith('data:image')) return url
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return await PdfService.imageFileToBase64(blob)
    } catch {
      return null
    }
  }

  const handlePdfAction = async (action, record, e) => {
    e.stopPropagation()
    setActivePdfId(null)
    setPdfLoading(true)
    try {
      const photoBase64 = await fetchPhotoAsBase64(getImageUrl(record.photo))
      const pdf = await PdfService.generateAdmissionPdf(buildPdfData(record), photoBase64, logoBase64)
      if (action === 'share') {
        const shared = await PdfService.sharePdf(pdf, `animal-${record.tagNo}.pdf`, `Animal - ${record.animalName}`)
        showMsg('success', shared ? 'PDF shared!' : 'PDF downloaded!')
      } else if (action === 'download') {
        await PdfService.downloadPdf(pdf, `animal-${record.tagNo}.pdf`)
        showMsg('success', 'PDF downloaded!')
      } else if (action === 'print') {
        await PdfService.printPdf(pdf)
      }
    } catch (err) { showMsg('error', `PDF failed: ${err.message}`) }
    finally { setPdfLoading(false) }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="rec-page">

      {/* Page header */}
      <div className="rec-page-header">
        <div>
          <h1 className="rec-page-title">Animal Records</h1>
          <p className="rec-page-subtitle">Search, view and manage animal cases</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {setActivePage && (
            <button className="rec-add-animal-btn" onClick={() => setActivePage('dashboard')}>
              + Add Animal
            </button>
          )}
          <button className="rec-refresh-btn" onClick={() => fetchAnimals({ page: currentPage, search: searchTerm, ...filters })} disabled={loading}>
            {loading ? <span className="rec-spinner-sm"></span> : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Message toast */}
      {message.text && (
        <div className={`rec-message ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '!'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="rec-filter-bar">
        <div className="rec-search-wrap">
          <span className="rec-search-icon">⌕</span>
          <input
            type="text"
            className="rec-search-input"
            placeholder="Search by tag, animal, owner, mobile, location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="rec-search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="rec-date-filters">
          <div className="rec-date-field">
            <label>From</label>
            <input type="date" value={filters.from_date} onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))} className="rec-date-input" />
          </div>
          <div className="rec-date-field">
            <label>To</label>
            <input type="date" value={filters.to_date} onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))} className="rec-date-input" />
          </div>
          {(filters.from_date || filters.to_date || searchTerm) && (
            <button className="rec-clear-btn" onClick={() => { setFilters({ from_date: '', to_date: '' }); setSearchTerm('') }}>Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rec-card">
        {loading ? (
          <div className="rec-loading">
            <div className="rec-spinner"></div>
            <p>Loading records…</p>
          </div>
        ) : (
          <div className="rec-table-wrap">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tag No.</th>
                  <th>Animal</th>
                  <th>Owner</th>
                  <th>Mobile</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((r, i) => (
                  <tr key={r.id} className="rec-row">
                    <td data-label="Date">{formatDate(r.date)}{i === 0 && <span className="rec-new-badge">New</span>}</td>
                    <td data-label="Tag"><span className="rec-tag-pill">{r.tagNo}</span></td>
                    <td data-label="Animal">{r.animalName}</td>
                    <td data-label="Owner">{r.name}</td>
                    <td data-label="Mobile">{r.mobile}</td>
                    <td data-label="Time">{r.time}</td>
                    <td data-label="Actions">
                      <div className="rec-row-actions">
                        {/* View */}
                        <button
                          className="rec-action-btn rec-action-view"
                          onClick={() => onViewAnimal && onViewAnimal(r)}
                          title="View animal details"
                        >
                          View
                        </button>

                        {/* PDF dropdown */}
                        <div className="rec-pdf-cell-wrap" onClick={e => e.stopPropagation()}>
                          <button
                            className="rec-action-btn rec-action-pdf"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (activePdfId === r.id) { setActivePdfId(null); return }
                              const rect = e.currentTarget.getBoundingClientRect()
                              setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
                              setActivePdfId(r.id)
                            }}
                            disabled={pdfLoading}
                            title="Generate PDF"
                          >
                            PDF ▾
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="rec-empty">
                      <div className="rec-empty-content">
                        <span>🔍</span>
                        <p>{animals.length === 0 ? 'No records found.' : `No results for "${searchTerm}"`}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="rec-pagination">
            <span className="rec-pagination-info">Showing {filteredData.length} of {totalRecords} records</span>
            <div className="rec-pagination-btns">
              <button className="rec-page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>←</button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let n = i + 1
                if (totalPages > 5) {
                  if (currentPage <= 3) n = i + 1
                  else if (currentPage >= totalPages - 2) n = totalPages - 4 + i
                  else n = currentPage - 2 + i
                }
                return (
                  <button key={`p${n}`} className={`rec-page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => setCurrentPage(n)}>{n}</button>
                )
              })}
              <button className="rec-page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* ── PDF dropdown (fixed position to escape table overflow) ── */}
      {activePdfId && (
        <div
          className="rec-pdf-cell-dropdown"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          {filteredData.filter(r => r.id === activePdfId).map(r => (
            <div key={r.id}>
              <button onClick={(e) => handlePdfAction('share', r, e)} disabled={pdfLoading}>Share PDF</button>
              <button onClick={(e) => handlePdfAction('download', r, e)} disabled={pdfLoading}>Download PDF</button>
              <button onClick={(e) => handlePdfAction('print', r, e)} disabled={pdfLoading}>Print PDF</button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default UserRecords
