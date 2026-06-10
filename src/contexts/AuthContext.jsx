import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
async function loadSession() {
  setLoading(true)
  
  try {
    // 1. Verificar se há utilizador autenticado no Supabase Auth
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (supabaseUser) {
      setUser(supabaseUser)
      
      // Buscar o perfil na tabela users
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*, branches(name, parent_id)')
        .eq('id', supabaseUser.id)
        .maybeSingle()
      
      console.log('🔵 [AUTH] Profile Data:', profileData)
      
      if (profileData && !profileError) {
        // Buscar os branch_ids visíveis
        let visibleBranchIds = [profileData.branch_id].filter(Boolean)
        
        try {
          const { data: visibleBranches, error: rpcError } = await supabase
            .rpc('get_visible_branch_ids', { p_user_id: supabaseUser.id })
          
          if (!rpcError && visibleBranches && visibleBranches.length > 0) {
            visibleBranchIds = visibleBranches.map(b => b.branch_id).filter(Boolean)
          }
        } catch (rpcErr) {
          console.warn('⚠️ [AUTH] Erro ao chamar RPC, usando fallback')
        }
        
        if (visibleBranchIds.length === 0 && profileData.branch_id) {
          visibleBranchIds = [profileData.branch_id]
        }
        
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          role: profileData.role,
          branch_id: profileData.branch_id,
          branch_name: profileData.branches?.name || 'Minha Igreja',
          branch_parent_id: profileData.branches?.parent_id,
          username: profileData.username,
          active: profileData.active,
          visibleBranchIds: visibleBranchIds,
          isHeadquartersAdmin: profileData.role === 'admin' && !profileData.branches?.parent_id,
          isSuperAdmin: !profileData.branch_id
        })
      } else {
        console.warn('⚠️ [AUTH] Perfil não encontrado no Supabase Auth')
        setProfile(null)
      }
    } else {
      // 2. Sistema antigo: verificar localStorage
      setUser(null)
      
      const storedUser = localStorage.getItem('church_user')
      const storedRole = localStorage.getItem('church_role')

      console.log('🔵 [AUTH] Verificando localStorage:', { storedUser: !!storedUser, storedRole })

      if (storedUser && storedRole) {
        try {
          const parsedUser = JSON.parse(storedUser)
          console.log('🔵 [AUTH] Utilizador encontrado no localStorage:', parsedUser)
          
          let branchName = 'Minha Igreja'
          let branchParentId = null
          
          if (parsedUser.branch_id) {
            const { data: branchData } = await supabase
              .from('branches')
              .select('name, parent_id')
              .eq('id', parsedUser.branch_id)
              .maybeSingle()
            
            if (branchData) {
              branchName = branchData.name
              branchParentId = branchData.parent_id
            }
          }
          
          let visibleBranchIds = [parsedUser.branch_id].filter(Boolean)
          
          try {
            const { data: visibleBranches } = await supabase
              .rpc('get_visible_branch_ids', { p_user_id: parsedUser.id })
            
            if (visibleBranches && visibleBranches.length > 0) {
              visibleBranchIds = visibleBranches.map(b => b.branch_id).filter(Boolean)
            }
          } catch (err) {
            console.warn('⚠️ [AUTH] Erro ao chamar RPC, usando fallback')
          }
          
          if (visibleBranchIds.length === 0 && parsedUser.branch_id) {
            visibleBranchIds = [parsedUser.branch_id]
          }
          
          const newProfile = {
            id: parsedUser.id,
            full_name: parsedUser.full_name,
            role: storedRole,
            branch_id: parsedUser.branch_id,
            branch_name: branchName,
            branch_parent_id: branchParentId,
            username: parsedUser.username,
            active: parsedUser.active,
            visibleBranchIds: visibleBranchIds,
            isHeadquartersAdmin: storedRole === 'admin' && !branchParentId,
            isSuperAdmin: !parsedUser.branch_id
          }
          
          console.log('🟢 [AUTH] Profile definido a partir do localStorage:', newProfile)
          setProfile(newProfile)
        } catch (parseError) {
          console.error('🔴 [AUTH] Erro ao fazer parse do localStorage:', parseError)
          localStorage.removeItem('church_user')
          localStorage.removeItem('church_role')
          setProfile(null)
        }
      } else {
        console.log('🟡 [AUTH] Nenhum utilizador encontrado no localStorage')
        setProfile(null)
      }
    }
  } catch (err) {
    console.error('❌ [AUTH] Erro inesperado:', err)
    setProfile(null)
  }
  
  setLoading(false)
}

  async function createProfileForNewUser(supabaseUser) {
    try {
      const metadata = supabaseUser.user_metadata || {}
      
      let branchId = null
      let branchName = 'Minha Igreja'
      let branchParentId = null
      
      if (metadata.church_name) {
        const { data: existingBranch } = await supabase
          .from('branches')
          .select('id, name, parent_id')
          .eq('name', metadata.church_name)
          .maybeSingle()
        
        if (existingBranch) {
          branchId = existingBranch.id
          branchName = existingBranch.name
          branchParentId = existingBranch.parent_id
        } else {
          const { data: newBranch } = await supabase
            .from('branches')
            .insert([{ name: metadata.church_name }])
            .select('id, name, parent_id')
            .single()
          
          if (newBranch) {
            branchId = newBranch.id
            branchName = newBranch.name
            branchParentId = newBranch.parent_id
          }
        }
      }
      
      const { error: createError } = await supabase
        .from('users')
        .insert([{
          id: supabaseUser.id,
          username: supabaseUser.email,
          password: 'supabase_auth',
          full_name: metadata.pastor_name || 'Administrador',
          role: 'admin',
          branch_id: branchId,
          active: true
        }])
      
      if (createError) {
        console.error('❌ [AUTH] Erro ao criar perfil:', createError)
        setProfile(null)
        return
      }
      
      // Buscar o perfil recém-criado
      const { data: newProfile } = await supabase
        .from('users')
        .select('*, branches(name, parent_id)')
        .eq('id', supabaseUser.id)
        .maybeSingle()
      
      if (newProfile) {
        setProfile({
          id: newProfile.id,
          full_name: newProfile.full_name,
          role: newProfile.role,
          branch_id: newProfile.branch_id,
          branch_name: newProfile.branches?.name || branchName,
          branch_parent_id: newProfile.branches?.parent_id || branchParentId,
          username: newProfile.username,
          active: newProfile.active,
          visibleBranchIds: [newProfile.branch_id],
          isHeadquartersAdmin: newProfile.role === 'admin' && !newProfile.branches?.parent_id,
          isSuperAdmin: !newProfile.branch_id
        })
        console.log('✅ [AUTH] Perfil criado com sucesso!')
      }
    } catch (err) {
      console.error('❌ [AUTH] Erro ao criar perfil:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadSession()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('church_user')
    localStorage.removeItem('church_role')
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}