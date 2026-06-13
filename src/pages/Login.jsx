// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import '../styles/auth.css'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]     = useState('')
  const [pass,  setPass]      = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email || !pass) { setError('Completá todos los campos'); return }
    setLoading(true)
    const { error } = await signIn(email, pass)
    setLoading(false)
    if (error) { setError('Email o contraseña incorrectos'); return }
    navigate('/admin')
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏋️</div>
          <div className="auth-logo-name">Gym<span>OS</span></div>
        </div>

        <h2 className="auth-title">Bienvenido de nuevo</h2>
        <p className="auth-sub">Ingresá con tu cuenta de gimnasio</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="ff">
            <label className="fl">Email</label>
            <input
              className="fi"
              type="email"
              placeholder="admin@migym.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="ff">
            <label className="fl">Contraseña</label>
            <div className="fi-wrap">
              <input
                className="fi"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
              <button type="button" className="fi-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="auth-forgot">
            <Link to="/forgot">¿Olvidaste tu contraseña?</Link>
          </div>

          <button className="gbtn" type="submit" disabled={loading} style={{width:'100%', justifyContent:'center'}}>
            {loading ? 'Ingresando...' : '→ Ingresar'}
          </button>
        </form>

        <div className="auth-divider"><span>¿No tenés cuenta?</span></div>
        <div className="auth-link">
          <Link to="/register">Registrá tu gimnasio gratis →</Link>
        </div>
      </div>
    </div>
  )
}
