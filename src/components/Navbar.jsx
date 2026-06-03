import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  Church,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

function Navbar() {
  const auth = useAuth()
  const profile = auth?.profile
  const { darkMode, toggleTheme } = useTheme()
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    if (auth?.logout) {
      await auth.logout()
    }
    localStorage.removeItem('church_user')
    localStorage.removeItem('church_role')
    window.location.href = '/'
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      pastor: 'Pastor',
      secretary: 'Secretário',
      treasurer: 'Tesoureiro',
      leader: 'Líder',
      member: 'Membro',
    }
    return labels[role] || role
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md flex items-center justify-between transition">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Bem-vindo
        </h2>
        <p className="text-gray-500 dark:text-gray-300">
          {profile?.full_name || 'Usuário'}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Tema */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} className="text-gray-700" />
          )}
        </button>

        {/* Botão de Notificações */}
        <button className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition">
          <Bell className="text-gray-700 dark:text-white" size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
            1
          </span>
        </button>

        {/* 🔒 DROPDOWN DE PERFIL */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                getInitials(profile?.full_name)
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-500 dark:text-gray-400 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-dropdown">
              
              {/* Header do Dropdown com gradiente */}
              <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(profile?.full_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">
                      {profile?.full_name || 'Utilizador'}
                    </p>
                    <p className="text-sm text-white/80 truncate">
                      {profile?.username || profile?.email || 'Sem email'}
                    </p>
                  </div>
                </div>
                
                {/* Badges de cargo e igreja */}
                <div className="relative flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    <Shield size={12} />
                    {getRoleLabel(profile?.role)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold truncate max-w-full">
                    <Church size={12} />
                    {profile?.branch_name || 'Minha Igreja'}
                  </span>
                </div>
              </div>

              {/* Itens do Menu */}
              <div className="p-2">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition">
                    <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Meu Perfil</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ver e editar informações pessoais
                    </p>
                  </div>
                </Link>

                <Link
                  to="/profile?tab=security"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Segurança</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Alterar senha e configurações
                    </p>
                  </div>
                </Link>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Sair</p>
                    <p className="text-xs text-red-500/70 dark:text-red-400/70">
                      Terminar sessão atual
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-dropdown {
          animation: dropdown 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Navbar