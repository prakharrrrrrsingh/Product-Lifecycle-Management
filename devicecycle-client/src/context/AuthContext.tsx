import { createContext, useContext, useState } from 'react'

export interface AuthUser {
  token: string
  email: string
  fullName: string | null
  role: string
  expiresAt: string
}

interface AuthCtx {
  token: string | null
  user: AuthUser | null
  login: (u: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({ token: null, user: null, login: () => {}, logout: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('dc-user')
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })

  const login = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem('dc-user', JSON.stringify(u))
    localStorage.setItem('dc-token', u.token)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('dc-user')
    localStorage.removeItem('dc-token')
  }

  return (
    <AuthContext.Provider value={{ token: user?.token ?? null, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
