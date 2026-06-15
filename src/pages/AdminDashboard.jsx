// src/pages/AdminDashboard.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType } from 'docx'
import { saveAs } from 'file-saver'
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
  const [gymLogoUrl, setGymLogoUrl] = useState(profile?.gyms?.logo_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [viewingActivity, setViewingActivity] = useState(null)
  const [clientSearch, setClientSearch] = useState('')

  const gymId = profile?.gym_id

  useEffect(() => {
    if (gymId) {
      fetchClients()
      fetchRoutines()
    } else {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    setGymLogoUrl(profile?.gyms?.logo_url || null)
  }, [profile?.gyms?.logo_url])

  async function removeLogo() {
    if (!gymId) return
    if (!window.confirm('¿Quitar el logo de tu gimnasio?')) return
    await supabase.from('gyms').update({ logo_url: null }).eq('id', gymId)
    setGymLogoUrl(null)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !gymId) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${gymId}/logo.${ext}`
      const { error: uploadError } = await supabase
        .storage
        .from('gym-logos')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase
        .storage
        .from('gym-logos')
        .getPublicUrl(path)

      const logoUrl = publicUrlData.publicUrl + '?t=' + Date.now()

      await supabase.from('gyms').update({ logo_url: logoUrl }).eq('id', gymId)
      setGymLogoUrl(logoUrl)
    } catch (err) {
      alert('Error al subir el logo: ' + err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

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
        const { error: exError } = await supabase.from('exercises').insert(rows)
        if (exError) {
          console.error('Error guardando ejercicios:', exError)
          alert('Error al guardar los ejercicios: ' + exError.message)
        }
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

  const activeClients  = clients.filter(c => getEffectiveStatus(c) === 'active').length
  const overdueClients = clients.filter(c => getEffectiveStatus(c) === 'overdue').length

  function getEffectiveStatus(c) {
    // Si tiene fecha de vencimiento y ya pasó, es "overdue" visualmente
    // aunque el campo membership_status diga "active"
    if (c.membership_status === 'overdue') return 'overdue'
    if (c.membership_expires) {
      const today = new Date().toISOString().slice(0, 10)
      if (c.membership_expires < today) return 'overdue'
    }
    return c.membership_status || 'active'
  }

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        {gymLogoUrl ? (
          <img src={gymLogoUrl} alt={profile?.gyms?.name || 'Gimnasio'} className="sidebar-logo-img sidebar-gym-logo" />
        ) : (
          <div className="sidebar-logo-placeholder">{profile?.gyms?.name?.charAt(0).toUpperCase() || '🏋️'}</div>
        )}
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
            <label className="gym-logo-upload" title="Subir/cambiar logo de tu gimnasio">
              {gymLogoUrl ? (
                <img src={gymLogoUrl} alt="Logo del gimnasio" className="gym-logo-img" />
              ) : (
                <span className="gym-logo-placeholder">+ Logo</span>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} hidden disabled={uploadingLogo} />
              {uploadingLogo && <span className="gym-logo-uploading">...</span>}
            </label>
            {gymLogoUrl && (
              <button className="logo-remove-btn" title="Quitar logo" onClick={removeLogo}>✕</button>
            )}
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
                {clients.length > 0 && (
                  <input
                    className="fi client-search"
                    placeholder="🔍 Buscar cliente por nombre o email..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                )}
                {(() => {
                  const filteredClients = clients.filter(c => {
                    const q = clientSearch.toLowerCase().trim()
                    if (!q) return true
                    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
                  })
                  if (clients.length === 0) {
                    return (
                      <div className="empty-state">
                        <div className="empty-icon">👤</div>
                        <div className="empty-title">Sin clientes aún</div>
                        <div className="empty-sub">Agregá el primero con el botón de arriba</div>
                      </div>
                    )
                  }
                  if (filteredClients.length === 0) {
                    return (
                      <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div className="empty-title">Sin resultados</div>
                        <div className="empty-sub">No encontramos clientes que coincidan con "{clientSearch}"</div>
                      </div>
                    )
                  }
                  return (
                    <div className="clients-table">
                      <div className="table-head">
                        <div>Cliente</div><div>Membresía</div><div>Rutina</div><div>Código acceso</div><div>Acciones</div>
                      </div>
                      {filteredClients.map(c => (
                        <div key={c.id} className="table-row table-row-5">
                          <div className="client-name-cell">
                            <div className="av">{c.full_name?.charAt(0).toUpperCase() || '?'}</div>
                            <div>
                              <div>{c.full_name}</div>
                              {c.email && <div style={{fontSize:11,color:'var(--t2)'}}>{c.email}</div>}
                            </div>
                          </div>
                          <div>
                            <span className="cell-label">Membresía</span>
                            {(() => {
                              const status = getEffectiveStatus(c)
                              return (
                                <span className={`badge ${
                                  status === 'active' ? 'badge-active' :
                                  status === 'overdue' ? 'badge-overdue' : 'badge-pending'
                                }`}>
                                  {status === 'active' ? '✓ Activa' :
                                   status === 'overdue' ? '⚠ Vencida' : '⏳ Pendiente'}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="muted">
                            <span className="cell-label">Rutina</span>
                            {routines.find(r => r.id === c.routine_id)?.name || 'Sin rutina'}
                          </div>
                          <div>
                            <span className="cell-label">Código acceso</span>
                            {c.auth_user_id ? (
                              <span className="badge badge-active">✓ Vinculado</span>
                            ) : (
                              <code className="invite-code" title="El cliente usa este código para registrarse">{c.invite_code || '—'}</code>
                            )}
                          </div>
                          <div style={{display:'flex',gap:6}}>
                            <button className="ibtn" onClick={() => setViewingActivity(c)}>📊 Actividad</button>
                            <button className="ibtn" onClick={() => { setEditingClient(c); setShowClientModal(true) }}>✏️ Editar</button>
                            <button className="ibtn" onClick={() => deleteClient(c.id)}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
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

      {/* MODAL: ACTIVITY */}
      {viewingActivity && (
        <ActivityModal
          client={viewingActivity}
          routines={routines}
          onClose={() => setViewingActivity(null)}
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
    await onSave({ ...form, membership_expires: form.membership_expires || null })
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

function ActivityModal({ client, routines, onClose }) {
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState([])
  const [completions, setCompletions] = useState(new Set())
  const [measures, setMeasures] = useState([])

  const routine = routines.find(r => r.id === client.routine_id)

  useEffect(() => {
    async function load() {
      if (client.routine_id) {
        const { data: exData } = await supabase
          .from('exercises')
          .select('*')
          .eq('routine_id', client.routine_id)
          .order('order_index', { ascending: true })
        setExercises(exData || [])

        const { data: compData } = await supabase
          .from('exercise_completions')
          .select('exercise_id')
          .eq('client_record_id', client.id)
        setCompletions(new Set((compData || []).map(c => c.exercise_id)))
      }

      const { data: measData } = await supabase
        .from('client_measures')
        .select('*')
        .eq('client_record_id', client.id)
        .order('created_at', { ascending: true })
      setMeasures(measData || [])

      setLoading(false)
    }
    load()
  }, [client])

  const totalExercises = exercises.length
  const completedCount = exercises.filter(ex => completions.has(ex.id)).length
  const adherence = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0

  const weeksMap = {}
  exercises.forEach(ex => {
    const match = ex.day_label?.match(/Semana (\d+) - (.+)/)
    const week = match ? match[1] : '1'
    const day = match ? match[2] : (ex.day_label || 'Sin día')
    if (!weeksMap[week]) weeksMap[week] = {}
    if (!weeksMap[week][day]) weeksMap[week][day] = []
    weeksMap[week][day].push(ex)
  })

  const latestMeasure = measures[measures.length - 1]

  async function exportToWord() {
    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
    const borders = { top: border, bottom: border, left: border, right: border }
    const colWidths = [1800, 3600, 1200, 1200, 1560, 1200] // suma = 9360
    const headers = ['Semana / Día', 'Ejercicio', 'Series', 'Reps', 'Peso', 'Completado']

    function headerCell(text, width) {
      return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        shading: { fill: "1A1A1A", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })] })]
      })
    }

    function dataCell(text, width, opts = {}) {
      return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold: opts.bold, color: opts.color })] })]
      })
    }

    const rows = [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) })
    ]

    Object.keys(weeksMap).sort((a,b)=>a-b).forEach(week => {
      Object.keys(weeksMap[week]).forEach(day => {
        weeksMap[week][day].forEach((ex, i) => {
          const done = completions.has(ex.id)
          rows.push(new TableRow({
            children: [
              dataCell(i === 0 ? `Semana ${week}\n${day}` : '', colWidths[0]),
              dataCell(ex.name || '-', colWidths[1]),
              dataCell(ex.sets || '-', colWidths[2]),
              dataCell(ex.reps || '-', colWidths[3]),
              dataCell(ex.weight || '-', colWidths[4]),
              dataCell(done ? '✓ Sí' : '— No', colWidths[5], {
                fill: done ? "D7F2E0" : "FBE0E0",
                color: done ? "1E7C3F" : "B23A3A",
                bold: true
              }),
            ]
          }))
        })
      })
    })

    const measureLines = []
    if (latestMeasure) {
      if (latestMeasure.weight_kg != null) measureLines.push(`Peso: ${latestMeasure.weight_kg} kg`)
      if (latestMeasure.body_fat_pct != null) measureLines.push(`Grasa corporal: ${latestMeasure.body_fat_pct}%`)
      if (latestMeasure.waist_cm != null) measureLines.push(`Cintura: ${latestMeasure.waist_cm} cm`)
      if (latestMeasure.hip_cm != null) measureLines.push(`Cadera: ${latestMeasure.hip_cm} cm`)
      if (latestMeasure.chest_cm != null) measureLines.push(`Pecho: ${latestMeasure.chest_cm} cm`)
      if (latestMeasure.muscle_kg != null) measureLines.push(`Masa muscular: ${latestMeasure.muscle_kg} kg`)
    }

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 32, bold: true, font: "Arial" },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 26, bold: true, font: "Arial" },
            paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
        ]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`Reporte de actividad — ${client.full_name}`)] }),
          new Paragraph({ children: [new TextRun({ text: `Gimnasio: ${client.gym_name || ''}`, size: 20, color: "666666" })] }),
          new Paragraph({ children: [new TextRun({ text: `Fecha del reporte: ${new Date().toLocaleDateString('es-AR')}`, size: 20, color: "666666" })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: `Rutina: `, bold: true }), new TextRun(routine?.name || 'Sin rutina asignada')] }),
          new Paragraph({ children: [
            new TextRun({ text: `Adherencia general: `, bold: true }),
            new TextRun(`${adherence}% (${completedCount}/${totalExercises} ejercicios completados)`)
          ]}),
          new Paragraph({ text: '' }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Detalle de la rutina")] }),
          rows.length > 1
            ? new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: colWidths, rows })
            : new Paragraph({ children: [new TextRun("Este cliente no tiene ejercicios cargados.")] }),
          new Paragraph({ text: '' }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Última medición corporal")] }),
          ...(measureLines.length > 0
            ? measureLines.map(line => new Paragraph({ children: [new TextRun(line)] }))
            : [new Paragraph({ children: [new TextRun("Sin registros de medidas.")] })]),
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    const safeName = (client.full_name || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_')
    saveAs(blob, `Rutina_${safeName}_${new Date().toISOString().slice(0,10)}.docx`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
        <p className="modal-title">📊 Actividad de {client.full_name}</p>

        {loading ? (
          <p className="hint-text">Cargando...</p>
        ) : (
          <>
            <div className="activity-summary">
              <div className="activity-stat">
                <div className="activity-stat-val">{adherence}%</div>
                <div className="activity-stat-lbl">Adherencia general</div>
              </div>
              <div className="activity-stat">
                <div className="activity-stat-val">{completedCount}/{totalExercises}</div>
                <div className="activity-stat-lbl">Ejercicios completados</div>
              </div>
              <div className="activity-stat">
                <div className="activity-stat-val">{measures.length}</div>
                <div className="activity-stat-lbl">Registros de medidas</div>
              </div>
            </div>

            {!routine ? (
              <p className="hint-text">Este cliente no tiene una rutina asignada.</p>
            ) : (
              <>
                <p className="section-title" style={{marginTop:14, marginBottom:8}}>Rutina: {routine.name}</p>
                <div className="activity-weeks">
                  {Object.keys(weeksMap).sort((a,b)=>a-b).map(week => (
                    <div key={week} className="activity-week-block">
                      <div className="activity-week-title">Semana {week}</div>
                      {Object.keys(weeksMap[week]).map(day => {
                        const dayExercises = weeksMap[week][day]
                        const doneInDay = dayExercises.filter(ex => completions.has(ex.id)).length
                        return (
                          <div key={day} className="activity-day-row">
                            <span className="activity-day-name">{day}</span>
                            <span className={`activity-day-status ${doneInDay === dayExercises.length ? 'done' : doneInDay > 0 ? 'partial' : ''}`}>
                              {doneInDay}/{dayExercises.length} completados
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {latestMeasure && (
              <>
                <p className="section-title" style={{marginTop:14, marginBottom:8}}>Última medición</p>
                <div className="activity-measures-grid">
                  {latestMeasure.weight_kg != null && <div className="activity-measure-chip">⚖️ {latestMeasure.weight_kg} kg</div>}
                  {latestMeasure.body_fat_pct != null && <div className="activity-measure-chip">📊 {latestMeasure.body_fat_pct}% grasa</div>}
                  {latestMeasure.waist_cm != null && <div className="activity-measure-chip">📏 {latestMeasure.waist_cm} cm cintura</div>}
                  {latestMeasure.muscle_kg != null && <div className="activity-measure-chip">💪 {latestMeasure.muscle_kg} kg músculo</div>}
                </div>
              </>
            )}
          </>
        )}

        <div className="modal-footer">
          <button type="button" className="obtn" onClick={onClose}>Cerrar</button>
          {!loading && (
            <button type="button" className="gbtn" onClick={exportToWord}>
              📄 Descargar reporte (.docx)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
