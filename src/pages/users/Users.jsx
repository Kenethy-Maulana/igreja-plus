import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'

function Users() {
  const { profile } = useAuth()
  
  const [users, setUsers] = useState([])
  const [members, setMembers] = useState([])
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('member')
  const [memberId, setMemberId] = useState('')
  const [branchId, setBranchId] = useState('')

  // 🔒 Apenas Admin e Pastor podem gerir utilizadores
  const canManage = profile?.role === 'admin' || profile?.role === 'pastor'
  
  // 🔒 NOVA LÓGICA: Super Admin = sem branch_id | Admin Sede = tem filiais | Pastor = só a sua igreja
  const isSuperAdmin = profile?.isSuperAdmin
  const isHeadquartersAdmin = profile?.isHeadquartersAdmin
  const isAdmin = isSuperAdmin || isHeadquartersAdmin

  async function fetchData() {
    if (!canManage) return

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    let query = supabase
      .from('users')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
    }

    const { data } = await query
    if (data) setUsers(data)

    // Buscar membros das igrejas visíveis
    let membersQuery = supabase.from('members').select('id, full_name')
    if (hasBranchFilter) {
      membersQuery = membersQuery.in('branch_id', visibleBranchIds)
    }
    const { data: membersData } = await membersQuery
    if (membersData) setMembers(membersData)

    // 🔒 Buscar igrejas que o utilizador pode gerir
    let branchesQuery = supabase.from('branches').select('*').order('name')
    if (hasBranchFilter) {
      branchesQuery = branchesQuery.in('id', visibleBranchIds)
    }
    const { data: branchesData } = await branchesQuery
    if (branchesData) setBranches(branchesData)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [search, profile])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!fullName || !username) {
      toast.error('Preenche o Nome e o Nome de Utilizador')
      return
    }

    // 🔒 NOVA LÓGICA: Determinar a igreja alvo
    // - Super Admin: pode escolher qualquer igreja
    // - Admin da Sede: pode escolher entre a sede e suas filiais
    // - Pastor normal: só pode criar para a sua própria igreja
    let targetBranchId
    if (isSuperAdmin) {
      targetBranchId = branchId
    } else if (isHeadquartersAdmin) {
      // Admin da sede pode escolher entre as igrejas visíveis (sede + filiais)
      targetBranchId = branchId || profile.branch_id
    } else {
      // Pastor normal - forçado para a sua igreja
      targetBranchId = profile.branch_id
    }

    if (!targetBranchId) {
      toast.error('Erro: Igreja não identificada.')
      return
    }

    const payload = {
      username,
      full_name: fullName,
      role,
      member_id: memberId || null,
      branch_id: targetBranchId,
    }

    // Só envia a senha se for criação nova ou se o admin/pastor digitou uma nova
    if (!editingId || (editingId && password.trim() !== '')) {
      payload.password = password
    }

    if (editingId) {
      const { error } = await supabase.from('users').update(payload).eq('id', editingId)
      if (error) {
        toast.error('Erro ao atualizar: ' + error.message)
        return
      }
      toast.success('Utilizador atualizado com sucesso!')
    } else {
      payload.active = true
      const { error } = await supabase.from('users').insert([payload])
      if (error) {
        toast.error('Erro ao criar: ' + error.message)
        return
      }
      toast.success('Utilizador criado com sucesso!')
    }

    resetForm()
    fetchData()
  }

  function editUser(user) {
    setEditingId(user.id)
    setFullName(user.full_name)
    setUsername(user.username || '')
    setPassword('') // Deixa em branco por segurança
    setRole(user.role)
    setMemberId(user.member_id || '')
    setBranchId(user.branch_id || '')
  }

  async function toggleStatus(user) {
    const { error } = await supabase
      .from('users')
      .update({ active: !user.active })
      .eq('id', user.id)

    if (error) {
      toast.error('Erro ao alterar status')
      return
    }
    
    toast.success(`Utilizador ${user.active ? 'desativado' : 'ativado'}!`)
    fetchData()
  }

  async function deleteUser(userId) {
    if (!window.confirm('Tem a certeza que deseja apagar este utilizador?')) return

    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
      return
    }

    toast.success('Utilizador apagado com sucesso!')
    fetchData()
  }

  function resetForm() {
    setEditingId(null)
    setFullName('')
    setUsername('')
    setPassword('')
    setRole('member')
    setMemberId('')
    setBranchId('')
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">A carregar...</div>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen">
        <Sidebar />
        <div className="flex-1 p-6">
          <Navbar />
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
            <p className="text-red-500 text-center py-10">Acesso negado. Apenas Administradores e Pastores podem gerir utilizadores.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Gestão de Utilizadores {isSuperAdmin ? '- Super Admin' : `- ${profile.branch_name || 'Minha Igreja'}`}
          </h1>

          <input
            type="text"
            placeholder="Pesquisar por nome ou utilizador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-3 rounded-xl w-full mb-6 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <input
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required
            />

            <input
              type="text"
              placeholder="Nome de utilizador"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required
            />

            <input
              type="password"
              placeholder={editingId ? "Deixe em branco para manter a senha" : "Senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required={!editingId}
            />

            {/* 🔒 CARGOS: Admin da sede pode criar Pastores, Pastor normal não */}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              {isSuperAdmin && <option value="admin">Admin (Super Administrador)</option>}
              {(isSuperAdmin || isHeadquartersAdmin) && <option value="pastor">Pastor</option>}
              <option value="secretary">Secretário</option>
              <option value="treasurer">Tesoureiro</option>
              <option value="leader">Líder</option>
              <option value="member">Membro</option>
            </select>

            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Associar membro (opcional)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>

            {/* 🔒 IGREJA: 
                - Super Admin: escolhe qualquer igreja
                - Admin da Sede: escolhe entre sede e filiais
                - Pastor normal: vê a sua igreja bloqueada
            */}
            {isSuperAdmin || isHeadquartersAdmin ? (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="border p-3 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                required
              >
                <option value="">Selecionar Igreja *</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.name === 'Sede' ? '🏛️' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={branches.find(b => b.id === profile.branch_id)?.name || 'Minha Igreja'}
                readOnly
                className="border p-3 rounded-xl bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
              />
            )}

            <div className="flex gap-2 lg:col-span-3">
              <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-semibold transition">
                {editingId ? 'Atualizar Utilizador' : 'Criar Utilizador'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Utilizador</th>
                  <th className="p-3">Cargo</th>
                  {(isSuperAdmin || isHeadquartersAdmin) && <th className="p-3">Igreja</th>}
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="p-3 font-medium">{user.full_name}</td>
                    <td className="p-3 font-mono text-sm">{user.username}</td>
                    <td className="p-3 capitalize">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {user.role}
                      </span>
                    </td>
                    {(isSuperAdmin || isHeadquartersAdmin) && (
                      <td className="p-3">
                        {user.branches?.name ? (
                          <span className="font-medium text-purple-600 dark:text-purple-400">
                            {user.branches.name} {user.branches.name === 'Sede' ? '🏛️' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Sem igreja</span>
                        )}
                      </td>
                    )}
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => editUser(user)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleStatus(user)}
                        className={`${
                          user.active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
                        } text-white px-3 py-1.5 rounded-lg text-sm transition`}
                      >
                        {user.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm transition"
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={(isSuperAdmin || isHeadquartersAdmin) ? 6 : 5} className="p-8 text-center text-gray-500">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Users