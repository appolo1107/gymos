// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login          from './pages/Login'
import Register       from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import './styles/global.css'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{color:'#888',padding:40,textAlign:'center'}}>Cargando GymOS...</div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/admin" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/admin"    element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
