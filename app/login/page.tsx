"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import LoadingAnimation from "@/components/loading-animation"
import ThemeToggle from "@/components/theme-toggle"
import { ThemeProvider } from "@/contexts/theme-context"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // Client-side only
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoggingIn(true)

    try {
      const success = await login(username, password)
      if (success) {
        // Show loading animation for a moment before redirecting
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } else {
        setError("Invalid username or password")
        setIsLoggingIn(false)
      }
    } catch (err) {
      setError("An error occurred during login")
      setIsLoggingIn(false)
    }
  }

  // Apply theme class directly to ensure it works
  useEffect(() => {
    if (mounted) {
      try {
        const savedTheme = localStorage.getItem("theme")
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      } catch (e) {
        console.error("Error accessing localStorage:", e)
      }
    }
  }, [mounted])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {isLoggingIn && <LoadingAnimation />}

      <div className="absolute top-4 right-4">
        {/* Ensure ThemeToggle is wrapped with ThemeProvider */}
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Smart Poultry Farming</h1>
          <p className="text-gray-600 dark:text-gray-400">Login to access your dashboard</p>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoggingIn}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Use the following credentials:</p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        </form>
      </div>
    </div>
  )
}
