import { createContext, useContext, useState, useEffect } from 'react'
import { createUser } from '../api/client'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('career_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (email, name) => {
    const res = await createUser({ email, name })
    const userData = res.data
    setUser(userData)
    localStorage.setItem('career_user', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('career_user')
  }

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
