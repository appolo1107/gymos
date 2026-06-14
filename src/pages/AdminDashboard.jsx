// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/admin.css'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [clients,  setClients]  = useState([])
  const [routines, setRoutines] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab, setTab] = useState('overview')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showRoutineModal, setShowRoutineModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [editingRoutine, setEditingRoutine] = useState(null)

  const gymId = profile?.gym_id

  useEffect(() => {
    if (gymId) {
      fetchClients()
      fetchRoutines()
    } else {
      setLoading(false)
    }
  }, [gymId])

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
    if (!error) setClients(data || [])
    setLoading(false)
  }

  async function fetchRoutines() {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
    if (!error) setRoutines(data || [])
  }

  async function saveClient(formData) {
    if (editingClient) {
      await supabase.from('clients').update(formData).eq('id', editingClient.id)
    } else {
      await supabase.from('clients').insert({ ...formData, gym_id: gymId })
    }
    setShowClientModal(false)
    setEditingClient(null)
    fetchClients()
  }

  async function deleteClient(id) {
    if (!window.confirm('¿Eliminar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  async function saveRoutine(formData) {
    const { exercises, ...routineData } = formData
    let routineId

    if (editingRoutine) {
      await supabase.from('routines').update(routineData).eq('id', editingRoutine.id)
      routineId = editingRoutine.id
      // borrar ejercicios viejos y reinsertar (más simple que diff)
      await supabase.from('exercises').delete().eq('routine_id', routineId)
    } else {
      const { data, error } = await supabase
        .from('routines')
        .insert({ ...routineData, gym_id: gymId })
        .select()
        .single()
      if (error) { console.error(error); return }
      routineId = data.id
    }

    if (exercises && exercises.length > 0) {
      const rows = exercises
        .filter(ex => ex.name?.trim())
        .map((ex, i) => ({
          routine_id: routineId,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          description: ex.description,
          image_url: ex.image_url,
          day_label: ex.day_label,
          order_index: i,
        }))
      if (rows.length > 0) {
        await supabase.from('exercises').insert(rows)
      }
    }

    setShowRoutineModal(false)
    setEditingRoutine(null)
    fetchRoutines()
  }

  async function deleteRoutine(id) {
    if (!window.confirm('¿Eliminar esta rutina? Se quitará de los clientes que la tengan asignada.')) return
    await supabase.from('clients').update({ routine_id: null }).eq('routine_id', id)
    await supabase.from('routines').delete().eq('id', id)
    fetchRoutines()
    fetchClients()
  }

  async function assignRoutine(clientId, routineId) {
    await supabase
      .from('clients')
      .update({ routine_id: routineId || null })
      .eq('id', clientId)
    fetchClients()
  }

  const activeClients  = clients.filter(c => c.membership_status === 'active').length
  const overdueClients = clients.filter(c => c.membership_status === 'overdue').length

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <img src="/assets/logo.png" alt="GymOS" className="sidebar-logo-img" />
        <div className="sidebar-gym">{profile?.gyms?.name || 'Mi Gimnasio'}</div>

        <nav className="sidebar-nav">
          {[
            { id:'overview', icon:'📊', label:'Resumen' },
            { id:'clients',  icon:'👥', label:'Clientes' },
            { id:'routines', icon:'📋', label:'Rutinas' },
            { id:'assign',   icon:'✅', label:'Asignar rutinas' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <button className="signout-btn" onClick={signOut}>← Cerrar sesión</button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="admin-page-title">
            {tab === 'overview' && 'Resumen general'}
            {tab === 'clients'  && 'Clientes'}
            {tab === 'routines' && 'Rutinas'}
            {tab === 'assign'   && 'Asignar rutinas'}
          </div>
          <div className="topbar-right">
            <span className="admin-badge">Plan Pro</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="tab-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Clientes activos</div>
                    <div className="stat-value">{activeClients}</div>
                    <div className="stat-sub good">Total: {clients.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Pagos vencidos</div>
                    <div className="stat-value">{overdueClients}</div>
                    <div className={`stat-sub ${overdueClients > 0 ? 'bad' : 'good'}`}>
                      {overdueClients > 0 ? 'Requieren atención' : 'Todo al día ✓'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Rutinas cargadas</div>
                    <div className="stat-value">{routines.length}</div>
                    <div className="stat-sub muted">Activas en el sistema</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Tu plan</div>
                    <div className="stat-value green">$1</div>
                    <div className="stat-sub muted">por mes</div>
                  </div>
                </div>

                {clients.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <div className="empty-title">Todavía no tenés clientes</div>
                    <div className="empty-sub">Agregá tu primer cliente para empezar</div>
                    <button className="gbtn" onClick={() => { setTab('clients'); setShowClientModal(true) }}>
                      + Agregar cliente
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CLIENTS */}
            {tab === 'clients' && (
              <div className="tab-content">
                <div className="section-header">
                  <h3 className="section-title">Todos los clientes</h3>
                  <button className="gbtn" style={{fontSize:13,padding:'7px 14px'}} onClick={() => { setEditingClient(null); setShowClientModal(true) }}>
                    + Agregar cliente
                  </button>
                </div>
                {clients.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <div className="empty-title">Sin clientes aún</div>
                    <div className="empty-sub">Agregá el primero con el botón de arriba</div>
                  </div>
                ) : (
                  <div className="clients-table">
                    <div className="table-head">
                      <div>Cliente</div><div>Membresía</div><div>Rutina</div><div>Código acceso</div><div>Acciones</div>
                    </div>
                    {clients.map(c => (
                      <div key={c.id} className="table-row table-row-5">
                        <div className="client-name-cell">
                          <div className="av">{c.full_name?.charAt(0).toUpperCase() || '?'}</div>
                          <div>
                            <div>{c.full_name}</div>
                            {c.email && <div style={{fontSize:11,color:'var(--t2)'}}>{c.email}</div>}
                          </div>
                        </div>
                        <div>
                          <span className={`badge ${
                            c.membership_status === 'active' ? 'badge-active' :
                            c.membership_status === 'overdue' ? 'badge-overdue' : 'badge-pending'
                          }`}>
                            {c.membership_status === 'active' ? '✓ Activa' :
                             c.membership_status === 'overdue' ? '⚠ Vencida' : '⏳ Pendiente'}
                          </span>
                        </div>
                        <div className="muted">
                          {routines.find(r => r.id === c.routine_id)?.name || 'Sin rutina'}
                        </div>
                        <div>
                          {c.auth_user_id ? (
                            <span className="badge badge-active">✓ Vinculado</span>
                          ) : (
                            <code className="invite-code" title="El cliente usa este código para registrarse">{c.invite_code || '—'}</code>
                          )}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button className="ibtn" onClick={() => { setEditingClient(c); setShowClientModal(true) }}>✏️ Editar</button>
                          <button className="ibtn" onClick={() => deleteClient(c.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ROUTINES */}
            {tab === 'routines' && (
              <div className="tab-content">
                <div className="section-header">
                  <h3 className="section-title">Rutinas cargadas</h3>
                  <button className="gbtn" style={{fontSize:13,padding:'7px 14px'}} onClick={() => { setEditingRoutine(null); setShowRoutineModal(true) }}>
                    + Nueva rutina
                  </button>
                </div>
                {routines.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Sin rutinas aún</div>
                    <div className="empty-sub">Creá tu primera rutina y asignala a tus clientes</div>
                  </div>
                ) : (
                  routines.map(r => {
                    const assignedCount = clients.filter(c => c.routine_id === r.id).length
                    return (
                      <div key={r.id} className="routine-row">
                        <div>
                          <div className="routine-name">{r.name}</div>
                          <div className="routine-meta">
                            {r.duration_months || 1} mes{(r.duration_months||1) !== 1 ? 'es' : ''} · {r.days_per_week} días/sem · {r.description || 'Sin descripción'} · {assignedCount} cliente{assignedCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button className="ibtn" onClick={() => { setEditingRoutine(r); setShowRoutineModal(true) }}>✏️ Editar</button>
                          <button className="ibtn" onClick={() => deleteRoutine(r.id)}>🗑️</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ASSIGN */}
            {tab === 'assign' && (
              <div className="tab-content">
                <h3 className="section-title" style={{marginBottom:14}}>Asignar rutinas a clientes</h3>
                {clients.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <div className="empty-title">Sin clientes aún</div>
                    <div className="empty-sub">Primero agregá clientes para poder asignarles rutinas</div>
                  </div>
                ) : routines.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Sin rutinas aún</div>
                    <div className="empty-sub">Primero creá rutinas en la sección "Rutinas"</div>
                  </div>
                ) : (
                  <div className="assign-table">
                    <div className="assign-head">
                      <div>Cliente</div><div>Rutina asignada</div><div>Acción</div>
                    </div>
                    {clients.map(c => (
                      <AssignRow
                        key={c.id}
                        client={c}
                        routines={routines}
                        onAssign={assignRoutine}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: CLIENT */}
      {showClientModal && (
        <ClientModal
          client={editingClient}
          onSave={saveClient}
          onClose={() => { setShowClientModal(false); setEditingClient(null) }}
        />
      )}

      {/* MODAL: ROUTINE */}
      {showRoutineModal && (
        <RoutineModal
          routine={editingRoutine}
          onSave={saveRoutine}
          onClose={() => { setShowRoutineModal(false); setEditingRoutine(null) }}
        />
      )}
    </div>
  )
}

function AssignRow({ client, routines, onAssign }) {
  const [selected, setSelected] = useState(client.routine_id || '')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await onAssign(client.id, selected)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className={`assign-row ${saved ? 'confirmed' : ''}`}>
      <div className="client-name-cell">
        <div className="av">{client.full_name?.charAt(0).toUpperCase() || '?'}</div>
        {client.full_name}
      </div>
      <select
        className="asel"
        value={selected}
        onChange={e => setSelected(e.target.value)}
      >
        <option value="">— Sin rutina —</option>
        {routines.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button className={`aok ${saved ? 'done' : ''}`} onClick={handleSave}>
          {saved ? '✓ Asignado' : '✓ Confirmar'}
        </button>
        {saved && <span className="assigned-check">✓ Guardado</span>}
      </div>
    </div>
  )
}

function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    full_name: client?.full_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    membership_status: client?.membership_status || 'active',
    membership_expires: client?.membership_expires || '',
  })
  const [saving, setSaving] = useState(false)

  function update(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <p className="modal-title">{client ? '✏️ Editar cliente' : '+ Agregar cliente'}</p>
        <form onSubmit={handleSubmit}>
          <div className="ff"><label className="fl">Nombre completo *</label>
            <input className="fi" value={form.full_name} onChange={e=>update('full_name', e.target.value)} placeholder="Martina Aguirre" required /></div>
          <div className="form-grid-2">
            <div className="ff"><label className="fl">Email</label>
              <input className="fi" type="email" value={form.email} onChange={e=>update('email', e.target.value)} placeholder="martina@email.com" /></div>
            <div className="ff"><label className="fl">Teléfono</label>
              <input className="fi" value={form.phone} onChange={e=>update('phone', e.target.value)} placeholder="+54 9..." /></div>
          </div>
          <div className="form-grid-2">
            <div className="ff"><label className="fl">Estado de membresía</label>
              <select className="fi" value={form.membership_status} onChange={e=>update('membership_status', e.target.value)}>
                <option value="active">Activa</option>
                <option value="pending">Pendiente</option>
                <option value="overdue">Vencida</option>
              </select></div>
            <div className="ff"><label className="fl">Próximo vencimiento</label>
              <input className="fi" type="date" value={form.membership_expires} onChange={e=>update('membership_expires', e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="obtn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="gbtn" disabled={saving}>{saving ? 'Guardando...' : '✓ Guardar cliente'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RoutineModal({ routine, onSave, onClose }) {
  const [form, setForm] = useState({
    name: routine?.name || '',
    description: routine?.description || '',
    days_per_week: routine?.days_per_week || 3,
    duration_months: routine?.duration_months || 1,
  })
  const [exercises, setExercises] = useState([])
  const [loadingEx, setLoadingEx] = useState(!!routine)
  const [saving, setSaving] = useState(false)

  function update(k, v) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (!routine) { setLoadingEx(false); return }
    async function loadExercises() {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .eq('routine_id', routine.id)
        .order('order_index', { ascending: true })
      setExercises(data || [])
      setLoadingEx(false)
    }
    loadExercises()
  }, [routine])

  function addExercise() {
    setExercises(p => [...p, {
      day_label: 'Semana 1 - Lunes', name: '', sets: '', reps: '', weight: '', description: '', image_url: ''
    }])
  }

  function updateExercise(idx, key, value) {
    setExercises(p => p.map((ex, i) => i === idx ? { ...ex, [key]: value } : ex))
  }

  function removeExercise(idx) {
    setExercises(p => p.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    await onSave({ ...form, exercises })
    setSaving(false)
  }

  const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const weeksCount = Math.max(1, Math.min(4, (form.duration_months || 1) * 4))
  const DAY_OPTIONS = []
  for (let w = 1; w <= weeksCount; w++) {
    DAYS.forEach(d => DAY_OPTIONS.push(`Semana ${w} - ${d}`))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
        <p className="modal-title">{routine ? '✏️ Editar rutina' : '+ Nueva rutina'}</p>
        <form onSubmit={handleSubmit}>
          <div className="ff"><label className="fl">Nombre de la rutina *</label>
            <input className="fi" value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Fuerza A — Tren superior" required /></div>
          <div className="form-grid-2">
            <div className="ff"><label className="fl">Días por semana</label>
              <input className="fi" type="number" min="1" max="7" value={form.days_per_week} onChange={e=>update('days_per_week', e.target.value === '' ? '' : parseInt(e.target.value))} onBlur={e=>{ if(e.target.value==='') update('days_per_week', 1) }} /></div>
            <div className="ff"><label className="fl">Duración (meses)</label>
              <select className="fi" value={form.duration_months} onChange={e=>update('duration_months', parseInt(e.target.value))}>
                <option value={1}>1 mes</option>
                <option value={2}>2 meses</option>
                <option value={3}>3 meses</option>
              </select></div>
          </div>
          <div className="ff"><label className="fl">Descripción</label>
            <input className="fi" value={form.description} onChange={e=>update('description', e.target.value)} placeholder="Enfocada en pecho, hombros y tríceps" /></div>

          <div className="exercises-section">
            <div className="section-header" style={{marginBottom:10}}>
              <h4 className="section-title" style={{fontSize:13}}>Ejercicios</h4>
              <button type="button" className="ibtn" onClick={addExercise}>+ Agregar ejercicio</button>
            </div>

            {loadingEx ? (
              <p className="hint-text">Cargando ejercicios...</p>
            ) : exercises.length === 0 ? (
              <p className="hint-text">Todavía no agregaste ejercicios. Click en "+ Agregar ejercicio" para sumar el primero.</p>
            ) : (
              <div className="exercises-list">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="exercise-edit-card">
                    <div className="exercise-edit-head">
                      <select className="fi fi-sm" value={ex.day_label || 'Semana 1 - Lunes'} onChange={e=>updateExercise(idx,'day_label',e.target.value)}>
                        {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <button type="button" className="rmvbtn" onClick={()=>removeExercise(idx)}>✕</button>
                    </div>
                    <input className="fi" placeholder="Nombre del ejercicio (ej: Press de banca)" value={ex.name||''} onChange={e=>updateExercise(idx,'name',e.target.value)} />
                    <div className="exercise-specs-grid">
                      <input className="fi fi-sm" placeholder="Series (ej: 4)" value={ex.sets||''} onChange={e=>updateExercise(idx,'sets',e.target.value)} />
                      <input className="fi fi-sm" placeholder="Reps (ej: 10)" value={ex.reps||''} onChange={e=>updateExercise(idx,'reps',e.target.value)} />
                      <input className="fi fi-sm" placeholder="Peso (ej: 60 kg)" value={ex.weight||''} onChange={e=>updateExercise(idx,'weight',e.target.value)} />
                    </div>
                    <input className="fi" placeholder="Descripción / técnica del ejercicio" value={ex.description||''} onChange={e=>updateExercise(idx,'description',e.target.value)} />
                    <input className="fi" placeholder="URL de imagen (opcional, ej: https://...)" value={ex.image_url||''} onChange={e=>updateExercise(idx,'image_url',e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="obtn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="gbtn" disabled={saving}>{saving ? 'Guardando...' : '✓ Guardar rutina'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
