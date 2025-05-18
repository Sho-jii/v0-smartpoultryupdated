"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"
type ThemeMode = "auto" | "manual"

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto")
  const [mounted, setMounted] = useState(false)

  // Set theme based on user preference or system preference
  useEffect(() => {
    // Only run on client side
    setMounted(true)

    try {
      // Check for saved theme preference
      const savedTheme = localStorage.getItem("theme") as Theme | null
      const savedThemeMode = localStorage.getItem("themeMode") as ThemeMode | null

      if (savedThemeMode) {
        setThemeModeState(savedThemeMode)
      }

      if (savedTheme && savedThemeMode === "manual") {
        setThemeState(savedTheme)
      } else {
        // Auto mode - check time
        updateThemeBasedOnTime()
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
      // Default to auto mode if localStorage fails
      updateThemeBasedOnTime()
    }
  }, [])

  // Update theme based on time when in auto mode
  useEffect(() => {
    if (!mounted) return

    if (themeMode === "auto") {
      updateThemeBasedOnTime()

      // Set up interval to check time every minute
      const interval = setInterval(() => {
        updateThemeBasedOnTime()
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }, [themeMode, mounted])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    // Debug log to verify theme changes
    console.log("Theme changed to:", theme)
  }, [theme, mounted])

  // Update theme based on current time
  const updateThemeBasedOnTime = () => {
    const currentHour = new Date().getHours()
    // Light mode from 6:00 AM to 5:59 PM
    // Dark mode from 6:00 PM to 5:59 AM
    const newTheme = currentHour >= 6 && currentHour < 18 ? "light" : "dark"
    setThemeState(newTheme)
  }

  // Set theme and save to localStorage
  const setTheme = (newTheme: Theme) => {
    console.log("Setting theme to:", newTheme)
    setThemeState(newTheme)

    try {
      // Only save to localStorage if we're on the client side
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newTheme)

        // When manually setting theme, switch to manual mode
        setThemeModeState("manual")
        localStorage.setItem("themeMode", "manual")
      }
    } catch (error) {
      console.error("Error saving theme to localStorage:", error)
    }
  }

  // Toggle between light and dark
  const toggleTheme = () => {
    console.log("Toggling theme from:", theme)
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
  }

  // Set theme mode (auto or manual)
  const setThemeMode = (mode: ThemeMode) => {
    console.log("Setting theme mode to:", mode)
    setThemeModeState(mode)

    try {
      // Only save to localStorage if we're on the client side
      if (typeof window !== "undefined") {
        localStorage.setItem("themeMode", mode)

        if (mode === "auto") {
          updateThemeBasedOnTime()
        }
      }
    } catch (error) {
      console.error("Error saving theme mode to localStorage:", error)
    }
  }

  // Provide a default context value for server-side rendering
  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    setTheme,
    toggleTheme,
    setThemeMode,
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
