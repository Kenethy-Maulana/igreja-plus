import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../supabase/client'

function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    churchName: '',
    pastorName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  async function handleRegister(e) {
    e.preventDefault()
    
    const { churchName, pastorName, email, password, confirmPassword } = formData
    
    // Validações
    if (!churchName || !pastorName || !email || !password) {
      toast.error('Preenche todos os campos obrigatórios')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      // Criar o utilizador no Supabase Auth com metadata
      // O trigger no Supabase vai criar automaticamente:
      // 1. A igreja na tabela branches
      // 2. O perfil do pastor como admin na tabela users
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            church_name: churchName,
            pastor_name: pastorName,
            role: 'admin'
          }
        }
      })

      if (error) {
        console.error('Erro ao criar conta:', error)
        
        // Se o erro for de email duplicado, mostrar mensagem clara
        if (error.message.includes('already registered')) {
          toast.error('Este email já está registado. Tenta fazer login ou usa outro email.')
        } else {
          toast.error('Erro ao criar conta: ' + error.message)
        }
        
        setLoading(false)
        return
      }

      console.log('✅ Conta criada com sucesso!')
      console.log('✅ O trigger criou automaticamente a igreja e o perfil como admin')

      toast.success('Igreja e conta criadas com sucesso! Faça login.')
      setLoading(false)
      navigate('/')
      
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Ocorreu um erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <Building2 className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Criar Minha Igreja</h1>
            <p className="text-white/80 text-sm">Regista a tua igreja e começa a gerir</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input type="text" placeholder="Nome da Igreja *" value={formData.churchName} onChange={(e) => setFormData({ ...formData, churchName: e.target.value })} className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" required />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input type="text" placeholder="Nome do Pastor *" value={formData.pastorName} onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })} className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" required />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input type="email" placeholder="Email (será seu login) *" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres) *" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Confirmar Senha *" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" required />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-white text-purple-700 font-bold py-4 rounded-xl hover:bg-white/90 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 mt-6">
              {loading ? 'A criar conta...' : 'Criar Minha Igreja'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-white/80 text-sm">Já tens uma conta? <Link to="/" className="text-white font-semibold hover:underline">Fazer Login</Link></p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  )
}

export default Register