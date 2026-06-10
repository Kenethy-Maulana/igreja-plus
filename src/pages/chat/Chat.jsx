import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../supabase/client'
import { 
  Send, Users, MessageCircle, X, Mail, Phone, Church, 
  Calendar, Award, Paperclip, Mic, MicOff, Play, Pause,
  Check, CheckCheck, Search, Plus, FileText, Image, File
} from 'lucide-react'
import toast from 'react-hot-toast'

function Chat() {
  const { profile } = useAuth()
  
  // Estados principais
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [churchUsers, setChurchUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [chats, setChats] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  
  // Estados de áudio
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  
  // Estados de reprodução de áudio
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const audioRef = useRef(new Audio())
  
  // Refs
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // ==========================================
  // CARREGAR DADOS INICIAIS
  // ==========================================
  useEffect(() => {
    if (!profile) return

    const loadData = async () => {
      // Buscar utilizadores da mesma igreja
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, role, email, phone, branch_id, avatar_url, ministry_id, baptized, baptism_date, username')
        .eq('branch_id', profile.branch_id)
        .eq('active', true)

      if (users) setChurchUsers(users)

      // Buscar chat "Geral da Igreja"
      const { data: existingChats } = await supabase
        .from('chats')
        .select('*')
        .eq('branch_id', profile.branch_id)
        .eq('type', 'group')
        .limit(1)

      let groupChat = existingChats?.[0]

      if (!groupChat) {
        const { data: newChatId } = await supabase.rpc('create_church_chat', {
          p_branch_id: profile.branch_id,
          p_name: '💬 Geral da Igreja'
        })

        if (newChatId) {
          const { data: newChat } = await supabase
            .from('chats')
            .select('*')
            .eq('id', newChatId)
            .maybeSingle()
          groupChat = newChat
        }
      }

      // Buscar chats diretos do utilizador
      const { data: directChats } = await supabase
        .from('chats')
        .select('*, chat_participants(user_id, users(id, full_name, avatar_url, role))')
        .eq('branch_id', profile.branch_id)
        .eq('type', 'direct')

      // Combinar todos os chats
      const allChats = []
      if (groupChat) allChats.push({ ...groupChat, isGroup: true })
      if (directChats) {
        directChats.forEach(chat => {
          const otherUser = chat.chat_participants?.find(p => p.user_id !== profile.id)
          if (otherUser) {
            allChats.push({ 
              ...chat, 
              isGroup: false, 
              otherUser: otherUser.users 
            })
          }
        })
      }

      setChats(allChats)
      if (groupChat) setActiveChat(groupChat)
    }

    loadData()
  }, [profile])

  // ==========================================
  // CARREGAR MENSAGENS DO CHAT ATIVO
  // ==========================================
  useEffect(() => {
    if (!activeChat) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, users(full_name, role, avatar_url), message_reads(user_id)')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)

      // Marcar mensagens como lidas
      await supabase.rpc('mark_messages_as_read', {
        p_chat_id: activeChat.id,
        p_user_id: profile.id
      })
    }

    fetchMessages()

    // Realtime para novas mensagens
    const channel = supabase
      .channel(`chat-${activeChat.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChat.id}` }, 
        async (payload) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, role, avatar_url')
            .eq('id', payload.new.sender_id)
            .maybeSingle()
          
          setMessages(prev => {
            // Evitar duplicados
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, { ...payload.new, users: userData, message_reads: [] }]
          })

          // Marcar como lida se não for minha
          if (payload.new.sender_id !== profile.id) {
            await supabase.rpc('mark_messages_as_read', {
              p_chat_id: activeChat.id,
              p_user_id: profile.id
            })
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setMessages(prev => prev.map(m => {
            if (m.id === payload.new.message_id) {
              const reads = m.message_reads || []
              if (!reads.some(r => r.user_id === payload.new.user_id)) {
                return { ...m, message_reads: [...reads, { user_id: payload.new.user_id }] }
              }
            }
            return m
          }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChat])

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ==========================================
  // ENVIAR MENSAGEM DE TEXTO
  // ==========================================
  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !activeChat) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // 🔥 OPTIMISTIC UPDATE: Adicionar mensagem localmente primeiro
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      chat_id: activeChat.id,
      sender_id: profile.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      users: { full_name: profile.full_name, role: profile.role, avatar_url: profile.avatar_url },
      message_reads: [],
      isOptimistic: true
    }
    setMessages(prev => [...prev, optimisticMessage])

    // Enviar para o servidor
    const { data, error } = await supabase.from('messages').insert([{
      chat_id: activeChat.id,
      sender_id: profile.id,
      content: messageContent
    }]).select()

    if (error) {
      console.error('Erro ao enviar:', error)
      toast.error('Erro ao enviar mensagem')
      // Remover mensagem optimista em caso de erro
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (data?.[0]) {
      // Substituir mensagem optimista pela real
      setMessages(prev => prev.map(m => 
        m.id === tempId 
          ? { ...data[0], users: optimisticMessage.users, message_reads: [] }
          : m
      ))
    }
  }

  // ==========================================
  // ENVIAR FICHEIRO
  // ==========================================
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ficheiro muito grande (máx. 10MB)')
      return
    }

    const loadingToast = toast.loading('A enviar ficheiro...')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${activeChat.id}-${Date.now()}.${fileExt}`
      const filePath = `${activeChat.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      const fileUrl = data.publicUrl

      // Enviar mensagem com o ficheiro
      const messageContent = JSON.stringify({
        type: 'file',
        url: fileUrl,
        name: file.name,
        size: file.size,
        fileType: file.type
      })

      const { error: msgError } = await supabase.from('messages').insert([{
        chat_id: activeChat.id,
        sender_id: profile.id,
        content: messageContent
      }])

      if (msgError) throw msgError

      toast.dismiss(loadingToast)
      toast.success('Ficheiro enviado!')
    } catch (error) {
      console.error('Erro ao enviar ficheiro:', error)
      toast.dismiss(loadingToast)
      toast.error('Erro ao enviar ficheiro')
    }

    // Limpar input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ==========================================
  // GRAVAÇÃO DE ÁUDIO
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await sendAudioMessage(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Erro ao aceder ao microfone:', error)
      toast.error('Não foi possível aceder ao microfone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
      setRecordingTime(0)
    }
  }

  const sendAudioMessage = async (audioBlob) => {
    if (!activeChat) return

    const loadingToast = toast.loading('A enviar áudio...')

    try {
      const fileName = `${activeChat.id}-${Date.now()}.webm`
      const filePath = `${activeChat.id}/audio/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, audioBlob)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      const audioUrl = data.publicUrl

      const messageContent = JSON.stringify({
        type: 'audio',
        url: audioUrl,
        duration: recordingTime
      })

      const { error: msgError } = await supabase.from('messages').insert([{
        chat_id: activeChat.id,
        sender_id: profile.id,
        content: messageContent
      }])

      if (msgError) throw msgError

      toast.dismiss(loadingToast)
      toast.success('Áudio enviado!')
      setRecordingTime(0)
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
      toast.dismiss(loadingToast)
      toast.error('Erro ao enviar áudio')
    }
  }

  // ==========================================
  // REPRODUÇÃO DE ÁUDIO
  // ==========================================
  const toggleAudioPlay = (audioUrl, messageId) => {
    if (playingAudioId === messageId) {
      audioRef.current.pause()
      setPlayingAudioId(null)
    } else {
      audioRef.current.src = audioUrl
      audioRef.current.play()
      setPlayingAudioId(messageId)
      audioRef.current.onended = () => setPlayingAudioId(null)
    }
  }

  // ==========================================
  // INICIAR CHAT DIRETO
  // ==========================================
  const startDirectChat = async (user) => {
    const loadingToast = toast.loading('A iniciar conversa...')

    const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
      p_user1_id: profile.id,
      p_user2_id: user.id,
      p_branch_id: profile.branch_id
    })

    toast.dismiss(loadingToast)

    if (error || !chatId) {
      toast.error('Erro ao iniciar conversa')
      return
    }

    // Buscar o chat criado
    const { data: chat } = await supabase
      .from('chats')
      .select('*, chat_participants(user_id, users(id, full_name, avatar_url, role))')
      .eq('id', chatId)
      .single()

    if (chat) {
      const newChat = { 
        ...chat, 
        isGroup: false, 
        otherUser: user 
      }
      
      // Adicionar à lista de chats se não existir
      setChats(prev => {
        if (prev.some(c => c.id === chatId)) return prev
        return [newChat, ...prev]
      })
      
      setActiveChat(newChat)
    }
  }

  // ==========================================
  // INDICADOR "A ESCREVER..."
  // ==========================================
  const handleTyping = () => {
    // Implementação simplificada - poderia usar Realtime para broadcast
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      // Parou de escrever
    }, 2000)
  }

  // ==========================================
  // VER PERFIL
  // ==========================================
  const viewUserProfile = async (user) => {
    const { data: fullUserData } = await supabase
      .from('users')
      .select('*, ministries(name)')
      .eq('id', user.id)
      .maybeSingle()

    if (fullUserData) {
      setSelectedUser(fullUserData)
      setShowProfileModal(true)
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador', pastor: 'Pastor', secretary: 'Secretário',
      treasurer: 'Tesoureiro', leader: 'Líder', member: 'Membro',
    }
    return labels[role] || role
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-PT', { 
      hour: '2-digit', minute: '2-digit' 
    })
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Verificar se mensagem é um ficheiro/áudio
  const parseMessageContent = (content) => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.type === 'file' || parsed.type === 'audio') return parsed
    } catch {}
    return null
  }

  // Verificar se mensagem foi lida
  const isMessageRead = (msg) => {
    if (!msg.message_reads || msg.sender_id !== profile.id) return false
    return msg.message_reads.length > 0
  }

  // Filtrar utilizadores pela pesquisa
  const filteredUsers = churchUsers.filter(u => 
    u.id !== profile.id && 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!profile) return <div className="p-10 text-center">A carregar...</div>

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      
      {/* SIDEBAR */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} />
            <h2 className="font-bold text-lg">Conversas</h2>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Pesquisar membro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Chat Geral (sempre no topo) */}
          {chats.filter(c => c.isGroup).map(chat => (
            <div 
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800 ${
                activeChat?.id === chat.id ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                <MessageCircle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white">Geral da Igreja</p>
                <p className="text-xs text-gray-500 truncate">Conversa com todos os membros</p>
              </div>
            </div>
          ))}

          {/* Chats Diretos */}
          {chats.filter(c => !c.isGroup).map(chat => (
            <div 
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800 ${
                activeChat?.id === chat.id ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold overflow-hidden">
                {chat.otherUser?.avatar_url ? (
                  <img src={chat.otherUser.avatar_url} alt={chat.otherUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(chat.otherUser?.full_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white">{chat.otherUser?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{getRoleLabel(chat.otherUser?.role)}</p>
              </div>
            </div>
          ))}

          {/* Lista de Membros para Iniciar Novo Chat */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Iniciar nova conversa</p>
          </div>

          {filteredUsers.map(user => (
            <div 
              key={user.id}
              className="p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800"
            >
              <div 
                onClick={() => viewUserProfile(user)}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold cursor-pointer hover:ring-2 hover:ring-purple-500 transition overflow-hidden flex-shrink-0"
                title="Ver perfil"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  user.full_name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{getRoleLabel(user.role)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startDirectChat(user)}
                  className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 px-2 py-1 rounded-lg transition"
                  title="Iniciar conversa"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={() => viewUserProfile(user)}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded-lg transition"
                  title="Ver perfil"
                >
                  <Users size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DO CHAT */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          {activeChat ? (
            <>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                activeChat.isGroup 
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 overflow-hidden'
              }`}>
                {activeChat.isGroup ? (
                  <MessageCircle size={18} />
                ) : activeChat.otherUser?.avatar_url ? (
                  <img src={activeChat.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(activeChat.otherUser?.full_name)
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">
                  {activeChat.isGroup ? 'Geral da Igreja' : activeChat.otherUser?.full_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {activeChat.isGroup 
                    ? `${churchUsers.length} membros` 
                    : getRoleLabel(activeChat.otherUser?.role)}
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Seleciona uma conversa</p>
          )}
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}>
          {!activeChat ? (
            <div className="text-center text-gray-500 py-20">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Seleciona uma conversa para começar</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p>Ainda não há mensagens. Seja o primeiro a enviar!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === profile.id
              const fileData = parseMessageContent(msg.content)
              const showDate = idx === 0 || 
                new Date(msg.created_at).toDateString() !== new Date(messages[idx-1].created_at).toDateString()

              return (
                <div key={msg.id}>
                  {/* Separador de data */}
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-white dark:bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
                        {new Date(msg.created_at).toLocaleDateString('pt-PT', { 
                          day: '2-digit', month: 'long', year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                      isMe 
                        ? 'bg-green-100 dark:bg-green-900/30 rounded-br-none' 
                        : 'bg-white dark:bg-gray-800 rounded-bl-none border border-gray-200 dark:border-gray-700'
                    }`}>
                      {/* Nome do remetente (apenas em grupo) */}
                      {!isMe && activeChat.isGroup && (
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                          {msg.users?.full_name}
                        </p>
                      )}

                      {/* Conteúdo da mensagem */}
                      {fileData?.type === 'audio' ? (
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <button
                            onClick={() => toggleAudioPlay(fileData.url, msg.id)}
                            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center flex-shrink-0"
                          >
                            {playingAudioId === msg.id ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <div className="flex-1">
                            <div className="flex gap-0.5 items-end h-6">
                              {[...Array(20)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-1 bg-purple-400 dark:bg-purple-500 rounded-full"
                                  style={{ height: `${Math.random() * 100}%`, minHeight: '4px' }}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDuration(fileData.duration || 0)}
                            </p>
                          </div>
                        </div>
                      ) : fileData?.type === 'file' ? (
                        <a 
                          href={fileData.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
                        >
                          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0">
                            {fileData.fileType?.startsWith('image/') ? <Image size={18} /> : <File size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                              {fileData.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(fileData.size)}
                            </p>
                          </div>
                        </a>
                      ) : (
                        <p className="text-sm text-gray-800 dark:text-white whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Hora e status de leitura */}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        isMe ? 'text-green-700 dark:text-green-400' : 'text-gray-400'
                      }`}>
                        <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          isMessageRead(msg) 
                            ? <CheckCheck size={14} className="text-blue-500" />
                            : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Indicador de gravação */}
        {isRecording && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              A gravar... {formatDuration(recordingTime)}
            </p>
            <div className="flex-1"></div>
            <button
              onClick={cancelRecording}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <Send size={14} />
              Enviar
            </button>
          </div>
        )}

        {/* Input */}
        {activeChat && !isRecording && (
          <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition"
              title="Anexar ficheiro"
            >
              <Paperclip size={18} className="text-gray-600 dark:text-gray-400" />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              placeholder="Escreve uma mensagem..."
              className="flex-1 px-4 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <button 
              type="button"
              onClick={startRecording}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition"
              title="Gravar áudio"
            >
              <Mic size={18} className="text-gray-600 dark:text-gray-400" />
            </button>

            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </div>

      {/* MODAL DE PERFIL */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 text-white relative">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-3xl border-4 border-white/30 mb-4 overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    getInitials(selectedUser.full_name)
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-1">{selectedUser.full_name}</h2>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  <Award size={14} />
                  {getRoleLabel(selectedUser.role)}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {selectedUser.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{selectedUser.email}</p>
                  </div>
                </div>
              )}

              {selectedUser.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Telefone</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedUser.phone}</p>
                  </div>
                </div>
              )}

              {selectedUser.ministries?.name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Church className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ministério</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedUser.ministries.name}</p>
                  </div>
                </div>
              )}

              {selectedUser.baptized && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Batizado</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {selectedUser.baptism_date 
                        ? new Date(selectedUser.baptism_date).toLocaleDateString('pt-PT')
                        : 'Sim'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Church className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Membro desde</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2">
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  startDirectChat(selectedUser)
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                Enviar Mensagem
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elemento de áudio oculto */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

export default Chat