import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Tag, Search, DollarSign, Calendar as CalendarIcon, CreditCard, Settings, LayoutDashboard, LogOut, LogIn, ChevronRight, Home, BarChart3, Heart, FileText, Vote, LifeBuoy } from 'lucide-react';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'People', path: '/people', icon: Users },
    { label: 'Families', path: '/families', icon: Home },
    { label: 'Tags', path: '/tags', icon: Tag },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Giving', path: '/giving', icon: DollarSign },
    { label: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { label: 'Volunteers', path: '/volunteers', icon: Heart },
    { label: 'Connect Cards', path: '/connect-cards', icon: CreditCard },
    { label: 'Forms', path: '/forms', icon: FileText },
    { label: 'Elections', path: '/elections', icon: Vote },
    { label: 'Help Desk', path: '/help-desk', icon: LifeBuoy },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-30">
        <div className="px-5 py-5 border-b border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">EF</span>
            </div>
            <div>
              <span className="text-white font-semibold text-sm block">Easy Flow Church</span>
              <span className="text-slate-500 text-[10px]">Church Management</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Main</p>
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
          <p className="px-3 py-2 mt-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Modules</p>
          {navItems.slice(4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate font-medium">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{(user?.role || 'staff').replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              <LogIn size={16} /> Sign In
            </Link>
          )}
        </div>
      </aside>
      <main className="flex-1 ml-64 overflow-auto">
        <Outlet context={{ user, loading }} />
      </main>
    </div>
  );
}