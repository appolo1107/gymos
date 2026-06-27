// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

const ADMIN_STEPS  = ['Rol', 'Gimnasio', 'Cuenta', 'Plan']
const CLIENT_STEPS = ['Rol', 'Cuenta']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]     = useState(0)
  const [role, setRole]     = useState('admin')
  const [plan, setPlan]     = useState('free')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const [gymData, setGymData] = useState({ name:'', city:'', phone:'', instagram:'' })
  const [accData, setAccData] = useState({ name:'', email:'', pass:'', pass2:'' })

  const STEPS = role === 'client' ? CLIENT_STEPS : ADMIN_STEPS

  function updateGym(k, v) { setGymData(p => ({...p, [k]:v})) }
  function updateAcc(k, v) { setAccData(p => ({...p, [k]:v})) }

  function nextStep() {
    setError('')
    if (role === 'admin' && step === 1 && !gymData.name) { setError('El nombre del gimnasio es obligatorio'); return }
    setStep(s => s + 1)
  }

  function validateAccount() {
    if (!accData.name || !accData.email || !accData.pass) { setError('Completá todos los campos'); return false }
    if (accData.pass !== accData.pass2) { setError('Las contraseñas no coinciden'); return false }
    if (accData.pass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return false }
    return true
  }

  // ============ REGISTRO ADMIN ============
  async function handleRegisterAdmin() {
    setLoading(true)
    setError('')
    try {
      // 1. Crear usuario en Supabase Auth (siempre, para ambos planes)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accData.email,
        password: accData.pass,
        options: { data: { full_name: accData.name } }
      })
      if (authError) throw authError
      const userId = authData.user.id

      // 2. Crear gimnasio en Supabase
      const { data: gymRow, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name:      gymData.name,
          city:      gymData.city,
          phone:     gymData.phone,
          instagram: gymData.instagram,
          plan:      plan,
          owner_id:  userId
        })
        .select()
        .single()
      if (gymError) throw gymError

      // 3. Crear perfil admin
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id:        userId,
          full_name: accData.name,
          role:      'admin',
          gym_id:    gymRow.id
        })
      if (profileError) throw profileError

      // 4. Plan Pro → llamar a Edge Function de MercadoPago y redirigir al pago
      if (plan === 'pro') {
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago', {
          body: {
            action:   'create_subscription',
            gym_id:   gymRow.id,
            email:    accData.email,
            back_url: `${window.location.origin}/admin`,
          },
        })

        if (mpError) throw new Error(mpError.message || 'Error al iniciar la suscripción')
        if (mpData?.error) throw new Error(JSON.stringify(mpData.error))

        if (mpData?.init_point) {
          window.location.href = mpData.init_point
          return
        }

        throw new Error('No se recibió el link de pago de MercadoPago')
      }

      // Plan Free → ir directo al panel
      navigate('/admin')

    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ============ REGISTRO CLIENTE ============
  async function handleRegisterClient(e) {
    e.preventDefault()
    setError('')
    if (!validateAccount()) return
    setLoading(true)
    try {
      const { data: clientRecord, error: findError } = await supabase
        .from('clients')
        .select('id, gym_id')
        .eq('email', accData.email)
        .maybeSingle()

      if (findError) throw findError
      if (!clientRecord) {
        setError('No encontramos tu email en ningún gimnasio. Pedile a tu gimnasio que te agregue como cliente con este mismo email, y después registrate.')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accData.email,
        password: accData.pass,
        options: { data: { full_name: accData.name } }
      })
      if (authError) throw authError
      const userId = authData.user.id

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id:               userId,
          full_name:        accData.name,
          role:             'client',
          gym_id:           clientRecord.gym_id,
          client_record_id: clientRecord.id
        })
      if (profileError) throw profileError

      navigate('/cliente')
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{maxWidth: (role==='admin' && step === 3) ? 440 : 400}}>
        <div className="auth-logo">
          <img src="/assets/logo.png" alt="GymOS" className="auth-logo-img" />
        </div>

        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
              <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 0 && (
          <>
            <h2 className="auth-title">¿Quién sos?</h2>
            <p className="auth-sub" style={{marginBottom:18}}>Elegí tu rol para configurar tu cuenta</p>
            <div className="role-grid">
              <div className={`role-opt ${role==='admin'?'sel':''}`} onClick={()=>setRole('admin')}>
                <div className="role-icon">🏢</div>
                <div className="role-lbl">Administrador</div>
                <div className="role-desc">Dueño o encargado del gimnasio</div>
              </div>
              <div className={`role-opt ${role==='client'?'sel':''}`} onClick={()=>setRole('client')}>
                <div className="role-icon">👤</div>
                <div className="role-lbl">Cliente</div>
                <div className="role-desc">Alumno de un gimnasio</div>
              </div>
            </div>
            <button className="gbtn" onClick={nextStep} style={{width:'100%',justifyContent:'center'}}>
              Continuar →
            </button>
            <div className="auth-divider"><span>¿Ya tenés cuenta?</span></div>
            <div className="auth-link"><Link to="/login">Iniciar sesión →</Link></div>
          </>
        )}

        {role === 'client' && step === 1 && (
          <>
            <h2 className="auth-title">Creá tu cuenta</h2>
            <p className="auth-sub" style={{marginBottom:18}}>Usá el mismo email que le diste a tu gimnasio</p>
            <form onSubmit={handleRegisterClient}>
              <div className="ff"><label className="fl">Tu nombre completo *</label>
                <input className="fi" placeholder="Tu nombre completo" value={accData.name} onChange={e=>updateAcc('name',e.target.value)} /></div>
              <div className="ff"><label className="fl">Email *</label>
                <input className="fi" type="email" placeholder="martina@email.com" value={accData.email} onChange={e=>updateAcc('email',e.target.value)} /></div>
              <div className="ff"><label className="fl">Contraseña * (mín. 8 caracteres)</label>
                <input className="fi" type="password" placeholder="••••••••" value={accData.pass} onChange={e=>updateAcc('pass',e.target.value)} /></div>
              <div className="ff"><label className="fl">Confirmar contraseña *</label>
                <input className="fi" type="password" placeholder="Repetí la contraseña" value={accData.pass2} onChange={e=>updateAcc('pass2',e.target.value)} /></div>
              <button className="gbtn" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center'}}>
                {loading ? 'Creando cuenta...' : '🚀 Crear mi cuenta'}
              </button>
            </form>
            <div style={{textAlign:'center',marginTop:12}}>
              <button className="back-link" onClick={()=>setStep(0)}>← Atrás</button>
            </div>
          </>
        )}

        {role === 'admin' && step === 1 && (
          <>
            <h2 className="auth-title">Datos de tu gimnasio</h2>
            <p className="auth-sub" style={{marginBottom:18}}>Esta info aparecerá en el panel de tus clientes</p>
            <div className="ff"><label className="fl">Nombre del gimnasio *</label>
              <input className="fi" placeholder="CrossFit Reconquista" value={gymData.name} onChange={e=>updateGym('name',e.target.value)} /></div>
            <div className="ff"><label className="fl">Ciudad / Localidad</label>
              <input className="fi" placeholder="Reconquista, Santa Fe" value={gymData.city} onChange={e=>updateGym('city',e.target.value)} /></div>
            <div className="ff"><label className="fl">Teléfono</label>
              <input className="fi" placeholder="+54 3482 000000" value={gymData.phone} onChange={e=>updateGym('phone',e.target.value)} /></div>
            <div className="ff"><label className="fl">Instagram (opcional)</label>
              <input className="fi" placeholder="@migym" value={gymData.instagram} onChange={e=>updateGym('instagram',e.target.value)} /></div>
            <button className="gbtn" onClick={nextStep} style={{width:'100%',justifyContent:'center'}}>Continuar →</button>
            <div style={{textAlign:'center',marginTop:12}}>
              <button className="back-link" onClick={()=>setStep(0)}>← Atrás</button>
            </div>
          </>
        )}

        {role === 'admin' && step === 2 && (
          <>
            <h2 className="auth-title">Creá tu cuenta</h2>
            <p className="auth-sub" style={{marginBottom:18}}>Con esto vas a ingresar al panel cada vez</p>
            <div className="ff"><label className="fl">Tu nombre completo *</label>
              <input className="fi" placeholder="Tu nombre completo" value={accData.name} onChange={e=>updateAcc('name',e.target.value)} /></div>
            <div className="ff"><label className="fl">Email *</label>
              <input className="fi" type="email" placeholder="sebastian@migym.com" value={accData.email} onChange={e=>updateAcc('email',e.target.value)} /></div>
            <div className="ff"><label className="fl">Contraseña * (mín. 8 caracteres)</label>
              <input className="fi" type="password" placeholder="••••••••" value={accData.pass} onChange={e=>updateAcc('pass',e.target.value)} /></div>
            <div className="ff"><label className="fl">Confirmar contraseña *</label>
              <input className="fi" type="password" placeholder="Repetí la contraseña" value={accData.pass2} onChange={e=>updateAcc('pass2',e.target.value)} /></div>
            <button className="gbtn" onClick={() => { if (validateAccount()) { setError(''); setStep(3) } }} style={{width:'100%',justifyContent:'center'}}>Continuar →</button>
            <div style={{textAlign:'center',marginTop:12}}>
              <button className="back-link" onClick={()=>setStep(1)}>← Atrás</button>
            </div>
          </>
        )}

        {role === 'admin' && step === 3 && (
          <>
            <h2 className="auth-title">Elegí tu plan</h2>
            <p className="auth-sub" style={{marginBottom:18}}>Empezá gratis, sin tarjeta de crédito</p>

            <div className={`plan-card ${plan==='free'?'sel':''}`} onClick={()=>setPlan('free')}>
              <div className="plan-name">Plan Gratuito</div>
              <div className="plan-price">$0 <span>/ mes</span></div>
              <div className="plan-feats">✓ Hasta 10 clientes<br/>✓ Rutinas ilimitadas<br/>✓ Medidas corporales</div>
              <div className={`plan-check ${plan==='free'?'sel':''}`}>{plan==='free'?'✓':''}</div>
            </div>

            <div className={`plan-card ${plan==='pro'?'sel':''}`} onClick={()=>setPlan('pro')}>
              <div className="plan-badge">⭐ Popular</div>
              <div className="plan-name">Plan Pro</div>
              <div className="plan-price">$17.000 <span>/ primer mes</span></div>
              <div className="plan-sub-price" style={{fontSize:12,color:'#888',marginBottom:6}}>Luego $29.999 / mes</div>
              <div className="plan-feats">✓ Clientes ilimitados<br/>✓ Rutinas ilimitadas<br/>✓ Medidas corporales<br/>✓ Estadísticas avanzadas<br/>✓ Soporte prioritario</div>
              <div className={`plan-check ${plan==='pro'?'sel':''}`}>{plan==='pro'?'✓':''}</div>
            </div>

            <button className="gbtn" onClick={handleRegisterAdmin} disabled={loading} style={{width:'100%',justifyContent:'center'}}>
              {loading ? 'Procesando...' : plan === 'pro' ? '💳 Crear gimnasio y pagar' : '🚀 Crear mi gimnasio'}
            </button>
            <div style={{textAlign:'center',marginTop:12}}>
              <button className="back-link" onClick={()=>setStep(2)}>← Atrás</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
