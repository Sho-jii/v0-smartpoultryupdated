"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ThemeToggle from "@/components/theme-toggle"
import { Home, Utensils, Droplet, Clock, Menu, X, LogOut, Info, Sliders } from "lucide-react"

export default function NavigationMenu() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { name: "Dashboard", href: "/", icon: <Home size={18} /> },
    { name: "Food Analytics", href: "/feeding-analytics", icon: <Utensils size={18} /> },
    { name: "Water Analytics", href: "/water-analytics", icon: <Droplet size={18} /> },
    { name: "Feeding Schedule", href: "/feeding-schedule", icon: <Clock size={18} /> },
    { name: "Water Schedule", href: "/water-schedule", icon: <Clock size={18} /> },
    { name: "Manual Controls", href: "/manual-controls", icon: <Sliders size={18} /> },
    { name: "About", href: "/about", icon: <Info size={18} /> },
  ]

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <div className="mb-8">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isActive(item.href)
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
          >
            <LogOut size={16} className="mr-1" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-700 dark:text-gray-300">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mt-4 flex flex-col space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  isActive(item.href)
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
