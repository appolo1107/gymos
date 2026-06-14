// src/pages/ClientDashboard.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/client.css'

export default function ClientDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('routine') // routine | measures
  const [routine, setRoutine] = useState(null)
  const [exercises, setExercises] = useState([])
  const [completions, setCompletions] = useState(new Set())
  const [measures, setMeasures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)

  const clientRecordId = profile?.client_record_id
  const routineId = profile?.routine_id

  useEffect(() => {
    if (!clientRecordId) { setLoading(false); return }
    loadAll()
  }, [clientRecordId])

  async function loadAll() {
    setLoading(true)

    // 1. Datos del cliente (incluye routine_id actualizado)
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientRecordId)
      .single()

    if (clientData?.routine_id) {
      const { data: routineData } = await supabase
        .from('routines')
        .select('*')
        .eq('id', clientData.routine_id)
        .single()
      setRoutine(routineData)

      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .eq('routine_id', clientData.routine_id)
        .order('order_index', { ascending: true })
      setExercises(exercisesData || [])
    } else {
      setRoutine(null)
      setExercises([])
    }

    // 2. Completados
    const { data: completionsData } = await supabase
      .from('exercise_completions')
      .select('exercise_id')
      .eq('client_record_id', clientRecordId)
    setCompletions(new Set((completionsData || []).map(c => c.exercise_id)))

    // 3. Medidas
    const { data: measuresData } = await supabase
      .from('client_measures')
      .select('*')
      .eq('client_record_id', clientRecordId)
      .order('created_at', { ascending: true })
    setMeasures(measuresData || [])

    setLoading(false)
  }

  async function toggleExercise(exerciseId) {
    const isDone = completions.has(exerciseId)
    if (isDone) {
      await supabase.from('exercise_completions')
        .delete()
        .eq('client_record_id', clientRecordId)
        .eq('exercise_id', exerciseId)
      setCompletions(prev => { const next = new Set(prev); next.delete(exerciseId); return next })
    } else {
      await supabase.from('exercise_completions')
        .insert({ client_record_id: clientRecordId, exercise_id: exerciseId })
      setCompletions(prev => new Set(prev).add(exerciseId))
    }
  }

  async function saveMeasures(form) {
    await supabase.from('client_measures').insert({
      client_record_id: clientRecordId,
      weight_kg: form.weight_kg || null,
      body_fat_pct: form.body_fat_pct || null,
      waist_cm: form.waist_cm || null,
      hip_cm: form.hip_cm || null,
      chest_cm: form.chest_cm || null,
      muscle_kg: form.muscle_kg || null,
    })
    loadAll()
  }

  // Agrupar ejercicios por "Semana X - Día"
  const weeksAvailable = [...new Set(exercises.map(ex => {
    const match = ex.day_label?.match(/Semana (\d+)/)
    return match ? parseInt(match[1]) : 1
  }))].sort((a,b) => a-b)

  const exercisesThisWeek = exercises.filter(ex => {
    const match = ex.day_label?.match(/Semana (\d+)/)
    const week = match ? parseInt(match[1]) : 1
    return week === selectedWeek
  })

  const groupedByDay = {}
  exercisesThisWeek.forEach(ex => {
    const dayName = ex.day_label?.replace(/Semana \d+ - /, '') || 'Sin día'
    if (!groupedByDay[dayName]) groupedByDay[dayName] = []
    groupedByDay[dayName].push(ex)
  })

  const DAY_ORDER = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
  const sortedDays = Object.keys(groupedByDay).sort((a,b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))

  const totalExercises = exercises.length
  const completedCount = exercises.filter(ex => completions.has(ex.id)).length
  const adherence = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0

  return (
    <div className="client-shell">
      <nav className="client-topnav">
        <img src="/assets/logo.png" alt="GymOS" className="client-logo-img" />
        <button className="signout-btn-light" onClick={signOut}>← Cerrar sesión</button>
      </nav>

      <div className="client-content">
        <div className="chdr">
          <div className="cavlg">
            {profile?.gyms?.logo_url
              ? <img src={profile.gyms.logo_url} alt={profile?.gyms?.name || 'Gym'} className="cavlg-img" />
              : (profile?.full_name?.charAt(0).toUpperCase() || '?')}
          </div>
          <div>
            <div className="cnlg">{profile?.full_name}</div>
            <div className="cgym">🏢 {profile?.gyms?.name || 'Tu gimnasio'}</div>
          </div>
          <div className="cstats">
            <div style={{textAlign:'center'}}><div className="csv">{adherence}%</div><div className="csl">adherencia</div></div>
            <div style={{textAlign:'center'}}><div className="csv">{completedCount}</div><div className="csl">completados</div></div>
          </div>
        </div>

        <div className="ctabs">
          <button className={`ctab ${tab==='routine'?'on':''}`} onClick={()=>setTab('routine')}>Rutina</button>
          <button className={`ctab ${tab==='measures'?'on':''}`} onClick={()=>setTab('measures')}>Medidas corporales</button>
        </div>

        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : tab === 'routine' ? (
          <RoutineView
            routine={routine}
            weeksAvailable={weeksAvailable}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            sortedDays={sortedDays}
            groupedByDay={groupedByDay}
            completions={completions}
            onToggle={toggleExercise}
          />
        ) : (
          <MeasuresView measures={measures} onSave={saveMeasures} />
        )}
      </div>
    </div>
  )
}

