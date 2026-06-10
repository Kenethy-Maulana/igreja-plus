# 🏛️ Igreja Plus

Sistema completo de gestão para igrejas, desenvolvido como uma aplicação web moderna, responsiva e com arquitetura Multi-Tenant (SaaS).

🔗 **Demonstração Online (Deploy):** [https://igreja-plus.vercel.app](https://igreja-plus.vercel.app) *(substitui pelo teu link real da Vercel)*

---

## 📋 Funcionalidades Principais

- ✅ **Gestão Multi-Tenant:** Isolamento total de dados entre diferentes igrejas (Sede e Filiais).
- ✅ **Dashboard Interativo:** Métricas em tempo real de membros, finanças e ministérios.
- ✅ **Gestão de Membros:** Cadastro completo, histórico e vinculação a ministérios.
- ✅ **Controlo Financeiro:** Registo de dízimos, ofertas, despesas e saldos.
- ✅ **Eventos e Escalas:** Agendamento de cultos com definição de MCs e pregadores.
- ✅ **Relatórios em PDF:** Geração de relatórios profissionais e detalhados.
- ✅ **Perfil de Utilizador:** Gestão de dados pessoais e upload de avatar.
- ✅ **Dark Mode:** Suporte nativo a tema claro e escuro.

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** (Biblioteca de Interface)
- **Vite** (Build Tool e Dev Server)
- **TailwindCSS** (Estilização Utility-First)
- **React Router DOM** (Roteamento de Páginas)
- **Lucide React** (Ícones)
- **jsPDF & jspdf-autotable** (Geração de Relatórios PDF)

### Backend & Infraestrutura
- **Supabase** (Backend-as-a-Service)
- **PostgreSQL** (Base de Dados Relacional)
- **Supabase Auth** (Autenticação e Gestão de Sessões)
- **Supabase Storage** (Armazenamento de Imagens/Avatares)
- **Vercel** (Hospedagem e Deploy Contínuo)

---

## ⚙️ Pré-requisitos

Antes de começar, certifica-te de que tens instalado no teu computador:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- Um editor de código (ex: [VS Code](https://code.visualstudio.com/))
- Uma conta no [Supabase](https://supabase.com/) (para as variáveis de ambiente)

---

## 🛠️ Instruções Passo a Passo para Execução Local

Sigue estes passos para configurar e executar o ecossistema no teu ambiente de desenvolvimento:

### 1. Clonar o Repositório
Abre o teu terminal e executa o seguinte comando para copiar o código para a tua máquina:
```bash
git clone https://github.com/Kenethy-Maulana/igreja-plus.git