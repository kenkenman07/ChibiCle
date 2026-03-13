import { Outlet, NavLink } from 'react-router-dom'
import { Home, Clock, Settings } from 'lucide-react'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-0.5 text-[11px] font-grotesk font-medium tracking-wide transition-colors ${
    isActive ? 'text-primary' : 'text-navy/35'
  }`

export function Layout() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-navy/10 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 px-4 max-w-lg mx-auto">
          <NavLink to="/" end className={navClass}>
            <Home size={20} />
            <span>HOME</span>
          </NavLink>
          <NavLink to="/history" className={navClass}>
            <Clock size={20} />
            <span>HISTORY</span>
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings size={20} />
            <span>SETTINGS</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
