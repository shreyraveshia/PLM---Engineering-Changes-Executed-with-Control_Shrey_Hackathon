// Dashboard fetches active products, BoMs, and ECOs simultaneously using 
// Promise.all, displays four clickable stat cards with role-appropriate data, and 
// shows a recent ECOs list with color-coded status dots, type badges, and stage 
// names — with operations users seeing only the stat cards and engineers seeing a 
// "Create first ECO" prompt when the list is empty.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Package, FileStack, ClipboardList, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({ products: 0, boms: 0, open_ecos: 0, applied_ecos: 0 });
  const [recentEcos, setRecentEcos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, bomsRes, ecosRes] = await Promise.all([
          api.get('/products?status=active'),
          api.get('/boms?status=active'),
          hasRole('admin', 'engineering_user', 'approver') ? api.get('/ecos') : Promise.resolve({ data: [] }),
        ]);
        const ecos = ecosRes.data;
        setStats({
          products: productsRes.data.length,
          boms: bomsRes.data.length,
          open_ecos: ecos.filter(e => e.status === 'open').length,
          applied_ecos: ecos.filter(e => e.status === 'applied').length,
        });
        setRecentEcos(ecos.slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const canSeeEcos = hasRole('admin', 'engineering_user', 'approver');

  const STAT_CARDS = [
    { label: 'Active Products', value: stats.products, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', to: '/products' },
    { label: 'Active BoMs', value: stats.boms, icon: FileStack, color: 'text-teal-600', bg: 'bg-teal-50', to: '/boms' },
    ...(canSeeEcos ? [
      { label: 'Open ECOs', value: stats.open_ecos, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', to: '/ecos' },
      { label: 'Applied ECOs', value: stats.applied_ecos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', to: '/ecos' },
    ] : []),
  ];

  const ROLE_DESCRIPTION = {
    admin: 'You have full access to all system features.',
    engineering_user: 'You can create and modify ECOs and propose changes.',
    approver: 'You can review and approve Engineering Change Orders.',
    operations_user: 'You have read-only access to active products and BoMs.',
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, <span className="font-medium text-gray-700">{user?.name}</span>.{' '}
          {ROLE_DESCRIPTION[user?.role]}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {!hasRole('admin', 'engineering_user', 'approver') && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Quick Access</h2>
          <p className="text-xs text-gray-400 mb-5">You have read-only access to the following sections.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/products"
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Products</p>
                <p className="text-xs text-gray-400">View active product catalogue</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-blue-400"/>
            </Link>
            <Link to="/boms"
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all group">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileStack size={20} className="text-teal-600"/>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">Bills of Materials</p>
                <p className="text-xs text-gray-400">View all BoM structures</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-teal-400"/>
            </Link>
          </div>
        </div>
      )}

      {hasRole('admin', 'engineering_user', 'approver') && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Change Orders</h2>
            <Link to="/ecos" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
            ) : recentEcos.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardList size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No ECOs yet</p>
                {hasRole('admin', 'engineering_user') && (
                  <Link to="/ecos/new" className="text-sm text-brand-500 hover:underline mt-1 block">
                    Create your first ECO
                  </Link>
                )}
              </div>
            ) : (
              recentEcos.map(eco => (
                <Link key={eco.id} to={`/ecos/${eco.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${eco.status === 'applied' ? 'bg-green-500' :
                      eco.status === 'open' ? 'bg-amber-500' : 'bg-gray-400'
                      }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{eco.title}</p>
                      <p className="text-xs text-gray-400">{eco.product_name} · {eco.stage_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${eco.eco_type === 'product' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                      {eco.eco_type === 'product' ? 'Product' : 'BoM'}
                    </span>
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(eco.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
