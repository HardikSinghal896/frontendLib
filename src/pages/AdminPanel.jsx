import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

const TABS = ['Pending Issues', 'Pending Returns', 'Active Books', 'User Approvals', 'Users']

const STATUS_CLASS = {
  PENDING_ISSUE: 'badge-pending-issue',
  ISSUED: 'badge-issued',
  PENDING_RETURN: 'badge-pending-return',
  RETURNED: 'badge-returned',
}

// ─── Reusable camera + gallery picker ────────────────────────────────────────
function FilePicker({ file, onChange }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const handleFileChange = (e) => { if (e.target.files[0]) onChange(e.target.files[0]) }
  return (
    <div>
      <input type="file" accept="image/*" capture="environment" ref={cameraRef}
        style={{ display: 'none' }} onChange={handleFileChange} />
      <input type="file" accept="image/*" ref={galleryRef}
        style={{ display: 'none' }} onChange={handleFileChange} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn-outline btn-sm" style={{ fontSize: 11 }}
          onClick={() => cameraRef.current.click()}>📷 Camera</button>
        <button className="btn-outline btn-sm" style={{ fontSize: 11 }}
          onClick={() => galleryRef.current.click()}>🖼️ Gallery</button>
      </div>
      {file && (
        <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 3 }}>✓ {file.name}</div>
      )}
    </div>
  )
}

