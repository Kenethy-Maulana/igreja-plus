import { useEffect, useState } from 'react'
import { Church } from 'lucide-react'

function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false)
  const [text, setText] = useState('')
  const fullText = 'Igreja Plus'

  // Efeito de digitação no nome do app
  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  // Animação de fade out após 3 segundos
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2500)

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish()
    }, 3200)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-700 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B46C1 100%)',
      }}
    >
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 text-center">
        {/* Logo animado */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-30 animate-pulse"></div>
          <div className="relative bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/20 shadow-2xl animate-scale-in">
            <Church className="w-24 h-24 text-white animate-float" strokeWidth={1.5} />
          </div>
        </div>

        {/* Nome do app com efeito de digitação */}
        <h1 className="text-6xl font-bold text-white mb-3 tracking-wider">
          {text}
          <span className="animate-blink">|</span>
        </h1>

        {/* Subtítulo */}
        <p className="text-xl text-white/80 mb-12 font-light tracking-wide animate-fade-in-up">
          Sistema inteligente para igrejas
        </p>

        {/* Spinner de loading moderno */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Versão */}
        <p className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
          v1.0.0
        </p>
      </div>

      {/* CSS de animações customizadas */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes scale-in {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
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
        
        .animate-scale-in {
          animation: scale-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out 0.5s forwards;
          opacity: 0;
        }
        
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  )
}

export default SplashScreen