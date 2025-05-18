"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem("isAuthenticated")
      setIsAuthenticated(auth === "true")
      setIsLoading(false)
    }

    // Small delay to ensure localStorage is available (client-side only)
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (window.location.pathname === "/login") {
          router.push("/")
        }
      } else {
        if (window.location.pathname !== "/login") {
          router.push("/login")
        }
      }
    }
  }, [isAuthenticated, isLoading, router])

  const login = async (username: string, password: string) => {
    // Simple hardcoded authentication
    if (username === "admin" && password === "admin123") {
      setIsAuthenticated(true)
      localStorage.setItem("isAuthenticated", "true")
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("isAuthenticated")
    router.push("/login")
  }

  return <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
