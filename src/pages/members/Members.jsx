import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'
import MemberQRCode from '../../components/MemberQRCode'

function Members() {
  const { profile } = useAuth()

  const [members, setMembers] = useState([])
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [ministryId, setMinistryId] = useState('')
  const [baptized, setBaptized] = useState(false)

  const canEdit = profile?.role === 'admin' || profile?.role === 'pastor' || profile?.role === 'secretary'

  async function fetchMembers() {
    if (!profile) return

    setLoading(true)

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    let query = supabase
      .from('members')
      .select('*') 
      .order('created_at', { ascending: false })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Erro ao buscar membros:', error)
      toast.error('Erro ao carregar membros: ' + error.message)
    } else {
      setMembers(data || [])
    }

    // Buscar ministérios das igrejas visíveis
    let ministriesQuery = supabase.from('ministries').select('*')
    if (hasBranchFilter) {
      ministriesQuery = ministriesQuery.in('branch_id', visibleBranchIds)
    }
    const { data: ministriesData } = await ministriesQuery
    if (ministriesData) setMinistries(ministriesData)

    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchMembers()
    }
  }, [search, profile])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!fullName || !gender) {
      toast.error('Preencha os campos obrigatórios (Nome e Sexo)')
      return
    }

    if (!profile?.branch_id && !profile?.isSuperAdmin) {
      toast.error('Erro: A tua conta não está associada a nenhuma igreja.')
      return
    }

    setLoading(true)

    const payload = {
      full_name: fullName,
      gender,
      birth_date: birthDate || null,
      phone: phone || null,
      address: address || null,
      ministry_id: ministryId || null,
      baptized,
      branch_id: profile?.branch_id,
    }

    if (editingId) {
      const { error } = await supabase
        .from('members')
        .update(payload)
        .eq('id', editingId)

      if (!error) {
        toast.success('Membro atualizado com sucesso!')
        setEditingId(null)
      } else {
        console.error('Erro ao atualizar:', error)
        toast.error('Erro ao atualizar: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('members')
        .insert([payload])

      if (!error) {
        toast.success('Membro adicionado com sucesso!')
      } else {
        console.error('Erro ao adicionar:', error)
        toast.error('Erro ao adicionar: ' + error.message)
      }
    }

    resetForm()
    fetchMembers()
    setLoading(false)
  }

  async function deleteMember(id) {
    const confirmDelete = window.confirm('Deseja apagar este membro?')
    if (!confirmDelete) return

    const { error } = await supabase.from('members').delete().eq('id', id)

    if (!error) {
      toast.success('Membro apagado')
      fetchMembers()
    } else {
      console.error('Erro ao apagar:', error)
      toast.error('Erro ao apagar: ' + error.message)
    }
  }

  function editMember(member) {
    setEditingId(member.id)
    setFullName(member.full_name)
    setGender(member.gender)
    setBirthDate(member.birth_date || '')
    setPhone(member.phone || '')
    setAddress(member.address || '')
    setMinistryId(member.ministry_id || '')
    setBaptized(member.baptized || false)
  }

  function resetForm() {
    setEditingId(null)
    setFullName('')
    setGender('')
    setBirthDate('')
    setPhone('')
    setAddress('')
    setMinistryId('')
    setBaptized(false)
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

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md mt-6 transition">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Membros {profile?.isSuperAdmin ? '- Todas as Igrejas' : `- ${profile.branch_name || 'Minha Igreja'}`}
            </h1>

            <input
              type="text"
              placeholder="Pesquisar membro..."
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl w-full md:w-80 bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {canEdit && (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
              <input
                type="text"
                placeholder="Nome completo *"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <select
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                <option value="">Sexo *</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>

              <input
                type="date"
                placeholder="Data de nascimento"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />

              <input
                type="text"
                placeholder="Telefone"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                type="text"
                placeholder="Endereço"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <select
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none"
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
              >
                <option value="">Selecionar ministério</option>
                {ministries.map((ministry) => (
                  <option key={ministry.id} value={ministry.id}>
                    {ministry.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={baptized}
                  onChange={(e) => setBaptized(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-800 dark:text-white font-medium">É batizado?</span>
              </label>

              <div className="flex gap-2 lg:col-span-3">
                <button
                  disabled={loading}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 transition text-white p-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {loading ? 'A processar...' : editingId ? 'Atualizar membro' : 'Adicionar membro'}
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
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md mt-6 overflow-x-auto transition">
          {loading ? (
            <div className="text-center py-10 text-gray-800 dark:text-white">
              Carregando...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Sexo</th>
                  <th className="pb-3">Data Nasc.</th>
                  <th className="pb-3">Telefone</th>
                  <th className="pb-3">Endereço</th>
                  <th className="pb-3">Ministério</th>
                  <th className="pb-3">Batizado</th>
                  {canEdit && <th className="pb-3">Ações</th>}
                  <th className="pb-3">QR Code</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => {
                  // 🔒 Mapeamento manual do nome do ministério (evita erro de relação do Supabase)
                  const ministryName = ministries.find(m => m.id === member.ministry_id)?.name || '-'

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="py-4 font-medium">{member.full_name}</td>
                      <td className="py-4">{member.gender}</td>
                      <td className="py-4">
                        {member.birth_date 
                          ? new Date(member.birth_date + 'T00:00:00').toLocaleDateString('pt-PT')
                          : '-'}
                      </td>
                      <td className="py-4">{member.phone || '-'}</td>
                      <td className="py-4 text-sm">{member.address || '-'}</td>
                      <td className="py-4 text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {ministryName}
                      </td>
                      <td className="py-4">
                        {member.baptized ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            ✓ Sim
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Não
                          </span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="py-4 flex gap-2">
                          <button
                            onClick={() => editMember(member)}
                            className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-xl text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteMember(member.id)}
                            className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-xl text-sm"
                          >
                            Apagar
                          </button>
                        </td>
                      )}

                      <td className="py-4">
                        <MemberQRCode memberId={member.id} />
                      </td>
                    </tr>
                  )
                })}
                
                {members.length === 0 && !loading && (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum membro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Members