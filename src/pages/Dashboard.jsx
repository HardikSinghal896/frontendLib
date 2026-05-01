import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

const STATUS_LABELS = {
  PENDING_ISSUE: 'Pending Issue',
  ISSUED: 'Issued',
  PENDING_RETURN: 'Pending Return',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
}

const STATUS_CLASS = {
  PENDING_ISSUE: 'badge-pending-issue',
  ISSUED: 'badge-issued',
  PENDING_RETURN: 'badge-pending-return',
  RETURNED: 'badge-returned',
  CANCELLED: 'badge-cancelled',
  REJECTED: 'badge-rejected',
}

const today = () => new Date().toISOString().split('T')[0]
const defaultForm = {
  bookName: '',
  bookNumber: '',
  admissionDate: today(),
  issuedDate: today(),
  returnDate: '',
  userSignature: '',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'

  const [books, setBooks] = useState([])
  const [history, setHistory] = useState([])
  const [view, setView] = useState('active') // 'active' | 'history'
  const [loading, setLoading] = useState(true)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchBooks = useCallback(async () => {
    try {
      const [active, all] = await Promise.all([
        API.get('/api/users/me/books'),
        API.get('/api/users/me/books/history'),
      ])
      setBooks(active.data)
      setHistory(all.data)
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    if (!form.bookName?.trim()) return 'Book name is required'
    if (!form.bookNumber?.trim()) return 'Book number is required'
    if (!form.admissionDate) return 'Admission date is required'
    if (!form.issuedDate) return 'Issue date is required'
    if (!form.returnDate) return 'Return date is required'
    if (form.returnDate < form.issuedDate) return 'Return date must be after issue date'
    if (!form.userSignature?.trim()) return 'Signature is required'
    return null
  }

  const handleIssueSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setFormError(validationError); return }
    setFormError('')
    setFormLoading(true)
    try {
      await API.post('/api/books/issue', form)
      setShowIssueModal(false)
      setForm(defaultForm)
      setSuccessMsg('Issue request submitted!')
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchBooks()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !data.error) {
        const first = Object.entries(data)[0]
        setFormError(first ? `${first[0]}: ${first[1]}` : 'Failed to submit request')
      } else {
        setFormError(data?.error || 'Failed to submit request')
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handleRequestReturn = async (issueId) => {
    if (!window.confirm('Request return for this book?')) return
    try {
      await API.post('/api/books/return', { issueRequestId: issueId })
      setSuccessMsg('Return request submitted!')
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchBooks()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to request return')
    }
  }

  const handleCancel = async (b) => {
    const label = b.status === 'PENDING_ISSUE' ? 'issue request' : 'return request'
    if (!window.confirm(`Cancel this ${label}?`)) return
    try {
      if (b.status === 'PENDING_ISSUE') {
        await API.post(`/api/books/issue/${b.issueId}/cancel`)
      } else {
        await API.post(`/api/books/return/${b.returnRequestId}/cancel`)
      }
      setSuccessMsg('Request cancelled.')
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchBooks()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
    }
  }

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="page">
      <nav className="navbar">
        <span className="navbar-brand">📚 Bhatia Ashram Library</span>
        <div className="navbar-right">
          <span>{name}</span>
          <button className="btn-outline" style={{ color: '#ccc', borderColor: '#444' }} onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container page-content">
        {/* Header row */}
        <div className="flex justify-between flex-center mb-4">
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>My Books</h1>
          <button className="btn" onClick={() => { setShowIssueModal(true); setFormError('') }}>
            + Request Book Issue
          </button>
        </div>

        {successMsg && <div className="success-msg mb-4">{successMsg}</div>}

        {/* Tab toggle */}
        <div className="tabs mb-4" style={{ borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <button className={`tab ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>
            Active
          </button>
          <button className={`tab ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            History
          </button>
        </div>

        {/* Books table + mobile cards */}
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : view === 'active' ? (
              books.length === 0 ? (
                <div className="empty-state">No active books. Request your first book above.</div>
              ) : (
                <>
                  {/* Desktop table */}
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Book Name</th>
                        <th>Book No.</th>
                        <th>Issued Date</th>
                        <th>Return By</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map((b, i) => (
                        <tr key={b.issueId}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{b.bookName}</td>
                          <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{b.bookNumber}</td>
                          <td>{b.issuedDate || '—'}</td>
                          <td>{b.returnDate || '—'}</td>
                          <td>
                            <span className={`badge ${STATUS_CLASS[b.status] || ''}`}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </td>
                          <td>
                            {b.status === 'ISSUED' && (
                              <button className="btn-outline btn-sm" onClick={() => handleRequestReturn(b.issueId)}>
                                Request Return
                              </button>
                            )}
                            {(b.status === 'PENDING_ISSUE' || b.status === 'PENDING_RETURN') && (
                              <button className="btn-danger btn-sm" onClick={() => handleCancel(b)}>
                                Cancel
                              </button>
                            )}
                            {b.status === 'REJECTED' && <span className="text-muted">Re-raise new request</span>}
                            {b.status !== 'ISSUED' && b.status !== 'PENDING_ISSUE' && b.status !== 'PENDING_RETURN' && b.status !== 'REJECTED' && <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Mobile cards */}
                  <div className="book-cards">
                    {books.map((b) => (
                      <div key={b.issueId} className="book-card">
                        <div className="book-card-top">
                          <span className="book-card-name">{b.bookName}</span>
                          <span className={`badge ${STATUS_CLASS[b.status] || ''}`}>
                            {STATUS_LABELS[b.status] || b.status}
                          </span>
                        </div>
                        <div className="book-card-meta">
                          <span><strong>Book No.</strong> {b.bookNumber}</span>
                          <span><strong>Issued</strong> {b.issuedDate || '—'}</span>
                          <span><strong>Return By</strong> {b.returnDate || '—'}</span>
                        </div>
                        <div className="book-card-actions">
                          {b.status === 'ISSUED' && (
                            <button className="btn-outline btn-sm btn-block" onClick={() => handleRequestReturn(b.issueId)}>
                              📤 Request Return
                            </button>
                          )}
                          {(b.status === 'PENDING_ISSUE' || b.status === 'PENDING_RETURN') && (
                            <button className="btn-danger btn-sm btn-block" onClick={() => handleCancel(b)}>
                              ✕ Cancel Request
                            </button>
                          )}
                          {b.status === 'REJECTED' && (
                            <span className="text-muted" style={{ fontSize: 13 }}>Re-raise a new request above</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              history.length === 0 ? (
                <div className="empty-state">No book history yet.</div>
              ) : (
                <>
                  {/* Desktop table */}
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Book Name</th>
                        <th>Book No.</th>
                        <th>Issued Date</th>
                        <th>Return By</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((b, i) => (
                        <tr key={b.issueId}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{b.bookName}</td>
                          <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{b.bookNumber}</td>
                          <td>{b.issuedDate || '—'}</td>
                          <td>{b.returnDate || '—'}</td>
                          <td>
                            <span className={`badge ${STATUS_CLASS[b.status] || ''}`}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Mobile cards */}
                  <div className="book-cards">
                    {history.map((b) => (
                      <div key={b.issueId} className="book-card">
                        <div className="book-card-top">
                          <span className="book-card-name">{b.bookName}</span>
                          <span className={`badge ${STATUS_CLASS[b.status] || ''}`}>
                            {STATUS_LABELS[b.status] || b.status}
                          </span>
                        </div>
                        <div className="book-card-meta">
                          <span><strong>Book No.</strong> {b.bookNumber}</span>
                          <span><strong>Issued</strong> {b.issuedDate || '—'}</span>
                          <span><strong>Return By</strong> {b.returnDate || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Issue Request Modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Book Issue</h3>
              <button className="close-btn" onClick={() => setShowIssueModal(false)}>×</button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Book Name</label>
                  <input value={form.bookName} onChange={set('bookName')} required placeholder="e.g. Clean Code" />
                </div>
                <div className="form-group">
                  <label>Book Number (Copy ID)</label>
                  <input
                    value={form.bookNumber}
                    onChange={set('bookNumber')}
                    required
                    placeholder="e.g. BC-001"
                    style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                  />
                </div>
                <div className="col-2">
                  <div className="form-group">
                    <label>Admission Date</label>
                    <input type="date" value={form.admissionDate} onChange={set('admissionDate')} required />
                  </div>
                  <div className="form-group">
                    <label>Issue Date</label>
                    <input type="date" value={form.issuedDate} onChange={set('issuedDate')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Return Date</label>
                  <input type="date" value={form.returnDate} onChange={set('returnDate')} required />
                </div>
                <div className="form-group">
                  <label>Your Signature (Name)</label>
                  <input value={form.userSignature} onChange={set('userSignature')} required placeholder="Your full name" />
                </div>
                {formError && <div className="error-msg">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={formLoading}>
                  {formLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}