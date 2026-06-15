// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Landing         from './pages/Landing'
import Login          from './pages/Login'
import Register       from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import ClientDashboard from './pages/ClientDashboard'
import './styles/global.css'

function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{color:'#888',padding:40,textAlign:'center'}}>Cargando GymOS...</div>
  if (!user) return <Landing />
  if (profile?.role === 'client') return <Navigate to="/cliente" replace />
  return <Navigate to="/admin" replace />
}

function PrivateRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{color:'#888',padding:40,textAlign:'center'}}>Cargando GymOS...</div>
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && profile?.role !== requiredRole) {
    return profile?.role === 'client' ? <Navigate to="/cliente" replace /> : <Navigate to="/admin" replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return children
  return profile?.role === 'client' ? <Navigate to="/cliente" replace /> : <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <img src="/assets/logo.png" alt="" className="bg-logo" />
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<HomeRoute />} />
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/admin"    element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/cliente"  element={<PrivateRoute requiredRole="client"><ClientDashboard /></PrivateRoute>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
