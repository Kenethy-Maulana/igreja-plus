import { createContext, useEffect, useState } from 'react'

import { supabase } from '../supabase/client'

export const UserContext = createContext()

export function UserProvider({ children }) {

  const [profile, setProfile] = useState(null)

  async function getProfile() {

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data)
  }

  useEffect(() => {
    getProfile()
  }, [])

  return (
    <UserContext.Provider
      value={{
        profile,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}