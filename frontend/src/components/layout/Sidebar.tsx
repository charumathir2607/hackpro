import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Network,
  BarChart3,
  Gauge,
  Bell,
  FileText,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/feeder-network', label: 'Feeder Network', icon: Network },
  { path: '/section-analysis', label: 'Section Analysis', icon: BarChart3 },
  { path: '/smart-meters', label: 'Smart Meters', icon: Gauge },
  { path: '/alerts', label: 'Alerts & Inspections', icon: Bell },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 shrink-0 bg-navy-900 border-r border-navy-700/50 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-500/30 to-cyan-accent/20 border border-electric-500/30 flex items-center justify-center shadow-glow-green shrink-0">
          <Zap className="h-5 w-5 text-electric-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 tracking-tight">GridSentinel</p>
          <p className="text-[10px] text-slate-500 leading-tight">Energy Monitoring</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-electric-500/10 text-electric-500 border border-electric-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/50'
              )}
            >
              <Icon className={clsx('h-4 w-4 shrink-0', active ? 'text-electric-500' : 'text-slate-500 group-hover:text-slate-300')} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-navy-700/50">
        <div className="text-[10px] text-slate-600 space-y-0.5">
          <p>GridSentinel v1.0</p>
          <p>© 2026 Hackathon Demo</p>
        </div>
      </div>
    </aside>
  );
}
