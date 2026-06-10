import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCog,
  Users,
  Church,
  CalendarDays,
  Calendar,
  Building2,
  Wallet,
  QrCode,
  LogOut,
  FileText,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '../supabase/client'
import { useAuth } from '../contexts/AuthContext'

function Sidebar() {
  const auth = useAuth()
  const profile = auth?.profile

  useEffect(() => {
    console.log('🔵 [SIDEBAR] Profile:', profile)
    console.log('🔵 [SIDEBAR] Role:', profile?.role)
  }, [profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('church_user')
    localStorage.removeItem('church_role')
    window.location.href = '/'
  }

  // Verificações de permissão
  const isAdmin = profile?.role === 'admin'
  const isPastor = profile?.role === 'pastor'
  const isSecretary = profile?.role === 'secretary'
  const isTreasurer = profile?.role === 'treasurer'
  const isMember = profile?.role === 'member'

  // Quem pode gerir (criar/editar/apagar)
  const canManage = isAdmin || isPastor || isSecretary

  // Quem pode ver finanças
  const canViewFinances = isAdmin || isTreasurer || isPastor

  // Quem pode ver eventos (todos)
  const canViewEvents = true

  // 🔒 QUEM PODE ACESSAR RELATÓRIOS
  const canAccessReports = isAdmin || isPastor || isSecretary || isTreasurer

  return (
    <div className="w-72 bg-purple-800 dark:bg-gray-900 text-white min-h-screen p-5 hidden md:block transition">
      <h1 className="text-3xl font-bold mb-10">
        Igreja Plus
      </h1>

      <div className="space-y-3">
        
        {/* DASHBOARD - Todos */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 w-full p-3 rounded-xl bg-purple-700 hover:bg-purple-600 transition"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        {/* 💬 CHAT DA IGREJA - Todos os utilizadores */}
        <Link
          to="/chat"
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
        >
          <MessageCircle size={20} />
          Chat da Igreja
        </Link>

        {/* 🔒 UTILIZADORES - Admin e Pastor */}
        {(isAdmin || isPastor) && (
          <Link
            to="/users"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <UserCog size={20} />
            Utilizadores
          </Link>
        )}

        {/* MEMBROS - Admin, Pastor, Secretário */}
        {canManage && (
          <Link
            to="/members"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <Users size={20} />
            Membros
          </Link>
        )}

        {/* FILIAIS - Apenas Admin */}
        {isAdmin && (
          <Link
            to="/branches"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <Building2 size={20} />
            Filiais
          </Link>
        )}

        {/* MINISTÉRIOS - Admin, Pastor, Secretário */}
        {canManage && (
          <Link
            to="/ministries"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <Church size={20} />
            Ministérios
          </Link>
        )}

        {/* EVENTOS - Todos */}
        {canViewEvents && (
          <Link
            to="/events"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <CalendarDays size={20} />
            Eventos
          </Link>
        )}

        {/* ESCALAS - Admin, Pastor, Secretário, Tesoureiro */}
        {(canManage || isTreasurer) && (
          <Link
            to="/escalas"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <Calendar size={20} />
            Escalas
          </Link>
        )}

        {/* FINANÇAS - Admin, Pastor e Tesoureiro */}
        {canViewFinances && (
          <Link
            to="/finances"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <Wallet size={20} />
            Finanças
          </Link>
        )}

        {/* 🔒 RELATÓRIOS - Admin, Pastor, Secretário e Tesoureiro */}
        {canAccessReports && (
          <Link
            to="/reports"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <FileText size={20} />
            Relatórios
          </Link>
        )}

        {/* PRESENÇAS - Admin, Pastor, Secretário */}
        {canManage && (
          <Link
            to="/attendance"
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-purple-700 transition"
          >
            <QrCode size={20} />
            Presenças
          </Link>
        )}

        {/* SAIR - Todos */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-3 rounded-xl bg-red-500 hover:bg-red-600 transition mt-10"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </div>
  )
}

export default Sidebar