import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Church, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../supabase/client'

function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  async function handleLogin(e) {
    e.preventDefault()
    
    const { email, password } = formData
    
    if (!email || !password) {
      toast.error('Preenche todos os campos')
      return
    }

    setLoading(true)
    console.log('🔵 [LOGIN] Iniciando tentativa de login para:', email)

    try {
      const isEmail = email.includes('@')
      const isAdminKeyword = email.toLowerCase() === 'admin'

      if (isEmail || isAdminKeyword) {
        // Login Admin via Supabase Auth
        const emailToUse = isAdminKeyword ? 'admin@igreja.com' : email
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: password,
        })

        if (error) {
          console.log('🔴 [LOGIN] Erro Auth Admin:', error)
          toast.error('Email ou senha de administrador incorretos')
          setLoading(false)
          return
        }

        console.log('🟢 [LOGIN] Admin logado com sucesso')
        toast.success('Login de Administrador realizado!')
        setLoading(false)
        navigate('/dashboard')
        return
      }

      // Login Utilizadores Normais (tabela users)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', email) 
        .eq('password', password)
        .eq('active', true)
        .maybeSingle()

      console.log('🔵 [LOGIN] Resposta do Supabase:', { data, error })

      if (error) {
        console.error('🔴 [LOGIN] Erro na query:', error)
        toast.error('Erro ao conectar com a base de dados')
        setLoading(false)
        return
      }

      if (!data) {
        console.log('🔴 [LOGIN] Utilizador não encontrado ou inativo')
        toast.error('Utilizador, senha inválidos ou conta inativa')
        setLoading(false)
        return
      }

      console.log('🟢 [LOGIN] Dados do utilizador:', data)
      console.log('🟢 [LOGIN] Role detectado:', data.role)

      // Guardar no LocalStorage
      localStorage.setItem('church_user', JSON.stringify(data))
      localStorage.setItem('church_role', data.role)
      
      console.log('🟢 [LOGIN] LocalStorage atualizado. A navegar para /dashboard...')
      
      toast.success(`Bem-vindo, ${data.full_name}!`)
      setLoading(false)
      
      // 🔒 CORREÇÃO: Usar window.location para forçar o AuthContext a recarregar e ler o novo localStorage
      window.location.href = '/dashboard'
      
    } catch (err) {
      console.error('🔴 [LOGIN] Erro inesperado:', err)
      toast.error('Ocorreu um erro inesperado')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card de Login */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-4 shadow-lg">
              <Church className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Igreja Plus</h1>
            <p className="text-white/80 text-sm">Sistema inteligente para igrejas</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Campo Email/Utilizador */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Email (Admin) ou Utilizador"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                autoComplete="username"
              />
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Botão Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-purple-700 font-bold py-4 rounded-xl hover:bg-white/90 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>A entrar...</span>
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-white/60">ou</span>
            </div>
          </div>

          {/* Link para Registro */}
          <div className="text-center">
            <p className="text-white/80 text-sm mb-2">
              É pastor de uma nova igreja?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-semibold hover:bg-white/30 transform hover:scale-[1.02] transition-all duration-200"
            >
              <Church className="w-5 h-5 mr-2" />
              Criar Minha Igreja
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          © 2026 Igreja Plus. Todos os direitos reservados.
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default Login