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
  const [tab, setTab] = useState('overview') // overview | clients | routines | assign

  const gymId = profile?.gym_id

  useEffect(() => {
    if (gymId) { fetchClients(); fetchRoutines() }
  }, [gymId])

  async function fetchClients() {
    const { data } = await supabase
      .from('profiles')
      .select('*, memberships(*)')
      .eq('gym_id', gymId)
      .eq('role', 'client')
    setClients(data || [])
    setLoading(false)
  }

  async function fetchRoutines() {
    const { data } = await supabase
      .from('routines')
      .select('*')
      .eq('gym_id', gymId)
    setRoutines(data || [])
  }

  async function assignRoutine(clientId, routineId) {
    await supabase
      .from('profiles')
      .update({ routine_id: routineId })
      .eq('id', clientId)
    fetchClients()
  }

  const activeClients  = clients.filter(c => c.memberships?.[0]?.status === 'active').length
  const overdueClients = clients.filter(c => c.memberships?.[0]?.status === 'overdue').length

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">Gym<span>OS</span></div>
        <div className="sidebar-gym">{profile?.gyms?.name || 'Mi Gimnasio'}</div>

        <nav className="sidebar-nav">
          {[
            { id:'overview', icon:'📊', label:'Resumen' },
            { id:'clients',  icon:'👥', label:'Clientes' },
            { id:'routines', icon:'📋', label:'Rutinas' },
            { id:'assign',   icon:'✅', label:'Asignar rutinas' },
            { id:'measures', icon:'📏', label:'Medidas' },
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
          <div>
            <div className="admin-page-title">
              {tab === 'overview' && 'Resumen general'}
              {tab === 'clients'  && 'Clientes'}
              {tab === 'routines' && 'Rutinas'}
              {tab === 'assign'   && 'Asignar rutinas'}
              {tab === 'measures' && 'Medidas corporales'}
            </div>
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
                    <div className="stat-value">{activeClients || clients.length}</div>
                    <div className="stat-sub good">Total: {clients.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Pagos vencidos</div>
                    <div className="stat-value">{overdueClients}</div>
                    <div className="stat-sub bad">{overdueClients > 0 ? 'Requieren atención' : 'Todo al día ✓'}</div>
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
                    <button className="gbtn" onClick={() => setTab('clients')}>+ Agregar cliente</button>
                  </div>
                )}
              </div>
            )}

            {/* CLIENTS */}
            {tab === 'clients' && (
              <div className="tab-content">
                <div className="section-header">
                  <h3 className="section-title">Todos los clientes</h3>
                  <button className="gbtn" style={{fontSize:13,padding:'7px 14px'}}>+ Agregar cliente</button>
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
                      <div>Cliente</div><div>Membresía</div><div>Rutina</div><div>Adherencia</div>
                    </div>
                    {clients.map(c => (
                      <div key={c.id} className="table-row">
                        <div className="client-name-cell">
                          <div className="av">{c.full_name?.charAt(0) || '?'}</div>
                          {c.full_name}
                        </div>
                        <div><span className="badge badge-active">✓ Activa</span></div>
                        <div className="muted">{c.routine_id ? 'Asignada' : 'Sin rutina'}</div>
                        <div>
                          <div className="pbar"><div className="pbfill" style={{width:'75%'}} /></div>
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
                  <button className="gbtn" style={{fontSize:13,padding:'7px 14px'}}>+ Nueva rutina</button>
                </div>
                {routines.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Sin rutinas aún</div>
                    <div className="empty-sub">Creá tu primera rutina y asignala a tus clientes</div>
                  </div>
                ) : (
                  routines.map(r => (
                    <div key={r.id} className="routine-row">
                      <div>
                        <div className="routine-name">{r.name}</div>
                        <div className="routine-meta">{r.days_per_week} días/sem · {r.description}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="ibtn">✏️ Editar</button>
                        <button className="ibtn">📋 Copiar</button>
                      </div>
                    </div>
                  ))
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
        <div className="av">{client.full_name?.charAt(0) || '?'}</div>
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
