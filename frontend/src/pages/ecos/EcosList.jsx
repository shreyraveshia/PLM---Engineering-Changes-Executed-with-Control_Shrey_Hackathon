import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Eye, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGE_COLORS = {
  'New':      'bg-gray-100 text-gray-600 border border-gray-200',
  'Approval': 'bg-amber-100 text-amber-700 border border-amber-200',
  'Done':     'bg-green-100 text-green-700 border border-green-200',
};

export default function EcosList() {
  const [ecos, setEcos] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/ecos${params}`);
      setEcos(res.data);
    } catch (err) {
      toast.error('Failed to load ECOs');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = ecos.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Engineering Change Orders</h1>
          <p className="page-subtitle">Propose, review, and apply controlled changes</p>
        </div>
        {hasRole('admin', 'engineering_user') && (
          <button onClick={() => navigate('/ecos/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New ECO
          </button>
        )}
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ECOs or products..." className="input-field pl-9" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['open','applied','all'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  statusFilter === f ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Title','Type','Product','Stage','Status','Created by','Date',''].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="table-cell text-center py-12 text-gray-400">Loading ECOs...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-cell text-center py-12">
                  <p className="text-gray-400 text-sm">No ECOs found</p>
                  {hasRole('admin','engineering_user') && (
                    <Link to="/ecos/new" className="text-sm text-brand-500 hover:underline mt-1 block">
                      Create your first ECO →
                    </Link>
                  )}
                </td>
              </tr>
            ) : filtered.map(eco => (
              <tr key={eco.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-cell max-w-xs">
                  <Link to={`/ecos/${eco.id}`} className="font-medium text-gray-900 hover:text-brand-500 line-clamp-2">
                    {eco.title}
                  </Link>
                </td>
                <td className="table-cell">
                  <span className={eco.eco_type === 'product' ? 'badge-product' : 'badge-bom'}>
                    {eco.eco_type === 'product' ? 'Product' : 'BoM'}
                  </span>
                </td>
                <td className="table-cell text-gray-600">{eco.product_name}</td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[eco.stage_name] || 'bg-gray-100 text-gray-600'}`}>
                    {eco.stage_name}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={eco.status === 'applied' ? 'badge-applied' : eco.status === 'open' ? 'badge-open' : 'badge-archived'}>
                    {eco.status}
                  </span>
                </td>
                <td className="table-cell text-gray-500">{eco.created_by_name}</td>
                <td className="table-cell text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(eco.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="table-cell">
                  <Link to={`/ecos/${eco.id}`}
                    className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded inline-flex">
                    <Eye size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
