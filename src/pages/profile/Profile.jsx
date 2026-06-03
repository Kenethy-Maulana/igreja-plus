import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Church,
  Shield,
  Camera,
  Save,
  Lock,
  Heart,
  Award,
  BookOpen,
  Droplet,
} from 'lucide-react'

function Profile() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [loading, setLoading] = useState(false)
  const [ministries, setMinistries] = useState([])

  // Estados do formulário
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Segurança
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Ministério
  const [ministryId, setMinistryId] = useState('')
  const [baptized, setBaptized] = useState(false)
  const [baptismDate, setBaptismDate] = useState('')

  useEffect(() => {
    if (profile) {
      loadProfileData()
      loadMinistries()
    }
  }, [profile])

  async function loadProfileData() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', profile.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setEmail(data.email || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setBirthDate(data.birth_date || '')
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || '')
      setMinistryId(data.ministry_id || '')
      setBaptized(data.baptized || false)
      setBaptismDate(data.baptism_date || '')
    }
  }

  async function loadMinistries() {
    let query = supabase.from('ministries').select('*').order('name')
    if (profile?.branch_id) {
      query = query.eq('branch_id', profile.branch_id)
    }
    const { data } = await query
    if (data) setMinistries(data)
  }

  async function handleSavePersonal(e) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        email,
        phone,
        address,
        birth_date: birthDate || null,
        bio,
        avatar_url: avatarUrl,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message)
    } else {
      toast.success('Perfil atualizado com sucesso!')
    }
    setLoading(false)
  }

  async function handleSaveSecurity(e) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('As novas senhas não coincidem')
      return
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    // Se for utilizador do Supabase Auth
    if (profile.username?.includes('@')) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) {
        toast.error('Erro ao alterar senha: ' + error.message)
      } else {
        toast.success('Senha alterada com sucesso!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } else {
      // Utilizador da tabela users
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', profile.id)

      if (error) {
        toast.error('Erro ao alterar senha: ' + error.message)
      } else {
        toast.success('Senha alterada com sucesso!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    }
    setLoading(false)
  }

  async function handleSaveMinistry(e) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        ministry_id: ministryId || null,
        baptized,
        baptism_date: baptismDate || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message)
    } else {
      toast.success('Informações do ministério atualizadas!')
    }
    setLoading(false)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB')
      return
    }

    setLoading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Erro ao carregar imagem: ' + uploadError.message)
      setLoading(false)
      return
    }

    const { data } = supabase.storage.from('profiles').getPublicUrl(filePath)
    setAvatarUrl(data.publicUrl)
    toast.success('Avatar carregado! Clica em Salvar para confirmar.')
    setLoading(false)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-purple-600 font-semibold text-xl animate-pulse">A carregar...</div>
      </div>
    )
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const tabs = [
    { id: 'personal', label: 'Pessoal', icon: User },
    { id: 'ministry', label: 'Ministério', icon: Church },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'account', label: 'Conta', icon: Award },
  ]

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            Meu Perfil
          </h1>

          {/* Card do Header do Perfil */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-8 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-lg border-4 border-white shadow-xl flex items-center justify-center text-white text-4xl font-bold">
                    {getInitials(fullName)}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Info */}
              <div className="text-center md:text-left text-white flex-1">
                <h2 className="text-3xl font-bold mb-1">{fullName || 'Utilizador'}</h2>
                <p className="text-white/80 mb-2">{profile.username}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold capitalize">
                    {profile.role}
                  </span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                    🏛️ {profile.branch_name || 'Minha Igreja'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-6">
              {/* TAB: INFORMAÇÕES PESSOAIS */}
              {activeTab === 'personal' && (
                <form onSubmit={handleSavePersonal} className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Informações Pessoais
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Telefone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="84 XXX XXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de Nascimento
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Endereço
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Bairro, rua, número..."
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sobre mim
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        placeholder="Conta-nos um pouco sobre ti..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {loading ? 'A salvar...' : 'Salvar Alterações'}
                  </button>
                </form>
              )}

              {/* TAB: MINISTÉRIO */}
              {activeTab === 'ministry' && (
                <form onSubmit={handleSaveMinistry} className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Church className="text-purple-600" />
                    Informações do Ministério
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ministério
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={ministryId}
                          onChange={(e) => setMinistryId(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Selecionar ministério</option>
                          {ministries.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status de Batismo
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <input
                          type="checkbox"
                          checked={baptized}
                          onChange={(e) => setBaptized(e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <Droplet className="w-5 h-5 text-blue-500" />
                        <span className="text-gray-800 dark:text-white font-medium">Sou batizado(a)</span>
                      </label>
                    </div>

                    {baptized && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data de Batismo
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={baptismDate}
                            onChange={(e) => setBaptismDate(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {loading ? 'A salvar...' : 'Salvar Alterações'}
                  </button>
                </form>
              )}

              {/* TAB: SEGURANÇA */}
              {activeTab === 'security' && (
                <form onSubmit={handleSaveSecurity} className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Lock className="text-purple-600" />
                    Alterar Senha
                  </h3>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl mb-4">
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                      🔒 A tua senha é encriptada e nunca é partilhada. Escolhe uma senha forte com pelo menos 6 caracteres.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nova Senha
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Repete a nova senha"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Lock size={18} />
                    {loading ? 'A alterar...' : 'Alterar Senha'}
                  </button>
                </form>
              )}

              {/* TAB: CONTA */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Award className="text-purple-600" />
                    Informações da Conta
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Username</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{profile.username}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cargo</p>
                      <p className="font-semibold text-gray-800 dark:text-white capitalize">{profile.role}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Igreja</p>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        🏛️ {profile.branch_name || 'Não definida'}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ID do Utilizador</p>
                      <p className="font-mono text-xs text-gray-800 dark:text-white break-all">{profile.id}</p>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                    <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">Zona de Perigo</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                      Se quiseres apagar a tua conta, contacta o administrador da tua igreja. Esta ação não pode ser revertida.
                    </p>
                    <button
                      onClick={() => toast.error('Contacta o administrador para apagar a conta')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Solicitar Eliminação da Conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile