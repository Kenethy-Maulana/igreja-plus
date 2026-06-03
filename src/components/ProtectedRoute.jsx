import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, customUser, profile, loading } = useAuth()

  // Mostra um loading enquanto verifica a sessão
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl">A carregar...</div>
      </div>
    )
  }

  // O utilizador está logado se for Admin OU Utilizador Custom
  const isLoggedIn = user || customUser

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  // Verificação de permissões por cargo (role)
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute