import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

function Finances() {
  const { profile } = useAuth()
  
  const [transactions, setTransactions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [type, setType] = useState('income')
  const [category, setCategory] = useState('Dízimo')
  const [amount, setAmount] = useState('')
  const [contributorName, setContributorName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // 🔒 Admin, Tesoureiro E Pastor podem gerir finanças
  const canManage = profile?.role === 'admin' || profile?.role === 'treasurer' || profile?.role === 'pastor'

  async function fetchData() {
    if (!profile || !canManage) return
    setLoading(true)

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    let query = supabase
      .from('finances')
      .select('*')
      .order('date', { ascending: false })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    if (search) {
      query = query.ilike('description', `%${search}%`)
    }

    const { data: financesData, error: financesError } = await query
    if (financesError) {
      console.error('Erro ao buscar finanças:', financesError)
      toast.error('Erro ao carregar dados financeiros')
    } else {
      setTransactions(financesData || [])
    }

    // Buscar membros das igrejas visíveis
    let membersQuery = supabase.from('members').select('full_name')
    if (hasBranchFilter) {
      membersQuery = membersQuery.in('branch_id', visibleBranchIds)
    }
    const { data: membersData } = await membersQuery
    if (membersData) setMembers(membersData)

    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [search, profile])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!amount || !date) {
      toast.error('Preenche o valor e a data')
      return
    }

    if (!profile?.branch_id && !profile?.isSuperAdmin) {
      toast.error('Erro: A tua conta não está associada a nenhuma igreja.')
      return
    }

    const payload = {
      type,
      category,
      amount: parseFloat(amount),
      contributor_name: category === 'Dízimo' ? contributorName : null,
      description: category === 'Dízimo' && contributorName 
        ? `Dízimo de ${contributorName}${description ? ' - ' + description : ''}` 
        : description,
      date,
      branch_id: profile?.branch_id, // 🔒 Sempre associa à igreja do utilizador
    }

    setLoading(true)
    let error

    if (editingId) {
      const result = await supabase.from('finances').update(payload).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('finances').insert([payload])
      error = result.error
    }

    if (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro: ' + error.message)
    } else {
      toast.success(editingId ? 'Registo atualizado!' : 'Registo salvo com sucesso!')
      resetForm()
      fetchData()
    }
    setLoading(false)
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Tem a certeza que deseja apagar este registo?')) return

    const { error } = await supabase.from('finances').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
    } else {
      toast.success('Registo apagado!')
      fetchData()
    }
  }

  function editTransaction(item) {
    setEditingId(item.id)
    setType(item.type)
    setCategory(item.category || 'Dízimo')
    setAmount(item.amount.toString())
    setContributorName(item.contributor_name || '')
    setDescription(item.description || '')
    setDate(item.date)
  }

  function resetForm() {
    setEditingId(null)
    setType('income')
    setCategory('Dízimo')
    setAmount('')
    setContributorName('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const balance = totalIncome - totalExpense

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value).replace('MZN', 'MT')
  }

  if (!profile) return <div className="p-10 text-center">A carregar...</div>
  if (!canManage) return <div className="p-10 text-center text-red-500">Acesso negado.</div>

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md transition mb-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Gestão Financeira {profile?.isSuperAdmin ? '- Super Admin' : `- ${profile.branch_name || 'Minha Igreja'}`}
          </h1>

          {/* Cartões de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-green-600" size={24} />
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <TrendingDown className="text-red-600" size={24} />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-400">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Wallet className="text-purple-600" size={24} />
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Saldo Atual</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">{formatCurrency(balance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            >
              <option value="income">Entrada (Receita)</option>
              <option value="expense">Saída (Despesa)</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            >
              {type === 'income' ? (
                <>
                  <option value="Dízimo">Dízimo</option>
                  <option value="Oferta">Oferta</option>
                  <option value="Contribuição">Contribuição</option>
                  <option value="Outros">Outros</option>
                </>
              ) : (
                <>
                  <option value="Salários">Salários</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Água/Luz">Água / Luz</option>
                  <option value="Outros">Outros</option>
                </>
              )}
            </select>

            {category === 'Dízimo' && (
              <div className="md:col-span-2 lg:col-span-2">
                <input
                  type="text"
                  placeholder="Nome do contribuinte (escolhe ou digita)"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  list="members-datalist"
                  className="w-full border border-purple-300 dark:border-purple-700 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <datalist id="members-datalist">
                  {members.map((member) => (
                    <option key={member.full_name} value={member.full_name} />
                  ))}
                </datalist>
              </div>
            )}

            <input
              type="number"
              step="0.01"
              placeholder="Valor (ex: 500)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white ${category === 'Dízimo' ? 'lg:col-span-2' : ''}`}
              required
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
              required
            />

            <input
              type="text"
              placeholder="Descrição adicional (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white md:col-span-2 lg:col-span-3"
            />

            <div className="flex gap-2 md:col-span-2 lg:col-span-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 transition text-white p-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'A salvar...' : (editingId ? 'Atualizar' : 'Adicionar')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 transition text-white p-3 rounded-xl"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Tabela */}
          <div className="overflow-auto rounded-xl">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Pesquisar por descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl w-full md:w-96 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
              />
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3">Descrição / Contribuinte</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && transactions.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center">A carregar dados...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-500">Nenhum registo financeiro encontrado.</td></tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="py-4">
                        {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('pt-PT') : '-'}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.type === 'income' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {item.type === 'income' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="py-4 font-medium">{item.category || '-'}</td>
                      <td className="py-4 text-sm">
                        {item.contributor_name && (
                          <span className="block text-purple-600 dark:text-purple-400 font-semibold mb-1">
                            👤 {item.contributor_name}
                          </span>
                        )}
                        {item.description || '-'}
                      </td>
                      <td className={`py-4 font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>
                      <td className="py-4 flex gap-2">
                        <button
                          onClick={() => editTransaction(item)}
                          className="bg-blue-500 hover:bg-blue-600 transition text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteTransaction(item.id)}
                          className="bg-red-500 hover:bg-red-600 transition text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                          Apagar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Finances