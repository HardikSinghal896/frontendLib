import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', aadharNumber: '', admissionDate: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await API.post('/api/auth/login', {
        email: form.email,
        password: form.password,
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('name', data.name)
      localStorage.setItem('userId', data.userId)
      if (data.role === 'ADMIN') navigate('/admin')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    if (!form.name?.trim()) return 'Name is required'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return 'Invalid mobile (10 digits, starts with 6–9)'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email format'
    if (!/^\d{12}$/.test(form.aadharNumber)) return 'Aadhar must be exactly 12 digits'
    if (!form.admissionDate) return 'Admission date is required'
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setLoading(true)
    try {
      await API.post('/api/auth/register', form)
      setMode('login')
      setError('')
      setForm((f) => ({ ...f, name: '', mobile: '', aadharNumber: '' }))
      setTimeout(() => setError('✅ Registered! Wait for admin approval before logging in.'), 50)
    } catch (err) {
      const data = err.response?.data
      // Backend returns either { error: "..." } or { field: "message", ... } map
      if (data && typeof data === 'object' && !data.error) {
        const first = Object.entries(data)[0]
        setError(first ? `${first[0]}: ${first[1]}` : 'Registration failed')
      } else {
        setError(data?.error || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-title">📚 Library</div>
        <div className="login-subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={set('name')} required placeholder="Your name" />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input value={form.mobile} onChange={set('mobile')} placeholder="10-digit number" />
              </div>
              <div className="form-group">
                <label>Aadhar Number</label>
                <input value={form.aadharNumber} onChange={set('aadharNumber')} placeholder="XXXX XXXX XXXX" />
              </div>
              <div className="form-group">
                <label>Admission Date</label>
                <input type="date" value={form.admissionDate} onChange={set('admissionDate')} required />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} required placeholder="Password" />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn" type="submit" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button className="btn-link" onClick={() => { setMode('register'); setError('') }}>
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button className="btn-link" onClick={() => { setMode('login'); setError('') }}>
                Sign In
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, padding: '10px 12px', background: '#f8f7f4', borderRadius: 2, fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Admin login:</strong> admin@library.com / admin123
        </div>
      </div>
    </div>
  )
}