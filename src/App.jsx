import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import SplashScreen from './components/SplashScreen'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Members from './pages/members/Members'
import Attendance from './pages/attendance/Attendance'
import Ministries from './pages/ministries/Ministries'
import Branches from './pages/branches/Branches'
import Finances from './pages/finances/Finances'
import Events from './pages/events/Events'
import Users from './pages/users/Users'
import Escalas from './pages/escalas/Escalas'
import Register from './pages/auth/Register' 
import Profile from './pages/profile/Profile'
import Reports from './pages/reports/Reports'
import Chat from './pages/chat/Chat'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Rotas da aplicação */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/ministries" element={<ProtectedRoute><Ministries /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
        <Route path="/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/escalas" element={<ProtectedRoute><Escalas /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default App
//git remote add origin https://github.com/Kenethy-Maulana/igreja-plus.git