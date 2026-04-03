import { createContext, useContext, useState } from 'react'
import { loginUser, registerUser } from '../api/client'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('career_user')
    return stored ? JSON.parse(stored) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('career_token') || null
  })

  const login = async (email, password) => {
    const res = await loginUser({ email, password })
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('career_token', access_token)
    localStorage.setItem('career_user', JSON.stringify(userData))
    return userData
  }

  const register = async (email, name, password) => {
    const res = await registerUser({ email, name, password })
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('career_token', access_token)
    localStorage.setItem('career_user', JSON.stringify(userData))
    return userData
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('career_user')
    localStorage.removeItem('career_token')
  }

  return (
    <UserContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)