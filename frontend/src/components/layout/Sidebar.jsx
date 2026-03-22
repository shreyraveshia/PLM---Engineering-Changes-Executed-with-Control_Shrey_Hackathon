import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, FileStack, ClipboardList,
  BarChart3, Settings, LogOut, Cpu
} from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin','engineering_user','approver','operations_user']
  },
  {
    to: '/products',
    icon: Package,
    label: 'Products',
    roles: ['admin','engineering_user','approver','operations_user']
  },
  {
    to: '/boms',
    icon: FileStack,
    label: 'Bills of Materials',
    roles: ['admin','engineering_user','approver','operations_user']
  },
  {
    to: '/ecos',
    icon: ClipboardList,
    label: 'Change Orders',
    roles: ['admin','engineering_user','approver']
  },
  {
    to: '/reports',
    icon: BarChart3,
    label: 'Reports',
    roles: ['admin','engineering_user','approver']
  },
  {
    to: '/settings',
    icon: Settings,
    label: 'Settings',
    roles: ['admin']
  },
];

const ROLE_COLORS = {
  admin:            'bg-purple-900 text-purple-200',
  engineering_user: 'bg-blue-900 text-blue-200',
  approver:         'bg-green-900 text-green-200',
  operations_user:  'bg-slate-700 text-slate-300',
};

const ROLE_LABELS = {
  admin:            'Admin',
  engineering_user: 'Engineer',
  approver:         'Approver',
  operations_user:  'Operations',
};

export default function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.some(role => hasRole(role))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="w-60 min-h-screen flex flex-col fixed left-0 top-0 z-50"
      style={{ backgroundColor: '#1e293b' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">PLM Control</p>
            <p className="text-slate-400 text-xs leading-tight">Engineering Changes</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-500 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${ROLE_COLORS[user?.role] || 'bg-slate-700 text-slate-300'}`}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
