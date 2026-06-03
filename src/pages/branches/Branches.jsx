import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'

function Branches() {
  const { profile } = useAuth()
  
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [name, setName] = useState('')
  const [pastor, setPastor] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [parentId, setParentId] = useState('')

  // 🔒 Apenas Super Admin e Admin da Sede podem gerir filiais
  const canManage = profile?.isSuperAdmin || profile?.isHeadquartersAdmin

  async function fetchBranches() {
    if (!canManage) return
    setLoading(true)

    let query = supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false })

    // 🔒 Super Admin vê todas, Admin da Sede vê a sede + filiais
    const visibleBranchIds = profile.visibleBranchIds || []
    if (visibleBranchIds.length > 0 && !profile.isSuperAdmin) {
      query = query.in('id', visibleBranchIds)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar filiais:', error)
      toast.error('Erro ao carregar filiais')
    } else {
      setBranches(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchBranches()
    }
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!name) {
      toast.error('Preenche o nome da filial')
      return
    }

    setLoading(true)

    const payload = {
      name,
      pastor: pastor || null,
      location: location || null,
      phone: phone || null,
      parent_id: parentId || null, // 🔒 Associar à sede mãe
    }

    let error
    if (editingId) {
      const result = await supabase.from('branches').update(payload).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('branches').insert([payload])
      error = result.error
    }

    if (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro: ' + error.message)
    } else {
      toast.success(editingId ? 'Filial atualizada!' : 'Filial criada!')
      resetForm()
      fetchBranches()
    }
    setLoading(false)
  }

  async function deleteBranch(id) {
    if (!window.confirm('Tem a certeza que deseja apagar esta filial? Todos os dados associados serão perdidos!')) return

    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
    } else {
      toast.success('Filial apagada!')
      fetchBranches()
    }
  }

  function editBranch(branch) {
    setEditingId(branch.id)
    setName(branch.name)
    setPastor(branch.pastor || '')
    setLocation(branch.location || '')
    setPhone(branch.phone || '')
    setParentId(branch.parent_id || '')
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setPastor('')
    setLocation('')
    setPhone('')
    setParentId('')
  }

  // 🔒 Filtrar sedes disponíveis para o dropdown (excluir a própria filial que está a editar)
  const availableSedes = branches.filter(b => b.parent_id === null && b.id !== editingId)

  if (!profile) return <div className="p-10 text-center">A carregar...</div>
  if (!canManage) return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
          <p className="text-red-500 text-center py-10">Acesso negado. Apenas Super Admin e Admin da Sede podem gerir filiais.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md transition">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Gestão de Filiais {profile.isSuperAdmin ? '- Super Admin' : `- ${profile.branch_name || 'Minha Igreja'}`}
          </h1>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <input
              type="text"
              placeholder="Nome da filial *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
              required
            />

            {/* 🔒 SEDE MÃE: Escolher a qual sede esta filial pertence */}
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
            >
              <option value="">Selecionar Sede Mãe (opcional)</option>
              {availableSedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  🏛️ {sede.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Pastor responsável"
              value={pastor}
              onChange={(e) => setPastor(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
            />

            <input
              type="text"
              placeholder="Localização"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
            />

            <input
              type="text"
              placeholder="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
            />

            <div className="flex gap-2 md:col-span-2">
              <button
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 transition text-white p-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'A salvar...' : (editingId ? 'Atualizar Filial' : 'Salvar Filial')}
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

          <div className="overflow-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Sede Mãe</th>
                  <th className="pb-3">Pastor</th>
                  <th className="pb-3">Localização</th>
                  <th className="pb-3">Telefone</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">A carregar...</td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">Nenhuma filial encontrada.</td>
                  </tr>
                ) : (
                  branches.map((branch) => {
                    const isSede = branch.parent_id === null
                    const sedeMae = branches.find(b => b.id === branch.parent_id)

                    return (
                      <tr
                        key={branch.id}
                        className="border-b border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <td className="py-4">
                          {isSede ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              🏛️ SEDE
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              📍 FILIAL
                            </span>
                          )}
                        </td>
                        <td className="py-4 font-medium">{branch.name}</td>
                        <td className="py-4 text-sm text-purple-600 dark:text-purple-400">
                          {sedeMae ? sedeMae.name : '-'}
                        </td>
                        <td className="py-4">{branch.pastor || '-'}</td>
                        <td className="py-4 text-sm">{branch.location || '-'}</td>
                        <td className="py-4 text-sm">{branch.phone || '-'}</td>
                        <td className="py-4 flex gap-2">
                          <button
                            onClick={() => editBranch(branch)}
                            className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteBranch(branch.id)}
                            className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Apagar
                          </button>
                        </td>
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

export default Branches