import { NavLink } from 'react-router-dom'
import { Briefcase, Search, FileText, Bookmark, LogOut, Zap, Mic } from 'lucide-react'
import { useUser } from '../context/UserContext'

const links = [
  { to: '/',       label: 'Dashboard', icon: Briefcase },
  { to: '/search', label: 'Search Jobs', icon: Search },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/saved',  label: 'Saved Jobs', icon: Bookmark },
  { to: '/interview', label: 'Interview',  icon: Mic },
]

export default function Navbar() {
  const { user, logout } = useUser()

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Zap size={20} className="text-brand-500" />
          CareerAI
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
