// src/pages/Landing.jsx
import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

function useCountUp(target, durationMs = 1500, startWhenVisible = true) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (!startWhenVisible) {
      animate()
      return
    }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          animate()
        }
      })
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function animate() {
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return [count, ref]
}

export default function Landing() {
  const [gymsCount, gymsRef] = useCountUp(127)
  const [clientsCount, clientsRef] = useCountUp(2840)
  const [routinesCount, routinesRef] = useCountUp(1560)

  const reviews = []

  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <img src="/assets/logo.png" alt="GymOS" className="landing-nav-logo-img" />
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="obtn">Iniciar sesión</Link>
          <Link to="/register" className="gbtn">Registrar mi gimnasio</Link>
        </div>
      </nav>

      <div className="landing-hero">
        <p className="landing-eyebrow landing-fade-in">Software para gimnasios</p>
        <h1 className="landing-title landing-fade-in landing-delay-1">Gestioná tu gimnasio.<br /><em>Sin complicaciones.</em></h1>
        <p className="landing-sub landing-fade-in landing-delay-2">Rutinas personalizadas, control de pagos, seguimiento corporal y más. Todo en un solo lugar.</p>

        <div className="landing-price-card landing-fade-in landing-delay-3">
          <div className="landing-price-row">
            <div className="landing-price-old">
              <span className="landing-price-old-amount">$17.000</span>
              <span className="landing-price-old-label">primer mes</span>
            </div>
            <div className="landing-price-arrow">→</div>
            <div className="landing-price-new">
              <span className="landing-price-amount">$29.999</span>
              <span className="landing-price-period">/ mes después</span>
            </div>
          </div>
          <div className="landing-price-label">probá GymOS por solo $17.000 el primer mes · cancelá cuando quieras</div>
        </div>

        <div className="landing-cta landing-fade-in landing-delay-3">
          <Link to="/register" className="gbtn landing-cta-btn">🚀 Empezar por $17.000</Link>
          <a
            href="/guia-gymos.html"
            target="_blank"
            rel="noopener noreferrer"
            className="obtn landing-cta-btn"
            style={{display:'inline-flex', alignItems:'center', gap:8, marginTop:12}}
          >
            📖 Ver guía completa
          </a>
        </div>
      </div>

      {/* COUNTERS */}
      <div className="landing-counters">
        <div className="landing-counter" ref={gymsRef}>
          <div className="landing-counter-val">+{gymsCount}</div>
          <div className="landing-counter-lbl">gimnasios usando GymOS</div>
        </div>
        <div className="landing-counter" ref={clientsRef}>
          <div className="landing-counter-val">+{clientsCount.toLocaleString('es-AR')}</div>
          <div className="landing-counter-lbl">alumnos activos</div>
        </div>
        <div className="landing-counter" ref={routinesRef}>
          <div className="landing-counter-val">+{routinesCount.toLocaleString('es-AR')}</div>
          <div className="landing-counter-lbl">rutinas creadas</div>
        </div>
      </div>

      <div className="landing-features">
        <div className="landing-fcard">
          <div className="landing-ficon">📋</div>
          <div className="landing-ftitle">Rutinas personalizadas</div>
          <div className="landing-fdesc">Cargá y asigná rutinas mensuales a cada cliente con ejercicios, series, repeticiones y descripción técnica.</div>
        </div>
        <div className="landing-fcard">
          <div className="landing-ficon">💳</div>
          <div className="landing-ftitle">Control de pagos</div>
          <div className="landing-fdesc">Seguí el estado de membresía de cada cliente. Alertas automáticas cuando se vence una cuota.</div>
        </div>
        <div className="landing-fcard">
          <div className="landing-ficon">📏</div>
          <div className="landing-ftitle">Medidas corporales</div>
          <div className="landing-fdesc">Tus clientes registran su propio progreso: peso, grasa corporal, cintura y más. Vos lo ves todo.</div>
        </div>
        <div className="landing-fcard">
          <div className="landing-ficon">📊</div>
          <div className="landing-ftitle">Actividad en tiempo real</div>
          <div className="landing-fdesc">Mirá qué ejercicios completó cada cliente, su adherencia y evolución, desde tu panel.</div>
        </div>
        <div className="landing-fcard">
          <div className="landing-ficon">📱</div>
          <div className="landing-ftitle">Desde el celular</div>
          <div className="landing-fdesc">Tus clientes acceden desde cualquier dispositivo, sin descargar nada. Funciona como una app.</div>
        </div>
        <div className="landing-fcard">
          <div className="landing-ficon">🔒</div>
          <div className="landing-ftitle">Tu marca, tu panel</div>
          <div className="landing-fdesc">Subí el logo de tu gimnasio. Cada cuenta es privada y separada del resto.</div>
        </div>
      </div>

      {/* REVIEWS */}
      <div className="landing-reviews-section">
        <p className="landing-section-title">Lo que dicen los gimnasios que ya lo usan</p>
        <div className="landing-reviews">
          {reviews.map((r, i) => (
            <div key={i} className="landing-review-card">
              <div className="landing-review-stars">★★★★★</div>
              <p className="landing-review-text">"{r.text}"</p>
              <div className="landing-review-author">
                <div className="landing-review-avatar">{r.avatar}</div>
                <div>
                  <div className="landing-review-name">{r.name}</div>
                  <div className="landing-review-role">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-footer">
        <img src="/assets/logo.png" alt="GymOS" className="landing-footer-logo" />
        <p className="landing-footer-text">© 2026 GymOS · Hecho para gimnasios que quieren crecer</p>
      </div>
    </div>
  )
}
