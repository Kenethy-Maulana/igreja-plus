import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Users,
  Church,
  Building2,
  Wallet,
} from 'lucide-react'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'

function Dashboard() {
  const { profile, loading: authLoading } = useAuth()

  const [members, setMembers] = useState(0)
  const [ministries, setMinistries] = useState(0)
  const [branches, setBranches] = useState(0)
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    if (!profile) return

    setLoading(true)

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    try {
      // 1. Membros (Filtrado pelas igrejas visíveis)
      let membersQuery = supabase.from('members').select('*', { count: 'exact', head: true })
      if (hasBranchFilter) {
        membersQuery = membersQuery.in('branch_id', visibleBranchIds)
      }
      const { count: membersCount } = await membersQuery

      // 2. Ministérios (Filtrado pelas igrejas visíveis)
      let ministriesQuery = supabase.from('ministries').select('*', { count: 'exact', head: true })
      if (hasBranchFilter) {
        ministriesQuery = ministriesQuery.in('branch_id', visibleBranchIds)
      }
      const { count: ministriesCount } = await ministriesQuery

      // 3. Filiais (Contar quantas igrejas visíveis)
      let branchesCount = 0
      if (profile.isSuperAdmin) {
        // Super admin vê todas
        const { count } = await supabase.from('branches').select('*', { count: 'exact', head: true })
        branchesCount = count || 0
      } else {
        // Outros veem apenas as igrejas que têm acesso
        branchesCount = visibleBranchIds.length
      }

      // 4. Finanças (Filtrado pelas igrejas visíveis)
      let totalIncome = 0
      let totalExpense = 0
      
      if (profile.role === 'admin' || profile.role === 'pastor' || profile.role === 'secretary' || profile.role === 'treasurer') {
        let financesQuery = supabase.from('finances').select('type, amount')
        if (hasBranchFilter) {
          financesQuery = financesQuery.in('branch_id', visibleBranchIds)
        }
        
        const { data: finances } = await financesQuery

        finances?.forEach((item) => {
          const amount = Number(item.amount) || 0
          if (item.type === 'income') {
            totalIncome += amount
          } else if (item.type === 'expense') {
            totalExpense += amount
          }
        })
      }

      setMembers(membersCount || 0)
      setMinistries(ministriesCount || 0)
      setBranches(branchesCount)
      setIncome(totalIncome)
      setExpense(totalExpense)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile && !authLoading) {
      loadData()
    }
  }, [profile, authLoading])

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">A carregar o teu perfil...</div>
      </div>
    )
  }

  const chartData = [
    { name: 'Entradas', valor: income },
    { name: 'Despesas', valor: expense },
  ]

  const canViewFinances = profile.role === 'admin' || profile.role === 'pastor' || profile.role === 'secretary' || profile.role === 'treasurer'
  const canViewMembers = profile.role === 'admin' || profile.role === 'pastor' || profile.role === 'secretary'

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
          Dashboard {profile.isSuperAdmin ? '- Super Admin' : `- ${profile.branch_name || 'Minha Igreja'}`}
        </h1>

        {profile.role === 'member' && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-6 rounded-2xl mb-8">
            <h2 className="text-xl font-bold text-purple-800 dark:text-purple-300 mb-2">
              Bem-vindo, {profile.full_name}! 👋
            </h2>
            <p className="text-purple-700 dark:text-purple-400">
              Como membro, podes consultar os próximos eventos e cultos da nossa igreja no menu lateral "Eventos". 
              Para outras informações, entra em contacto com a secretaria ou o pastor da tua igreja.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            
            {canViewMembers && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Membros</p>
                    <h2 className="text-3xl font-bold mt-2 text-gray-800 dark:text-white">{members}</h2>
                  </div>
                  <Users size={40} className="text-purple-600" />
                </div>
              </div>
            )}

            {canViewMembers && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Ministérios</p>
                    <h2 className="text-3xl font-bold mt-2 text-gray-800 dark:text-white">{ministries}</h2>
                  </div>
                  <Church size={40} className="text-blue-600" />
                </div>
              </div>
            )}

            {(profile.isSuperAdmin || profile.isHeadquartersAdmin) && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Filiais</p>
                    <h2 className="text-3xl font-bold mt-2 text-gray-800 dark:text-white">{branches}</h2>
                  </div>
                  <Building2 size={40} className="text-green-600" />
                </div>
              </div>
            )}

            {canViewFinances && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Saldo</p>
                    <h2 className="text-3xl font-bold mt-2 text-gray-800 dark:text-white">
                      {(income - expense).toLocaleString('pt-PT')} MT
                    </h2>
                  </div>
                  <Wallet size={40} className="text-yellow-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && canViewFinances && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg transition">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              Relatório Financeiro
            </h2>
            <div className="w-full h-[400px] min-w-0">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#8884d8" />
                  <YAxis stroke="#8884d8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar
                    dataKey="valor"
                    fill="#8b5cf6"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard