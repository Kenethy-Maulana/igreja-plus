import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { profile, loading } = useAuth()

  // 🔒 CORREÇÃO: Esperar o loading terminar antes de decidir
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">
          A carregar...
        </div>
      </div>
    )
  }

  // Se não houver profile após o loading, redireciona para login
  if (!profile) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute