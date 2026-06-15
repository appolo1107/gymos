// src/pages/RegistroExitoso.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

export default function RegistroExitoso() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('procesando') // procesando | ok | error
  const [error, setError]   = useState('')

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId) { setEstado('error'); setError('No se encontró la sesión de pago.'); return }

    async function confirmar() {
      try {
        // 1. Crear gimnasio y usuario via API
        const res = await fetch('/api/registro-exitoso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al crear la cuenta')

        // 2. Esperar un momento y redirigir al login
        setEstado('ok')
        setTimeout(() => navigate('/login'), 3000)
      } catch (err) {
        setEstado('error')
        setError(err.message)
      }
    }

    confirmar()
  }, [])

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
        <div className="auth-logo">
          <img src="/assets/logo.png" alt="GymOS" className="auth-logo-img" />
        </div>

        {estado === 'procesando' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 className="auth-title">Activando tu gimnasio...</h2>
            <p className="auth-sub">Estamos configurando todo. No cierres esta página.</p>
          </>
        )}

        {estado === 'ok' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 className="auth-title">¡Todo listo!</h2>
            <p className="auth-sub">Tu gimnasio fue creado con éxito. En un momento te redirigimos al login.</p>
          </>
        )}

        {estado === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 className="auth-title">Algo salió mal</h2>
            <p className="auth-sub" style={{ color: '#ef4444' }}>{error}</p>
            <button className="gbtn" onClick={() => navigate('/register')} style={{ marginTop: 16 }}>
              Volver a intentar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
