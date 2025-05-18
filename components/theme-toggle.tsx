"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Clock } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"

// Define the ThemeMode type to match the one in theme-context.tsx
type ThemeMode = "auto" | "manual"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [contextError, setContextError] = useState(false)
  const [localTheme, setLocalTheme] = useState("light")
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode>("auto")

  // Try to use the theme context
  let themeContext
  try {
    themeContext = useTheme()
  } catch (error) {
    if (!contextError) {
      console.error("Theme context error:", error)
      setContextError(true)
    }
    themeContext = null
  }

  // Safe access to theme context
  let theme = localTheme
  let themeMode = localThemeMode
  let toggleTheme = () => {
    console.log("Fallback toggle theme")
    const newTheme = localTheme === "light" ? "dark" : "light"
    setLocalTheme(newTheme)
    if (typeof window !== "undefined") {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      try {
        localStorage.setItem("theme", newTheme)
        localStorage.setItem("themeMode", "manual")
      } catch (e) {
        console.error("localStorage error:", e)
      }
    }
  }

  // Fix: Change the type to match ThemeMode
  let setThemeMode = (mode: ThemeMode) => {
    console.log("Fallback set theme mode:", mode)
    setLocalThemeMode(mode)
    try {
      localStorage.setItem("themeMode", mode)
    } catch (e) {
      console.error("localStorage error:", e)
    }
  }

  if (themeContext) {
    theme = themeContext.theme
    themeMode = themeContext.themeMode
    toggleTheme = themeContext.toggleTheme
    setThemeMode = themeContext.setThemeMode
  }

  // Client-side only
  useEffect(() => {
    setMounted(true)

    // Initialize local state from localStorage if context failed
    if (contextError && typeof window !== "undefined") {
      try {
        const savedTheme = localStorage.getItem("theme")
        const savedMode = localStorage.getItem("themeMode") as ThemeMode | null

        if (savedTheme) {
          setLocalTheme(savedTheme)
        }

        if (savedMode) {
          setLocalThemeMode(savedMode)
        }

        // Apply theme directly if context failed
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      } catch (e) {
        console.error("Error reading from localStorage:", e)
      }
    }
  }, [contextError])

  // Don't render anything until mounted on client
  if (!mounted) {
    return null
  }

  const handleToggleClick = () => {
    console.log("Toggle button clicked, current theme:", theme)
    toggleTheme()
  }

  const handleModeChange = (mode: ThemeMode) => {
    console.log("Setting mode to:", mode)
    setThemeMode(mode)
    setShowOptions(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
          <button
            onClick={handleToggleClick}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {theme === "light" ? (
              <>
                <Moon size={16} className="mr-2" />
                Switch to Dark Mode
              </>
            ) : (
              <>
                <Sun size={16} className="mr-2" />
                Switch to Light Mode
              </>
            )}
          </button>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          <button
            onClick={() => handleModeChange("auto")}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              themeMode === "auto" ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-200"
            } hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            <Clock size={16} className="mr-2" />
            Auto (6AM-6PM Light)
            {themeMode === "auto" && <span className="ml-1">✓</span>}
          </button>

          <button
            onClick={() => handleModeChange("manual")}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              themeMode === "manual"
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : "text-gray-700 dark:text-gray-200"
            } hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            <span className="w-4 h-4 mr-2 flex items-center justify-center">
              <span className="block w-3 h-3 rounded-full border-2 border-current"></span>
            </span>
            Manual Control
            {themeMode === "manual" && <span className="ml-1">✓</span>}
          </button>
        </div>
      )}
    </div>
  )
}
