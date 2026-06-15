// src/pages/Landing.jsx
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function Landing() {
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
        <p className="landing-eyebrow">Software para gimnasios</p>
        <h1 className="landing-title">Gestioná tu gimnasio.<br /><em>Sin complicaciones.</em></h1>
        <p className="landing-sub">Rutinas personalizadas, control de pagos, seguimiento corporal y más. Todo en un solo lugar.</p>

        <div className="landing-price-card">
          <div className="landing-price-amount">$1</div>
          <div className="landing-price-period">por mes, por gimnasio</div>
          <div className="landing-price-label">sin contratos · cancelá cuando quieras</div>
        </div>

        <div className="landing-cta">
          <Link to="/register" className="gbtn landing-cta-btn">🚀 Empezar gratis ahora</Link>
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

      <div className="landing-footer">
        <img src="/assets/logo.png" alt="GymOS" className="landing-footer-logo" />
        <p className="landing-footer-text">© 2026 GymOS · Hecho para gimnasios que quieren crecer</p>
      </div>
    </div>
  )
}
