import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../contexts/AuthContext' // <-- IMPORTANTE

function Escalas() {
  const { profile } = useAuth() // <-- Pega o perfil do utilizador logado
  
  const [escalas, setEscalas] = useState([])
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [serviceDate, setServiceDate] = useState('')
  const [serviceTime, setServiceTime] = useState('')
  const [branchId, setBranchId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [mcName, setMcName] = useState('')
  const [preacherName, setPreacherName] = useState('')

  // Verifica se o utilizador pode editar/criar (Admin, Pastor, Secretário)
  const canEdit = profile?.role === 'admin' || profile?.role === 'pastor' || profile?.role === 'secretary'
  
  // 🔒 NOVA LÓGICA: Distinguir tipos de admin
  const isSuperAdmin = profile?.isSuperAdmin
  const isHeadquartersAdmin = profile?.isHeadquartersAdmin
  const isAdmin = isSuperAdmin || isHeadquartersAdmin

  const handleDateChange = (date) => {
    setServiceDate(date)
    if (date) {
      const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
      const dateObj = new Date(date + 'T00:00:00')
      setDayOfWeek(days[dateObj.getDay()])
    } else {
      setDayOfWeek('')
    }
  }

  async function fetchData() {
    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    let query = supabase
      .from('escalas')
      .select(`*, branches (name)`)
      .order('service_date', { ascending: false })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    if (search) {
      query = query.or(`service_name.ilike.%${search}%,preacher_name.ilike.%${search}%,mc_name.ilike.%${search}%`)
    }

    const { data } = await query
    if (data) setEscalas(data)

    // 🔒 Carrega as filiais que o utilizador pode ver
    let branchesQuery = supabase.from('branches').select('*')
    if (hasBranchFilter) {
      branchesQuery = branchesQuery.in('id', visibleBranchIds)
    }
    const { data: branchesData } = await branchesQuery
    if (branchesData) setBranches(branchesData)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!serviceDate || !serviceTime || !branchId || !serviceName) {
      toast.error('Preenche a Data, Horário, Local e Nome do Culto')
      return
    }

    // 🔒 NOVA LÓGICA: Determinar a igreja alvo
    let targetBranchId
    if (isSuperAdmin || isHeadquartersAdmin) {
      targetBranchId = branchId
    } else {
      targetBranchId = profile.branch_id
    }

    const payload = {
      service_date: serviceDate,
      service_time: serviceTime,
      branch_id: targetBranchId,
      service_name: serviceName,
      day_of_week: dayOfWeek,
      mc_name: mcName || null,
      preacher_name: preacherName || null,
    }

    if (editingId) {
      const { error } = await supabase.from('escalas').update(payload).eq('id', editingId)
      if (error) {
        toast.error('Erro ao atualizar: ' + error.message)
        return
      }
      toast.success('Escala atualizada com sucesso!')
    } else {
      const { error } = await supabase.from('escalas').insert([payload])
      if (error) {
        toast.error('Erro ao criar: ' + error.message)
        return
      }
      toast.success('Escala criada com sucesso!')
    }

    resetForm()
    fetchData()
  }

  function editEscala(escala) {
    setEditingId(escala.id)
    setServiceDate(escala.service_date)
    setServiceTime(escala.service_time)
    setBranchId(escala.branch_id)
    setServiceName(escala.service_name)
    setDayOfWeek(escala.day_of_week)
    setMcName(escala.mc_name || '')
    setPreacherName(escala.preacher_name || '')
  }

  async function deleteEscala(id) {
    if (!window.confirm('Tem a certeza que deseja apagar esta escala?')) return

    const { error } = await supabase.from('escalas').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
      return
    }
    toast.success('Escala apagada com sucesso!')
    fetchData()
  }

  function resetForm() {
    setEditingId(null)
    setServiceDate('')
    setServiceTime('')
    setBranchId(profile?.branch_id || '') // Pré-preenche com a igreja do utilizador
    setServiceName('')
    setDayOfWeek('')
    setMcName('')
    setPreacherName('')
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [search, profile])

  // Se o perfil ainda não carregou, mostra um loading
  if (!profile) return <div className="p-10 text-center">A carregar permissões...</div>

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Gestão de Escalas {isSuperAdmin ? '- Super Admin' : `- ${branches.find(b => b.id === profile.branch_id)?.name || 'Minha Igreja'}`}
          </h1>

          {/* 🔒 FORMULÁRIO: Só aparece se tiver permissão de edição */}
          {canEdit && (
            <>
              <input
                type="text"
                placeholder="Pesquisar por culto, MC ou pregador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border p-3 rounded-xl w-full mb-6 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />

              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />

                <input
                  type="text"
                  placeholder="Dia da Semana"
                  value={dayOfWeek}
                  readOnly
                  className="border p-3 rounded-xl bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
                />

                <input
                  type="time"
                  value={serviceTime}
                  onChange={(e) => setServiceTime(e.target.value)}
                  className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />

                <input
                  type="text"
                  placeholder="Nome do Culto"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />

                {/* 🔒 LOCAL: Admin/Super Admin pode escolher, outros ficam com a sua igreja bloqueada */}
                {isAdmin ? (
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Selecionar Local / Filial</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={branches.find(b => b.id === branchId)?.name || 'Minha Igreja'}
                    readOnly
                    className="border p-3 rounded-xl bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
                  />
                )}

                <input
                  type="text"
                  placeholder="Nome do MC"
                  value={mcName}
                  onChange={(e) => setMcName(e.target.value)}
                  className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />

                <input
                  type="text"
                  placeholder="Nome do Pregador"
                  value={preacherName}
                  onChange={(e) => setPreacherName(e.target.value)}
                  className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white lg:col-span-2"
                />

                <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-semibold transition lg:col-span-2">
                  {editingId ? 'Atualizar Escala' : 'Criar Escala'}
                </button>
                
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl font-semibold transition">
                    Cancelar
                  </button>
                )}
              </form>
            </>
          )}

          {/* 🔒 TABELA: Visível para todos, mas botões de ação só para quem pode editar */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="p-3">Data / Dia</th>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Culto / Evento</th>
                  {isAdmin && <th className="p-3">Local</th>}
                  <th className="p-3">MC / Pregador</th>
                  {canEdit && <th className="p-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {escalas.map((escala) => (
                  <tr key={escala.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="p-3">
                      <div className="font-semibold dark:text-white">{new Date(escala.service_date + 'T00:00:00').toLocaleDateString('pt-PT')}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">{escala.day_of_week}</div>
                    </td>
                    <td className="p-3 dark:text-gray-300">{escala.service_time}</td>
                    <td className="p-3">
                      <div className="font-medium dark:text-white">{escala.service_name}</div>
                    </td>
                    {isAdmin && (
                      <td className="p-3 dark:text-gray-300">{escala.branches?.name || 'Não definido'}</td>
                    )}
                    <td className="p-3">
                      <div className="text-sm dark:text-gray-300"><span className="font-semibold">MC:</span> {escala.mc_name || '-'}</div>
                      <div className="text-sm dark:text-gray-300"><span className="font-semibold">Pregador:</span> {escala.preacher_name || '-'}</div>
                    </td>
                    
                    {/* 🔒 BOTÕES DE AÇÃO: Só aparecem se canEdit for true */}
                    {canEdit && (
                      <td className="p-3 flex gap-2">
                        <button onClick={() => editEscala(escala)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm transition">Editar</button>
                        <button onClick={() => deleteEscala(escala.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm transition">Apagar</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {escalas.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma escala encontrada para a tua igreja.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Escalas