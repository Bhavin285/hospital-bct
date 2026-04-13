import { useState, useEffect, useRef } from 'react'
import './AnimalRecords.css'
import PdfService from '../../utils/pdfService'
import trustLogo from '../../assets/images/logo.png'

function AdminDashboard({ setActivePage, onEditAnimal, onViewAnimal }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  const itemsPerPage = 20

  const [loading, setLoading]         = useState(true)
  const [filteredData, setFilteredData] = useState([])
  const [searchTerm, setSearchTerm]   = useState('')
  const [tagSearch, setTagSearch]     = useState('')
  const [mobileSearch, setMobileSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filters, setFilters]         = useState({ from_date: '', to_date: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [message, setMessage]         = useState({ type: '', text: '' })
  const [statuses, setStatuses]       = useState({})
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [logoBase64, setLogoBase64]   = useState(null)

  // Keep a ref to the latest fetch so we can ignore stale responses
  const fetchIdRef = useRef(0)

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

  // ─── helpers ────────────────────────────────────────────────────────────────

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
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
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

  const transform = (r, i) => ({
    id:           r.tag_number ? String(r.tag_number) : `tmp-${i}`,
    tagNo:        r.tag_number || '',
    admit_id:     r.tag_number,
    animalName:   r.animal_name || '',
    breed:        r.breed || '',
    bodyColor:    r.body_colour || '',
    sex:          r.sex ? r.sex.toLowerCase() : '',
    age:          r.age || '',
    name:         r.name || '',
    mobile:       r.mobile || '',
    address:      r.address || '',
    animalInjury: r.animal_injury || '',
    diagnosis:    r.diagnosis || '',
    date:         r.date || '',
    time:         formatTimeToAMPM(r.time),
    originalTime: r.time,
    presentDoctor: r.present_dr || '',
    presentStaff:  r.present_staff || '',
    photo:        r.photo_url,
    created_by:   r.created_by,
    timestamp:    r.created_at ? new Date(r.created_at).getTime() : 0,
  })

  // ─── core fetch ─────────────────────────────────────────────────────────────
  // Called with explicit values so there is never a stale-closure problem.

  const fetchRecords = async ({
    page, tag_number, search, mobile, status, from_date, to_date,
  }) => {
    // Any text field active → fetch ALL matching records from backend,
    // the backend already filters via DynamoDB contains() and returns
    // only matches, so we never miss records on other pages.
    const isSearching = !!(mobile?.trim() || search?.trim() || tag_number?.trim())

    const q = new URLSearchParams()
    q.append('page',     isSearching ? 1        : page)
    q.append('pageSize', isSearching ? 99999    : itemsPerPage)

    if (tag_number?.trim()) q.append('tag_number', tag_number.trim())
    if (search?.trim())     q.append('search',     search.trim())
    if (mobile?.trim())     q.append('mobile',     mobile.trim())
    if (status?.trim())     q.append('status',     status.trim())
    if (from_date)          q.append('from_date',  from_date)
    if (to_date)            q.append('to_date',    to_date)

    const res = await fetch(`${API_BASE_URL}/admit_form?${q}`, {
      headers: getAuthHeaders(),
    })
    if (res.status === 401) throw new Error('SESSION_EXPIRED')
    if (!res.ok)            throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    let records = [], total = 0, pages = 0

    if (data?.data && Array.isArray(data.data)) {
      records = data.data
      total   = data.pagination?.totalRecords || records.length
      pages   = data.pagination?.totalPages   || 1
    } else if (Array.isArray(data)) {
      records = data
      total   = records.length
      pages   = Math.ceil(total / itemsPerPage)
    }

    let rows = records.map(transform).sort((a, b) => b.timestamp - a.timestamp)

    if (isSearching) {
      // Backend uses contains() (partial match). Apply exact frontend filters
      // so only records that precisely match the search term are shown.
      if (mobile?.trim()) {
        const m = mobile.trim()
        rows = rows.filter(r => r.mobile?.trim() === m)
      }
      if (search?.trim()) {
        const s = search.trim().toLowerCase()
        rows = rows.filter(r => r.animalName?.toLowerCase() === s)
      }
      if (tag_number?.trim()) {
        const t = tag_number.trim()
        rows = rows.filter(r => String(r.tagNo).trim() === t)
      }
      return { rows, totalRecords: rows.length, totalPages: 0, isSearching: true }
    }
    return { rows, totalRecords: total, totalPages: pages, isSearching: false }
  }

  const loadStatuses = (rows) => {
    setStatuses({})
    Promise.allSettled(
      rows.map(r =>
        fetch(`${API_BASE_URL}/discharge_summary/${r.admit_id}`, {
          headers: getAuthHeaders(),
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            const items = Array.isArray(data)
              ? data
              : (data?.data || data?.items || [])
            if (!items.length) return { id: r.admit_id, status: null }
            const latest = items.reduce((a, b) =>
              new Date(a.created_at || 0) > new Date(b.created_at || 0) ? a : b
            )
            return { id: r.admit_id, status: latest.status || null }
          })
          .catch(() => ({ id: r.admit_id, status: null }))
      )
    ).then(results => {
      const map = {}
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) map[r.value.id] = r.value.status
      })
      setStatuses(map)
    })
  }

  // ─── single trigger: run whenever any filter/page changes ───────────────────

  const runFetch = async (params) => {
    const id = ++fetchIdRef.current   // stamp this fetch
    setLoading(true)
    try {
      const result = await fetchRecords(params)
      if (fetchIdRef.current !== id) return   // a newer fetch superseded this one

      setFilteredData(result.rows)
      setTotalRecords(result.totalRecords)
      setTotalPages(result.totalPages)
      loadStatuses(result.rows)
    } catch (err) {
      if (fetchIdRef.current !== id) return
      if (err.message === 'SESSION_EXPIRED') {
        showMsg('error', 'Session expired. Please login again.')
      } else {
        showMsg('error', `Failed to load records: ${err.message}`)
      }
      setFilteredData([])
    } finally {
      if (fetchIdRef.current === id) setLoading(false)
    }
  }

  // ─── debounce text inputs (400 ms), reset to page 1 ────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1)
      runFetch({
        page:       1,
        tag_number: tagSearch,
        search:     searchTerm,
        mobile:     mobileSearch,
        status:     statusFilter,
        from_date:  filters.from_date,
        to_date:    filters.to_date,
      })
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm, tagSearch, mobileSearch, statusFilter, filters.from_date, filters.to_date])

  // ─── page navigation ────────────────────────────────────────────────────────

  const goToPage = (newPage) => {
    setCurrentPage(newPage)
    runFetch({
      page:       newPage,
      tag_number: tagSearch,
      search:     searchTerm,
      mobile:     mobileSearch,
      status:     statusFilter,
      from_date:  filters.from_date,
      to_date:    filters.to_date,
    })
  }

  // ─── search / clear buttons ─────────────────────────────────────────────────

  const handleSearch = () => {
    setCurrentPage(1)
    runFetch({
      page:       1,
      tag_number: tagSearch,
      search:     searchTerm,
      mobile:     mobileSearch,
      status:     statusFilter,
      from_date:  filters.from_date,
      to_date:    filters.to_date,
    })
  }

  const handleClear = () => {
    setSearchTerm('')
    setTagSearch('')
    setMobileSearch('')
    setStatusFilter('')
    setFilters({ from_date: '', to_date: '' })
    // the debounce effect will fire and refetch automatically
  }

  // ─── status helpers ─────────────────────────────────────────────────────────

  const getStatusText = (s) =>
    ({ re_open: 'Re-open', recover: 'Recover', release: 'Release', death: 'Death' }[s] || 'Unknown')

  const getStatusClass = (s) =>
    ({ re_open: 'rec-status-reopen', recover: 'rec-status-recover', release: 'rec-status-release', death: 'rec-status-death' }[s] || 'rec-status-unknown')

  // ─── PDF helpers ────────────────────────────────────────────────────────────

  const buildPdfData = (r) => ({
    tagNo: r.tagNo, name: r.name, mobile: r.mobile,
    address: r.address, animal_name: r.animalName,
    diagnosis: r.diagnosis, animal_injury: r.animalInjury,
    sex: r.sex, age: r.age, breed: r.breed,
    body_colour: r.bodyColor, date: r.date,
    time: r.time, present_dr: r.presentDoctor,
    present_staff: r.presentStaff,
  })

  const fetchPhotoAsBase64 = async (url) => {
    if (!url) return null
    if (url.startsWith('data:image')) return url
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return await PdfService.imageFileToBase64(blob)
    } catch { return null }
  }

  const handlePdfAction = async (action, record, e) => {
    e.stopPropagation()
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
    } catch (err) {
      showMsg('error', `PDF failed: ${err.message}`)
    } finally {
      setPdfLoading(false)
    }
  }

  // ─── derived flags ───────────────────────────────────────────────────────────

  const isSearchActive    = !!(mobileSearch?.trim() || searchTerm?.trim() || tagSearch?.trim())
  const hasActiveFilters  = isSearchActive || statusFilter || filters.from_date || filters.to_date
  const activeSearchLabel = mobileSearch?.trim() || searchTerm?.trim() || tagSearch?.trim()

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rec-page">

      <div className="rec-page-header">
        <div>
          <h1 className="rec-page-title">Animal Records</h1>
          <p className="rec-page-subtitle">Search, view and manage all animal cases</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {setActivePage && (
            <button className="rec-add-animal-btn" onClick={() => setActivePage('form')}>
              + Add Animal
            </button>
          )}
          <button className="rec-refresh-btn" onClick={handleSearch} disabled={loading}>
            {loading ? <span className="rec-spinner-sm" /> : '↻'} Refresh
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`rec-message ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '!'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ── filters ── */}
      <div className="rec-filter-card">
        <p className="rec-filter-card-title">SEARCH RECORDS</p>

        <div className="rec-filter-grid">
          <div className="rec-filter-field">
            <label>TAG NUMBER</label>
            <input
              type="text"
              placeholder="e.g. 65"
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
            />
          </div>
          <div className="rec-filter-field">
            <label>ANIMAL NAME</label>
            <input
              type="text"
              placeholder="e.g. Dog, Cat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rec-filter-field">
            <label>MOBILE NUMBER</label>
            <input
              type="text"
              placeholder="Owner mobile"
              value={mobileSearch}
              onChange={e => setMobileSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rec-filter-grid">
          <div className="rec-filter-field">
            <label>STATUS</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="re_open">Re-open</option>
              <option value="recover">Recover</option>
              <option value="release">Release</option>
              <option value="death">Death</option>
            </select>
          </div>
          <div className="rec-filter-field">
            <label>FROM DATE</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={e => setFilters(p => ({ ...p, from_date: e.target.value }))}
            />
          </div>
          <div className="rec-filter-field">
            <label>TO DATE</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={e => setFilters(p => ({ ...p, to_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="rec-filter-actions">
          <button className="rec-search-submit-btn" onClick={handleSearch}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            Search
          </button>
          {hasActiveFilters && (
            <button className="rec-clear-btn" onClick={handleClear}>Clear</button>
          )}
        </div>
      </div>

      {/* ── table ── */}
      <div className="rec-card">
        {loading ? (
          <div className="rec-loading">
            <div className="rec-spinner" />
            <p>Loading records…</p>
          </div>
        ) : (
          <>
            {/* Result count shown only during text search */}
            {isSearchActive && (
              <div className="rec-search-result-info" style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                Found <strong>{filteredData.length}</strong> record{filteredData.length !== 1 ? 's' : ''} matching &quot;{activeSearchLabel}&quot;
              </div>
            )}

            <div className="rec-table-wrap">
              <table className="rec-table">
                <thead>
                  <tr>
                    <th>Tag No.</th>
                    <th>Animal Name</th>
                    <th>Breed</th>
                    <th>Colour</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Admission Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? filteredData.map((r) => (
                    <tr key={r.id} className="rec-row">
                      <td data-label="Tag No.">
                        <span
                          className="rec-tag-pill rec-tag-pill-link"
                          onClick={() => onViewAnimal && onViewAnimal(r)}
                          title="Click to view"
                        >{r.tagNo}</span>
                      </td>
                      <td data-label="Animal Name">{r.animalName}</td>
                      <td data-label="Breed">{r.breed || '—'}</td>
                      <td data-label="Colour">{r.bodyColor || '—'}</td>
                      <td data-label="Status">
                        <span className={`rec-status-badge ${getStatusClass(statuses[r.admit_id])}`}>
                          {getStatusText(statuses[r.admit_id])}
                        </span>
                      </td>
                      <td data-label="Owner">{r.name}</td>
                      <td data-label="Admission Date">{formatDate(r.date)}</td>
                      <td data-label="Actions">
                        <div className="rec-row-actions">
                          <button className="rec-icon-btn rec-icon-view" onClick={() => onViewAnimal && onViewAnimal(r)} title="View">👁</button>
                          {onEditAnimal && (
                            <button className="rec-icon-btn rec-icon-edit" onClick={() => onEditAnimal(r)} title="Edit">✏</button>
                          )}
                          <button className="rec-icon-btn rec-icon-download" onClick={(e) => handlePdfAction('download', r, e)} disabled={pdfLoading} title="Download PDF">⬇</button>
                          <button className="rec-icon-btn rec-icon-print" onClick={(e) => handlePdfAction('print', r, e)} disabled={pdfLoading} title="Print PDF">🖨</button>
                          <button className="rec-icon-btn rec-icon-share" onClick={(e) => handlePdfAction('share', r, e)} disabled={pdfLoading} title="Share PDF">↗</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8" className="rec-empty">
                        <div className="rec-empty-content">
                          <span>🔍</span>
                          <p>{isSearchActive ? `No results for "${activeSearchLabel}"` : 'No records found.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination — completely hidden during any text search */}
        {!isSearchActive && totalPages > 1 && (
          <div className="rec-pagination">
            <span className="rec-pagination-info">
              Page {currentPage} of {totalPages} &nbsp;·&nbsp; {totalRecords} total records
            </span>
            <div className="rec-pagination-btns">
              <button
                className="rec-page-btn"
                onClick={() => goToPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >←</button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let n = i + 1
                if (totalPages > 5) {
                  if (currentPage <= 3)               n = i + 1
                  else if (currentPage >= totalPages - 2) n = totalPages - 4 + i
                  else                                    n = currentPage - 2 + i
                }
                return (
                  <button
                    key={`p${n}`}
                    className={`rec-page-btn ${currentPage === n ? 'active' : ''}`}
                    onClick={() => goToPage(n)}
                  >{n}</button>
                )
              })}
              <button
                className="rec-page-btn"
                onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >→</button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default AdminDashboard