function RoutineView({ routine, weeksAvailable, selectedWeek, setSelectedWeek, sortedDays, groupedByDay, completions, onToggle }) {
  if (!routine) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">Todavía no tenés una rutina asignada</div>
        <div className="empty-sub">Tu gimnasio te va a asignar una rutina pronto. Volvé a entrar más tarde.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="routine-header-card">
        <div className="routine-header-name">{routine.name}</div>
        <div className="routine-header-meta">{routine.description}</div>
      </div>

      {weeksAvailable.length > 1 && (
        <div className="week-selector">
          {weeksAvailable.map(w => (
            <button key={w} className={`week-btn ${selectedWeek===w?'on':''}`} onClick={()=>setSelectedWeek(w)}>
              Semana {w}
            </button>
          ))}
        </div>
      )}

      {sortedDays.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">Sin ejercicios para esta semana</div>
        </div>
      ) : (
        sortedDays.map(day => (
          <DayCard key={day} day={day} exercises={groupedByDay[day]} completions={completions} onToggle={onToggle} />
        ))
      )}
    </div>
  )
}

function DayCard({ day, exercises, completions, onToggle }) {
  const [open, setOpen] = useState(true)
  const doneCount = exercises.filter(ex => completions.has(ex.id)).length

  return (
    <div className="rday">
      <div className="dhdr" onClick={() => setOpen(o => !o)} role="button" tabIndex={0}>
        <div className="dtitle">📅 {day} <span className="dbadge">{exercises.length} ejercicios</span></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {doneCount === exercises.length && exercises.length > 0 && <span className="day-done">✓ Completado</span>}
          <span className={`day-chevron ${open ? 'open' : ''}`}>▾</span>
        </div>
      </div>
      {open && (
        <div className="exlist op">
          {exercises.map(ex => (
            <div key={ex.id} className="exitem">
              <div className="eximg">
                {ex.image_url ? <img src={ex.image_url} alt={ex.name} /> : <span style={{fontSize:24,opacity:0.3}}>🏋️</span>}
              </div>
              <div className="exinfo">
                <div className="exname">{ex.name}</div>
                <div className="exspecs">
                  {ex.sets && <span className="chip">{ex.sets} series</span>}
                  {ex.reps && <span className="chip">{ex.reps} reps</span>}
                  {ex.weight && <span className="chip">{ex.weight}</span>}
                </div>
                {ex.description && <div className="exdesc">{ex.description}</div>}
              </div>
              <div className={`excheck ${completions.has(ex.id)?'ck':''}`} onClick={()=>onToggle(ex.id)}>
                {completions.has(ex.id) && '✓'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MeasuresView({ measures, onSave }) {
  const [form, setForm] = useState({ weight_kg:'', body_fat_pct:'', waist_cm:'', hip_cm:'', chest_cm:'', muscle_kg:'' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(k, v) { setForm(p => ({...p, [k]: v})) }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
    setSaved(true)
    setForm({ weight_kg:'', body_fat_pct:'', waist_cm:'', hip_cm:'', chest_cm:'', muscle_kg:'' })
    setTimeout(()=>setSaved(false), 2500)
  }

  const latest = measures[measures.length-1]
  const first  = measures[0]

  const METRICS = [
    { key:'weight_kg',    label:'Peso corporal',  unit:'kg', icon:'⚖️' },
    { key:'body_fat_pct', label:'Grasa corporal', unit:'%',  icon:'📊' },
    { key:'waist_cm',     label:'Cintura',        unit:'cm', icon:'📏' },
    { key:'muscle_kg',    label:'Masa muscular',  unit:'kg', icon:'💪' },
  ]

  return (
    <div>
      {measures.length > 0 && (
        <div className="mgrid">
          {METRICS.map(m => {
            const values = measures.map(x => x[m.key]).filter(v => v != null)
            if (values.length === 0) return null
            const max = Math.max(...values) * 1.1
            const startVal = first?.[m.key]
            const curVal = latest?.[m.key]
            const delta = (startVal != null && curVal != null) ? (curVal - startVal).toFixed(1) : null
            return (
              <div key={m.key} className="mcard">
                <div className="mhdr">
                  <div className="mtitl">{m.icon} {m.label}</div>
                  {delta !== null && <span className={delta < 0 ? 'mdelta-good' : 'mdelta-neutral'}>{delta > 0 ? '+' : ''}{delta} {m.unit}</span>}
                </div>
                <div className="mbars">
                  {measures.map((x, i) => (
                    <div key={i} className={`mbar ${i===measures.length-1?'cur':''}`} style={{height: x[m.key] != null ? `${Math.max(8,(x[m.key]/max)*100)}%` : '5%'}} />
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                  <span style={{fontSize:11,color:'var(--t2)'}}>Inicio: {startVal ?? '-'} {m.unit}</span>
                  <span style={{fontSize:13,fontWeight:500,color:'var(--g)'}}>{curVal ?? '-'} {m.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mform">
        <p className="mform-title">➕ Registrar nuevas medidas</p>
        <div className="minputs">
          <div className="ff"><label className="fl">Peso (kg)</label><input className="fi" type="number" step="0.1" value={form.weight_kg} onChange={e=>update('weight_kg', e.target.value)} placeholder="68.8" /></div>
          <div className="ff"><label className="fl">Grasa (%)</label><input className="fi" type="number" step="0.1" value={form.body_fat_pct} onChange={e=>update('body_fat_pct', e.target.value)} placeholder="21.9" /></div>
          <div className="ff"><label className="fl">Cintura (cm)</label><input className="fi" type="number" step="0.1" value={form.waist_cm} onChange={e=>update('waist_cm', e.target.value)} placeholder="77" /></div>
          <div className="ff"><label className="fl">Cadera (cm)</label><input className="fi" type="number" step="0.1" value={form.hip_cm} onChange={e=>update('hip_cm', e.target.value)} placeholder="95" /></div>
          <div className="ff"><label className="fl">Pecho (cm)</label><input className="fi" type="number" step="0.1" value={form.chest_cm} onChange={e=>update('chest_cm', e.target.value)} placeholder="88" /></div>
          <div className="ff"><label className="fl">Masa muscular (kg)</label><input className="fi" type="number" step="0.1" value={form.muscle_kg} onChange={e=>update('muscle_kg', e.target.value)} placeholder="43.8" /></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="gbtn" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar medidas'}</button>
          {saved && <span className="msaved-msg">✓ Medidas guardadas correctamente</span>}
        </div>
      </div>
    </div>
  )
}
