import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'

function Events() {
  const { profile } = useAuth()
  
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [events, setEvents] = useState([])
  const [branches, setBranches] = useState([]) // <-- Adicionado para guardar as igrejas

  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const canEdit = profile?.role === 'admin' || profile?.role === 'pastor' || profile?.role === 'secretary'

  async function fetchData() {
    if (!profile) return

    // 🔒 NOVA LÓGICA: Usar visibleBranchIds (lista de IDs que o utilizador pode ver)
    const visibleBranchIds = profile.visibleBranchIds || []
    const hasBranchFilter = visibleBranchIds.length > 0

    // 1. Buscar Eventos
    let query = supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    // 🔒 FILTRO: Usar .in() com a lista de branch_ids visíveis
    if (hasBranchFilter) {
      query = query.in('branch_id', visibleBranchIds)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: eventsData, error: eventsError } = await query
    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError)
      return
    }
    if (eventsData) setEvents(eventsData)

    // 2. Buscar Nomes das Igrejas para a lista de sugestões
    let branchesQuery = supabase.from('branches').select('id, name')
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

    if (!profile?.branch_id && !profile?.isSuperAdmin) {
      toast.error('Erro: A tua conta não está associada a nenhuma igreja.')
      return
    }

    const payload = {
      title,
      event_date: eventDate,
      event_time: eventTime,
      location, // Aceita tanto o nome da igreja quanto um local personalizado
      description,
      branch_id: profile?.branch_id,
    }

    let error
    if (editingId) {
      const result = await supabase.from('events').update(payload).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('events').insert([payload])
      error = result.error
    }

    if (error) {
      console.error('Erro no Supabase:', error)
      toast.error('Erro: ' + error.message)
      return
    }

    toast.success(editingId ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!')
    
    setEditingId(null)
    setTitle('')
    setEventDate('')
    setEventTime('')
    setLocation('')
    setDescription('')

    fetchData()
  }

  async function deleteEvent(id) {
    if (!window.confirm('Deseja apagar este evento?')) return

    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao apagar: ' + error.message)
      return
    }

    toast.success('Evento apagado com sucesso!')
    fetchData()
  }

  function editEvent(event) {
    setEditingId(event.id)
    setTitle(event.title || '')
    setEventDate(event.event_date || '')
    setEventTime(event.event_time || '')
    setLocation(event.location || '')
    setDescription(event.description || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle('')
    setEventDate('')
    setEventTime('')
    setLocation('')
    setDescription('')
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">A carregar permissões...</div>
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
            Eventos e Cultos {profile?.isSuperAdmin ? '- Super Admin' : `- ${profile.branch_name || 'Minha Igreja'}`}
          </h1>

          <input
            type="text"
            placeholder="Pesquisar evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl mb-6 w-full md:w-96 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          />

          {canEdit ? (
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4 mb-8">
              <input
                type="text"
                placeholder="Nome do evento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                required
              />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                required
              />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                required
              />
              
              {/* 🔒 CAMPO LOCAL COM DATALIST (Sugestões + Texto Livre) */}
              <input
                type="text"
                placeholder="Local (escolhe da lista ou digita um novo)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="church-locations"
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                required
              />
              <datalist id="church-locations">
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name} />
                ))}
              </datalist>

              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white md:col-span-2"
              />
              
              <button className="bg-purple-600 hover:bg-purple-700 transition text-white p-3 rounded-xl md:col-span-2 font-semibold">
                {editingId ? 'Atualizar Evento' : 'Salvar Evento'}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-500 hover:bg-gray-600 transition text-white p-3 rounded-xl md:col-span-2 font-semibold"
                >
                  Cancelar Edição
                </button>
              )}
            </form>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl mb-6">
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                ℹ️ Estás a visualizar os eventos em modo de leitura. Para criar ou editar eventos, contacta o administrador, pastor ou secretário da tua igreja.
              </p>
            </div>
          )}

          <div className="overflow-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <th className="pb-3">Evento</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Hora</th>
                  <th className="pb-3">Local</th>
                  <th className="pb-3">Descrição</th>
                  {canEdit && <th className="pb-3">Ações</th>}
                </tr>
              </thead>

              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <td className="py-4 font-medium">{event.title}</td>
                    <td className="py-4">
                      {event.event_date 
                        ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-PT')
                        : '-'}
                    </td>
                    <td className="py-4">{event.event_time || '-'}</td>
                    <td className="py-4 font-medium text-purple-600 dark:text-purple-400">{event.location || '-'}</td>
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={event.description}>
                      {event.description || '-'}
                    </td>

                    {canEdit && (
                      <td className="py-4">
                        <button
                          onClick={() => editEvent(event)}
                          className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-lg mr-2 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
                        >
                          Apagar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum evento encontrado.
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

export default Events