// ─── Pending Issues Tab ───────────────────────────────────────────────────────
function PendingIssues() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sig, setSig] = useState('Deelip')
  const [files, setFiles] = useState({}) // issueId → File
  const [uploading, setUploading] = useState({}) // issueId → bool

  const load = useCallback(async () => {
    const { data } = await API.get('/api/admin/approvals/issues')
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (id) => {
    if (!files[id]) return alert('Select a signature image first')
    const formData = new FormData()
    formData.append('file', files[id])
    formData.append('librarianSignature', sig || 'Librarian')
    setUploading(u => ({ ...u, [id]: true }))
    try {
      await API.post(`/api/admin/approvals/issues/${id}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFiles(f => { const n = { ...f }; delete n[id]; return n })
      load()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data || 'Approval failed'
      alert(msg)
    } finally {
      setUploading(u => ({ ...u, [id]: false }))
    }
  }

  const reject = async (id) => {
    if (!window.confirm('Reject this issue request?')) return
    await API.post(`/api/admin/approvals/issues/${id}/reject`)
    load()
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!items.length) return <div className="empty-state">No pending issue requests.</div>

  return (
    <>
      <div className="flex flex-center mb-4" style={{ gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          LIBRARIAN SIGNATURE NAME
        </label>
        <input
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          style={{ width: 180, flexShrink: 0 }}
          placeholder="Signature name"
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th><th>Book Name</th><th>Book No.</th>
              <th>Issue Date</th><th>Return By</th><th>User Signature</th>
              <th>Signature Image</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.issueId}>
                <td style={{ fontWeight: 500 }}>{b.userName}</td>
                <td>{b.bookName}</td>
                <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{b.bookNumber}</td>
                <td>{b.issuedDate || '—'}</td>
                <td>{b.returnDate || '—'}</td>
                <td style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{b.userSignature || '—'}</td>
                <td><FilePicker file={files[b.issueId]} onChange={(f) => setFiles(prev => ({ ...prev, [b.issueId]: f }))} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-success btn-sm" onClick={() => approve(b.issueId)}
                      disabled={!files[b.issueId] || uploading[b.issueId]}>
                      {uploading[b.issueId] ? '...' : '✓ Approve'}
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => reject(b.issueId)}>✗ Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Mobile cards */}
        <div className="admin-cards">
          {items.map((b) => (
            <div key={b.issueId} className="admin-card">
              <div className="admin-card-top">
                <span className="admin-card-title">{b.bookName}</span>
                <span className="badge badge-pending-issue">Pending</span>
              </div>
              <div className="admin-card-meta">
                <span><strong>User</strong> {b.userName}</span>
                <span><strong>Book No.</strong> {b.bookNumber}</span>
                <span><strong>Issue Date</strong> {b.issuedDate || '—'}</span>
                <span><strong>Return By</strong> {b.returnDate || '—'}</span>
                <span><strong>Signature</strong> {b.userSignature || '—'}</span>
              </div>
              <div className="admin-card-file">
                <FilePicker file={files[b.issueId]} onChange={(f) => setFiles(prev => ({ ...prev, [b.issueId]: f }))} />
              </div>
              <div className="admin-card-actions">
                <button className="btn-success btn-sm" onClick={() => approve(b.issueId)}
                  disabled={!files[b.issueId] || uploading[b.issueId]}>
                  {uploading[b.issueId] ? 'Uploading...' : '✓ Approve'}
                </button>
                <button className="btn-danger btn-sm" onClick={() => reject(b.issueId)}>✗ Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Pending Returns Tab ──────────────────────────────────────────────────────
function PendingReturns() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState({}) // returnRequestId → File
  const [uploading, setUploading] = useState({})

  const load = useCallback(async () => {
    const { data } = await API.get('/api/admin/approvals/returns')
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (returnRequestId) => {
    if (!files[returnRequestId]) return alert('Select an evidence image first')
    const formData = new FormData()
    formData.append('file', files[returnRequestId])
    setUploading(u => ({ ...u, [returnRequestId]: true }))
    try {
      await API.post(`/api/admin/approvals/returns/${returnRequestId}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFiles(f => { const n = { ...f }; delete n[returnRequestId]; return n })
      load()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data || 'Approval failed'
      alert(msg)
    } finally {
      setUploading(u => ({ ...u, [returnRequestId]: false }))
    }
  }

  const reject = async (returnRequestId) => {
    if (!window.confirm('Reject this return request?')) return
    await API.post(`/api/admin/approvals/returns/${returnRequestId}/reject`)
    load()
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!items.length) return <div className="empty-state">No pending return requests.</div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th><th>Book Name</th><th>Book No.</th>
            <th>Issued Date</th><th>Due Date</th><th>Status</th>
            <th>Evidence Image</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.issueId}>
              <td style={{ fontWeight: 500 }}>{b.userName}</td>
              <td>{b.bookName}</td>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{b.bookNumber}</td>
              <td>{b.issuedDate || '—'}</td>
              <td>{b.returnDate || '—'}</td>
              <td><span className={`badge ${STATUS_CLASS[b.status]}`}>{b.status}</span></td>
              <td><FilePicker file={files[b.returnRequestId]} onChange={(f) => setFiles(prev => ({ ...prev, [b.returnRequestId]: f }))} /></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-success btn-sm" onClick={() => approve(b.returnRequestId)}
                    disabled={!files[b.returnRequestId] || uploading[b.returnRequestId]}>
                    {uploading[b.returnRequestId] ? '...' : '✓ Mark Returned'}
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => reject(b.returnRequestId)}>✗ Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="admin-cards">
        {items.map((b) => (
          <div key={b.issueId} className="admin-card">
            <div className="admin-card-top">
              <span className="admin-card-title">{b.bookName}</span>
              <span className={`badge ${STATUS_CLASS[b.status]}`}>{b.status}</span>
            </div>
            <div className="admin-card-meta">
              <span><strong>User</strong> {b.userName}</span>
              <span><strong>Book No.</strong> {b.bookNumber}</span>
              <span><strong>Issued</strong> {b.issuedDate || '—'}</span>
              <span><strong>Due Date</strong> {b.returnDate || '—'}</span>
            </div>
            <div className="admin-card-file">
              <FilePicker file={files[b.returnRequestId]} onChange={(f) => setFiles(prev => ({ ...prev, [b.returnRequestId]: f }))} />
            </div>
            <div className="admin-card-actions">
              <button className="btn-success btn-sm" onClick={() => approve(b.returnRequestId)}
                disabled={!files[b.returnRequestId] || uploading[b.returnRequestId]}>
                {uploading[b.returnRequestId] ? 'Uploading...' : '✓ Mark Returned'}
              </button>
              <button className="btn-danger btn-sm" onClick={() => reject(b.returnRequestId)}>✗ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Active Books Tab ─────────────────────────────────────────────────────────
function ActiveBooks() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null) // { userId, name }
  const [userBooks, setUserBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [booksLoading, setBooksLoading] = useState(false)

  useEffect(() => {
    API.get('/api/admin/books/active/users').then(({ data }) => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const viewUserBooks = async (u) => {
    setSelectedUser(u)
    setBooksLoading(true)
    const { data } = await API.get(`/api/admin/books/active/users/${u.userId}`)
    setUserBooks(data)
    setBooksLoading(false)
  }

  if (loading) return <div className="loading">Loading...</div>

  if (selectedUser) {
    return (
      <>
        <div className="flex flex-center mb-4" style={{ gap: 10 }}>
          <button className="btn-outline btn-sm" onClick={() => setSelectedUser(null)}>← Back</button>
          <span style={{ fontWeight: 600 }}>{selectedUser.name}'s Active Books</span>
        </div>
        {booksLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book Name</th><th>Book No.</th><th>Issued Date</th>
                  <th>Return By</th><th>Status</th><th>Signature</th><th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {userBooks.map((b) => (
                  <tr key={b.issueId}>
                    <td style={{ fontWeight: 500 }}>{b.bookName}</td>
                    <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{b.bookNumber}</td>
                    <td>{b.issuedDate || '—'}</td>
                    <td>{b.returnDate || '—'}</td>
                    <td><span className={`badge ${STATUS_CLASS[b.status]}`}>{b.status}</span></td>
                    <td>
                      {b.librarianSignatureUrl
                        ? <img src={b.librarianSignatureUrl} width="50" style={{ cursor: 'pointer', borderRadius: 2 }} onClick={() => window.open(b.librarianSignatureUrl, '_blank')} />
                        : '—'}
                    </td>
                    <td>
                      {b.evidenceImageUrl
                        ? <img src={b.evidenceImageUrl} width="50" style={{ cursor: 'pointer', borderRadius: 2 }} onClick={() => window.open(b.evidenceImageUrl, '_blank')} />
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile cards — user book detail */}
            <div className="admin-cards">
              {userBooks.map((b) => (
                <div key={b.issueId} className="admin-card">
                  <div className="admin-card-top">
                    <span className="admin-card-title">{b.bookName}</span>
                    <span className={`badge ${STATUS_CLASS[b.status]}`}>{b.status}</span>
                  </div>
                  <div className="admin-card-meta">
                    <span><strong>Book No.</strong> {b.bookNumber}</span>
                    <span><strong>Issued</strong> {b.issuedDate || '—'}</span>
                    <span><strong>Return By</strong> {b.returnDate || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    {b.librarianSignatureUrl && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SIGNATURE</div>
                        <img src={b.librarianSignatureUrl} style={{ width: 70, borderRadius: 2, cursor: 'pointer' }}
                          onClick={() => window.open(b.librarianSignatureUrl, '_blank')} />
                      </div>
                    )}
                    {b.evidenceImageUrl && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>EVIDENCE</div>
                        <img src={b.evidenceImageUrl} style={{ width: 70, borderRadius: 2, cursor: 'pointer' }}
                          onClick={() => window.open(b.evidenceImageUrl, '_blank')} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!userBooks.length && <div className="empty-state">No active books.</div>}
            </div>
            {!userBooks.length && <div className="empty-state" style={{ display: 'none' }}>No active books.</div>}
          </div>
        )}
      </>
    )
  }

  if (!users.length) return <div className="empty-state">No active books across users.</div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th><th>Active Books</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId}>
              <td style={{ fontWeight: 500 }}>{u.name}</td>
              <td>
                <span style={{ display: 'inline-block', background: '#dbeafe', color: '#1a3a6b', borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {u.activeBooksCount}
                </span>
              </td>
              <td>
                <button className="btn-outline btn-sm" onClick={() => viewUserBooks(u)}>View Books</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards — user list */}
      <div className="admin-cards">
        {users.map((u) => (
          <div key={u.userId} className="admin-card">
            <div className="admin-card-top">
              <span className="admin-card-title">{u.name}</span>
              <span style={{ background: '#dbeafe', color: '#1a3a6b', borderRadius: 20, padding: '2px 12px', fontSize: 13, fontWeight: 600 }}>
                {u.activeBooksCount} books
              </span>
            </div>
            <div className="admin-card-actions">
              <button className="btn-outline btn-sm btn-block" onClick={() => viewUserBooks(u)}>
                📖 View Books
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── User Approvals Tab ───────────────────────────────────────────────────────
function UserApprovals() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await API.get('/api/admin/users/pending')
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (id) => {
    await API.post(`/api/admin/users/${id}/approve`)
    load()
  }

  const reject = async (id, name) => {
    if (!window.confirm(`Reject "${name}"? They will not be able to login.`)) return
    await API.post(`/api/admin/users/${id}/reject`)
    load()
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!users.length) return <div className="empty-state">No pending user approvals.</div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Mobile</th>
            <th>Aadhar</th><th>Admission Date</th><th>Registered</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.mobile || '—'}</td>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{u.aadharNumber || '—'}</td>
              <td>{u.admissionDate || '—'}</td>
              <td style={{ color: 'var(--text-muted)' }}>{u.createdAt ? u.createdAt.split('T')[0] : '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-success btn-sm" onClick={() => approve(u.id)}>✓ Approve</button>
                  <button className="btn-danger btn-sm" onClick={() => reject(u.id, u.name)}>✗ Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="admin-cards">
        {users.map((u) => (
          <div key={u.id} className="admin-card">
            <div className="admin-card-top">
              <span className="admin-card-title">{u.name}</span>
              <span className="badge badge-pending-issue">Pending</span>
            </div>
            <div className="admin-card-meta">
              <span><strong>Email</strong> {u.email}</span>
              <span><strong>Mobile</strong> {u.mobile || '—'}</span>
              <span><strong>Aadhar</strong> {u.aadharNumber || '—'}</span>
              <span><strong>Admission</strong> {u.admissionDate || '—'}</span>
              <span><strong>Registered</strong> {u.createdAt ? u.createdAt.split('T')[0] : '—'}</span>
            </div>
            <div className="admin-card-actions">
              <button className="btn-success btn-sm" onClick={() => approve(u.id)}>✓ Approve</button>
              <button className="btn-danger btn-sm" onClick={() => reject(u.id, u.name)}>✗ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await API.get('/api/admin/users')
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}" and all their books?`)) return
    await API.delete(`/api/admin/users/${id}`)
    load()
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!users.length) return <div className="empty-state">No registered users.</div>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Mobile</th>
            <th>Aadhar</th><th>Admission Date</th><th>Registered</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.mobile || '—'}</td>
              <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{u.aadharNumber || '—'}</td>
              <td>{u.admissionDate || '—'}</td>
              <td style={{ color: 'var(--text-muted)' }}>{u.createdAt ? u.createdAt.split('T')[0] : '—'}</td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => deleteUser(u.id, u.name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="admin-cards">
        {users.map((u) => (
          <div key={u.id} className="admin-card">
            <div className="admin-card-top">
              <span className="admin-card-title">{u.name}</span>
            </div>
            <div className="admin-card-meta">
              <span><strong>Email</strong> {u.email}</span>
              <span><strong>Mobile</strong> {u.mobile || '—'}</span>
              <span><strong>Aadhar</strong> {u.aadharNumber || '—'}</span>
              <span><strong>Admission</strong> {u.admissionDate || '—'}</span>
              <span><strong>Registered</strong> {u.createdAt ? u.createdAt.split('T')[0] : '—'}</span>
            </div>
            <div className="admin-card-actions">
              <button className="btn-danger btn-sm btn-block" onClick={() => deleteUser(u.id, u.name)}>
                🗑 Delete User
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Panel Root ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const TAB_COMPONENTS = [<PendingIssues />, <PendingReturns />, <ActiveBooks />, <UserApprovals />, <Users />]

  return (
    <div className="page">
      <nav className="navbar">
        <span className="navbar-brand">📚 LIBRARY — ADMIN</span>
        <div className="navbar-right">
          <span>Admin</span>
          <button className="btn-outline" style={{ color: '#ccc', borderColor: '#444' }} onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container page-content">
        <div className="card">
          <div className="tabs">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={`tab ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ padding: '16px' }}>
            {TAB_COMPONENTS[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}