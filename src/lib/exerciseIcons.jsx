// src/lib/exerciseIcons.jsx
// Banco de iconos por grupo muscular / tipo de ejercicio.
// Se guarda un código corto (ej: "chest") en exercises.image_url
// en vez de una URL externa.

export const EXERCISE_CATEGORIES = [
  { code: 'chest',    label: '💪 Pecho' },
  { code: 'back',     label: '🔙 Espalda' },
  { code: 'shoulders',label: '🤲 Hombros' },
  { code: 'arms',     label: '💪 Brazos' },
  { code: 'legs',     label: '🦵 Piernas' },
  { code: 'glutes',   label: '🍑 Glúteos' },
  { code: 'core',     label: '🔥 Core / Abdomen' },
  { code: 'cardio',   label: '🏃 Cardio' },
  { code: 'fullbody', label: '🏋️ Cuerpo completo' },
  { code: 'mobility', label: '🧘 Movilidad / Estiramiento' },
]

const ICONS = {
  chest: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="4" y="16" width="28" height="4" rx="2" fill="currentColor"/>
      <rect x="2" y="12" width="6" height="12" rx="2" fill="currentColor"/>
      <rect x="28" y="12" width="6" height="12" rx="2" fill="currentColor"/>
      <circle cx="18" cy="14" r="4" fill="currentColor"/>
    </svg>
  ),
  back: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="6" y="10" width="24" height="3" rx="1.5" fill="currentColor"/>
      <path d="M9 13 L9 26 L27 26 L27 13" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <path d="M12 13 L12 23 M24 13 L24 23" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  shoulders: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="18" cy="10" r="4" fill="currentColor"/>
      <path d="M12 16 Q18 30 24 16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="8" y="18" width="4" height="8" rx="2" fill="currentColor"/>
      <rect x="24" y="18" width="4" height="8" rx="2" fill="currentColor"/>
    </svg>
  ),
  arms: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="4" y="16" width="6" height="10" rx="2" fill="currentColor"/>
      <rect x="26" y="16" width="6" height="10" rx="2" fill="currentColor"/>
      <path d="M10 18 Q18 8 26 18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="18" cy="12" r="3" fill="currentColor"/>
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="18" cy="8" r="3.5" fill="currentColor"/>
      <path d="M18 11.5 L14 24 L18 22 L22 24 Z" fill="currentColor"/>
      <path d="M14 24 L11 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M22 24 L25 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  glutes: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M10 10 Q10 8 18 8 Q26 8 26 10 L26 18 Q26 26 18 26 Q10 26 10 18 Z" fill="currentColor" opacity="0.85"/>
      <path d="M18 8 L18 26" stroke="#0008" strokeWidth="1.5"/>
    </svg>
  ),
  core: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="12" y="6" width="12" height="24" rx="4" fill="currentColor" opacity="0.85"/>
      <rect x="13" y="10" width="10" height="3" rx="1.5" fill="#0008"/>
      <rect x="13" y="15" width="10" height="3" rx="1.5" fill="#0008"/>
      <rect x="13" y="20" width="10" height="3" rx="1.5" fill="#0008"/>
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d="M4 20 L10 20 L13 12 L18 26 L22 16 L25 20 L32 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  fullbody: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="18" cy="6" r="3" fill="currentColor"/>
      <rect x="14" y="10" width="8" height="12" rx="3" fill="currentColor"/>
      <path d="M14 13 L8 18 M22 13 L28 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M15 22 L12 32 M21 22 L24 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  mobility: (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="18" cy="18" r="11" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 3"/>
      <circle cx="18" cy="9" r="2.5" fill="currentColor"/>
    </svg>
  ),
}

export function ExerciseIcon({ category, size = 32, className = '' }) {
  const icon = ICONS[category]
  if (!icon) {
    return <span className={className} style={{ fontSize: size * 0.7, opacity: 0.3, lineHeight: 1 }}>🏋️</span>
  }
  return (
    <span className={className} style={{ display: 'inline-flex', width: size, height: size }}>
      {icon}
    </span>
  )
}

export function getCategoryLabel(code) {
  return EXERCISE_CATEGORIES.find(c => c.code === code)?.label || 'Sin categoría'
}
