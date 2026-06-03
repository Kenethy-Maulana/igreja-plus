import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'

function Ministries() {
  const { profile } = useAuth()
  
  const [ministries, setMinistries] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [description, setDescription] = useState('')

  // 🔒 Regra de Edição: Admin, Pastor e Secretário podem editar
  const canEdit = profile?.role === 'admin' || profile?.role === 'pastor' || profile?.role === 'secretary'

  async function fetchMinistries() {
    if (!profile) return
    setLoading(true)

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    // 1. Buscar Ministérios
    let query = supabase
      .from('ministries')
      .select('*')
      .order('created_at', { ascending: false })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    const { data: ministriesData, error: ministriesError } = await query
    if (ministriesError) {
      console.error('Erro ao buscar ministérios:', ministriesError)
      toast.error('Erro ao carregar ministérios')
    } else {
      setMinistries(ministriesData || [])
    }

    // 2. Buscar Membros das igrejas visíveis para o datalist e para mostrar na tabela
    let membersQuery = supabase.from('members').select('id, full_name, ministry_id')
    if (hasBranchFilter) {
      membersQuery = membersQuery.in('branch_id', visibleBranchIds)
    }
    const { data: membersData } = await membersQuery
    if (membersData) setMembers(membersData)

    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchMinistries()
    }
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!name) {
      toast.error('Preenche o nome do ministério')
      return
    }

    if (!profile?.branch_id && !profile?.isSuperAdmin) {
      toast.error('Erro: A tua conta não está associada a nenhuma igreja.')
      return
    }

    setLoading(true)

    const payload = {
      name,
      leader: leader || null,
      description: description || null,
      branch_id: profile?.branch_id, // 🔒 CRUCIAL para o RLS funcionar
    }

    let error
    if (editingId) {
      const result = await supabase.from('ministries').update(payload).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('ministries').insert([payload])
      error = result.error
    }

    if (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro: ' + error.message)
    } else {
      toast.success(editingId ? 'Ministério atualizado!' : 'Ministério criado!')
      resetForm()
      fetchMinistries()
    }
    setLoading(false)
  }

  async function deleteMinistry(id) {
    if (!window.confirm('Deseja apagar este ministério?')) return

    const { error } = await supabase.from('ministries').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
    } else {
      toast.success('Ministério apagado!')
      fetchMinistries()
    }
  }

  function editMinistry(ministry) {
    setEditingId(ministry.id)
    setName(ministry.name)
    setLeader(ministry.leader || '')
    setDescription(ministry.description || '')
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setLeader('')
    setDescription('')
  }

  // Função para buscar os membros de um ministério específico
  function getMembersOfMinistry(ministryId) {
    return members.filter(m => m.ministry_id === ministryId)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">A carregar...</div>
      </div>
    )
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md transition">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Ministérios {profile?.isSuperAdmin ? '- Todas as Igrejas' : `- ${profile.branch_name || 'Minha Igreja'}`}
          </h1>

          {/* 🔒 FORMULÁRIO: Só aparece para quem pode editar */}
          {canEdit ? (
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
              <input
                type="text"
                placeholder="Nome do ministério *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                required
              />

              {/* 🔒 CAMPO LÍDER COM DATALIST (Puxa membros da igreja) */}
              <input
                type="text"
                placeholder="Líder (escolhe um membro ou digita)"
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                list="members-leaders"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
              />
              <datalist id="members-leaders">
                {members.map((member) => (
                  <option key={member.id} value={member.full_name} />
                ))}
              </datalist>

              <input
                type="text"
                placeholder="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none md:col-span-2"
              />

              <div className="flex gap-2 md:col-span-3">
                <button
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 transition text-white p-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {loading ? 'A salvar...' : (editingId ? 'Atualizar Ministério' : 'Salvar Ministério')}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 transition text-white p-3 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl mb-6">
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                ℹ️ Estás a visualizar os ministérios em modo de leitura.
              </p>
            </div>
          )}

          <div className="overflow-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Líder</th>
                  <th className="pb-3">Descrição</th>
                  <th className="pb-3">Membros</th>
                  {canEdit && <th className="pb-3">Ações</th>}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="py-8 text-center text-gray-500">
                      A carregar...
                    </td>
                  </tr>
                ) : ministries.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="py-8 text-center text-gray-500">
                      Nenhum ministério encontrado.
                    </td>
                  </tr>
                ) : (
                  ministries.map((ministry) => {
                    const ministryMembers = getMembersOfMinistry(ministry.id)
                    
                    return (
                      <tr
                        key={ministry.id}
                        className="border-b border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <td className="py-4 font-medium">{ministry.name}</td>
                        <td className="py-4 text-purple-600 dark:text-purple-400 font-semibold">
                          {ministry.leader || '-'}
                        </td>
                        <td className="py-4 text-sm">{ministry.description || '-'}</td>
                        
                        {/* 🔒 COLUNA DE MEMBROS: Mostra todos que pertencem a este ministério */}
                        <td className="py-4">
                          {ministryMembers.length > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold mb-2">
                                {ministryMembers.length} membro{ministryMembers.length > 1 ? 's' : ''}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {ministryMembers.slice(0, 3).map((member) => (
                                  <span
                                    key={member.id}
                                    className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs"
                                  >
                                    {member.full_name}
                                  </span>
                                ))}
                                {ministryMembers.length > 3 && (
                                  <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold">
                                    +{ministryMembers.length - 3} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Sem membros</span>
                          )}
                        </td>

                        {canEdit && (
                          <td className="py-4 flex gap-2">
                            <button
                              onClick={() => editMinistry(ministry)}
                              className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteMinistry(ministry.id)}
                              className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Apagar
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ministries