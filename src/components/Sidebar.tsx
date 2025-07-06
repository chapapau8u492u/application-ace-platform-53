
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Briefcase, 
  Calendar, 
  Building2, 
  Settings,
  Home
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Briefcase, label: 'Applications', path: '/applications' },
  { icon: Building2, label: 'Companies', path: '/companies' },
  { icon: Calendar, label: 'Interviews', path: '/interviews' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-slate-200">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">JobTracker</h1>
            <p className="text-sm text-slate-500">Your Career Hub</p>
          </div>
        </div>
      </div>
      
      <nav className="px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <h3 className="font-semibold mb-1">Need Help?</h3>
          <p className="text-sm text-blue-100 mb-3">Check our guide for tips</p>
          <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors">
            View Guide
          </button>
        </div>
      </div>
    </div>
  );
};
