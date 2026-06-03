import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import { supabase } from '../../supabase/client'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { 
  FileText, Users, Wallet, Church, Calendar, 
  UserCog, Download, Loader2, ShieldAlert 
} from 'lucide-react'
import toast from 'react-hot-toast'

function Reports() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(null) // Guarda qual relatório está a gerar

  // 🔒 Lógica de Permissões Rigorosa
  const role = profile?.role
  const canAccess = ['admin', 'pastor', 'secretary', 'treasurer'].includes(role)
  const canViewFinancial = ['admin', 'pastor', 'secretary', 'treasurer'].includes(role)
  const canViewMembers = ['admin', 'pastor', 'secretary'].includes(role)
  const canViewMinistries = ['admin', 'pastor', 'secretary'].includes(role)
  const canViewSchedules = ['admin', 'pastor', 'secretary'].includes(role)
  const canViewUsers = ['admin', 'pastor'].includes(role)

  useEffect(() => {
    if (profile && !canAccess) {
      toast.error('Acesso negado. Apenas a liderança pode gerar relatórios.')
    }
  }, [profile, canAccess])

  if (!profile) return <div className="p-10 text-center">A carregar...</div>
  if (!canAccess) {
    return (
      <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen">
        <Sidebar />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Acesso Restrito</h2>
            <p className="text-gray-500 dark:text-gray-400">Apenas a liderança da igreja tem permissão para aceder a esta área.</p>
          </div>
        </div>
      </div>
    )
  }

  // --- FUNÇÕES DE BUSCA DE DADOS ---
  const getVisibleBranchFilter = (query) => {
    const ids = profile.visibleBranchIds || []
    if (ids.length > 0) return query.in('branch_id', ids)
    return query
  }

  const fetchMembersData = async () => {
    let query = supabase.from('members').select('full_name, gender, phone, baptized, ministries(name)')
    query = getVisibleBranchFilter(query)
    const { data } = await query
    return data || []
  }

  const fetchFinancialData = async () => {
    let query = supabase.from('finances').select('date, type, category, description, amount')
    query = getVisibleBranchFilter(query).order('date', { ascending: false })
    const { data } = await query
    return data || []
  }

  const fetchMinistriesData = async () => {
    let query = supabase.from('ministries').select('name, leader, members(count)')
    query = getVisibleBranchFilter(query)
    const { data } = await query
    return data || []
  }

  const fetchSchedulesData = async () => {
    let query = supabase.from('escalas').select('service_date, day_of_week, service_time, service_name, mc_name, preacher_name, branches(name)')
    query = getVisibleBranchFilter(query).order('service_date', { ascending: false })
    const { data } = await query
    return data || []
  }

  const fetchUsersData = async () => {
    let query = supabase.from('users').select('full_name, username, role, active')
    query = getVisibleBranchFilter(query)
    const { data } = await query
    return data || []
  }

  // --- FUNÇÃO GERADORA DE PDF PROFISSIONAL ---
  const generatePDF = (title, data, columns, rows) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const churchName = profile.branch_name || 'Igreja Plus'
    const branchInfo = profile.visibleBranchIds?.length > 1 ? 'Relatório Consolidado (Sede + Filiais)' : `Filial: ${churchName}`

    // 1. Cabeçalho Elegante
    doc.setFillColor(88, 28, 135) // Purple-900
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('IGREJA PLUS', 14, 18)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(churchName, 14, 28)
    doc.setFontSize(10)
    doc.text(branchInfo, 14, 34)

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 55)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 14, 62)
    doc.text(`Por: ${profile.full_name} (${profile.role})`, 14, 68)

    // 2. Tabela de Dados
    doc.autoTable({
      startY: 75,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { 
        fillColor: [88, 28, 135], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        textColor: 50,
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 243, 255] // Purple-50
      },
      margin: { top: 75, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Rodapé em todas as páginas
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text('Documento confidencial gerado por Igreja Plus', 14, doc.internal.pageSize.getHeight() - 10)
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10)
      }
    })

    // 3. Resumo Financeiro (Apenas se for relatório financeiro)
    if (title.includes('Financeiro')) {
      const finalY = doc.lastAutoTable.finalY + 10
      const totalIncome = data.filter(d => d.type === 'income').reduce((sum, d) => sum + Number(d.amount), 0)
      const totalExpense = data.filter(d => d.type === 'expense').reduce((sum, d) => sum + Number(d.amount), 0)
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(88, 28, 135)
      doc.text('Resumo Financeiro:', 14, finalY)
      
      doc.setFontSize(10)
      doc.setTextColor(22, 163, 74) // Green
      doc.text(`Total Entradas: ${totalIncome.toLocaleString('pt-PT')} MT`, 14, finalY + 8)
      doc.setTextColor(220, 38, 38) // Red
      doc.text(`Total Saídas: ${totalExpense.toLocaleString('pt-PT')} MT`, 14, finalY + 15)
      doc.setTextColor(88, 28, 135) // Purple
      doc.text(`Saldo Final: ${(totalIncome - totalExpense).toLocaleString('pt-PT')} MT`, 14, finalY + 22)
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // --- HANDLERS DE GERAÇÃO ---
  const handleGenerate = async (type) => {
    setGenerating(type)
    setLoading(true)
    
    try {
      let title = '', columns = [], rows = [], data = []

      if (type === 'members') {
        title = 'Relatório de Membros'
        data = await fetchMembersData()
        columns = ['Nome Completo', 'Género', 'Telefone', 'Ministério', 'Batizado']
        rows = data.map(m => [
          m.full_name,
          m.gender,
          m.phone || '-',
          m.ministries?.name || '-',
          m.baptized ? 'Sim' : 'Não'
        ])
      } 
      else if (type === 'financial') {
        title = 'Relatório Financeiro'
        data = await fetchFinancialData()
        columns = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (MT)']
        rows = data.map(f => [
          f.date ? new Date(f.date + 'T00:00:00').toLocaleDateString('pt-PT') : '-',
          f.type === 'income' ? 'Entrada' : 'Saída',
          f.category,
          f.description || '-',
          Number(f.amount).toLocaleString('pt-PT')
        ])
      }
      else if (type === 'ministries') {
        title = 'Relatório de Ministérios'
        data = await fetchMinistriesData()
        columns = ['Ministério', 'Líder', 'Nº de Membros']
        rows = data.map(m => [
          m.name,
          m.leader || '-',
          m.members?.[0]?.count || 0
        ])
      }
      else if (type === 'schedules') {
        title = 'Relatório de Escalas de Culto'
        data = await fetchSchedulesData()
        columns = ['Data', 'Dia', 'Hora', 'Culto', 'MC', 'Pregador', 'Local']
        rows = data.map(s => [
          s.service_date ? new Date(s.service_date + 'T00:00:00').toLocaleDateString('pt-PT') : '-',
          s.day_of_week || '-',
          s.service_time || '-',
          s.service_name,
          s.mc_name || '-',
          s.preacher_name || '-',
          s.branches?.name || profile.branch_name
        ])
      }
      else if (type === 'users') {
        title = 'Relatório de Utilizadores do Sistema'
        data = await fetchUsersData()
        columns = ['Nome', 'Utilizador', 'Cargo', 'Status']
        rows = data.map(u => [
          u.full_name,
          u.username,
          u.role,
          u.active ? 'Ativo' : 'Inativo'
        ])
      }

      if (data.length === 0) {
        toast.error('Não há dados para gerar este relatório no período/igreja selecionada.')
      } else {
        generatePDF(title, data, columns, rows)
        toast.success('PDF gerado com sucesso!')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao gerar relatório.')
    } finally {
      setLoading(false)
      setGenerating(null)
    }
  }

  // --- CONFIGURAÇÃO DOS CARTÕES DE RELATÓRIO ---
  const reportCards = [
    { 
      id: 'members', 
      title: 'Membros', 
      desc: 'Lista completa de membros, contactos e status de batismo.', 
      icon: Users, 
      color: 'blue',
      allowed: canViewMembers 
    },
    { 
      id: 'financial', 
      title: 'Financeiro', 
      desc: 'Entradas, saídas, categorias e saldo consolidado.', 
      icon: Wallet, 
      color: 'green',
      allowed: canViewFinancial 
    },
    { 
      id: 'ministries', 
      title: 'Ministérios', 
      desc: 'Lista de ministérios, líderes e contagem de integrantes.', 
      icon: Church, 
      color: 'purple',
      allowed: canViewMinistries 
    },
    { 
      id: 'schedules', 
      title: 'Escalas de Culto', 
      desc: 'Programação de cultos, MCs, pregadores e locais.', 
      icon: Calendar, 
      color: 'orange',
      allowed: canViewSchedules 
    },
    { 
      id: 'users', 
      title: 'Utilizadores', 
      desc: 'Contas do sistema, cargos e status de atividade.', 
      icon: UserCog, 
      color: 'indigo',
      allowed: canViewUsers 
    },
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="flex bg-gray-100 dark:bg-gray-950 min-h-screen transition">
      <Sidebar />
      <div className="flex-1 p-6">
        <Navbar />

        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Central de Relatórios
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gere documentos PDF profissionais com os dados da <span className="font-semibold text-purple-600">{profile.branch_name}</span>.
              {profile.visibleBranchIds?.length > 1 && ' (Inclui dados das filiais)'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCards.filter(card => card.allowed).map((card) => {
              const Icon = card.icon
              return (
                <div 
                  key={card.id}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${getColorClasses(card.color)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm`}>
                      <Icon size={28} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">PDF</span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                  <p className="text-sm opacity-80 mb-6 min-h-[40px]">{card.desc}</p>
                  
                  <button
                    onClick={() => handleGenerate(card.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold shadow-sm hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating === card.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        A gerar...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Baixar Relatório
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {reportCards.filter(card => card.allowed).length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Não tens permissão para gerar nenhum tipo de relatório.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports