import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BomsList() {
  const [boms, setBoms] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    setLoading(true);
    api.get(`/boms${params}`)
      .then(res => setBoms(res.data))
      .catch(() => toast.error('Failed to load BoMs'))
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = boms.filter(b =>
    b.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Bills of Materials</h1>
          <p className="page-subtitle">Manufacturing structures and component recipes</p>
        </div>
        {hasRole('admin', 'engineering_user') && (
          <button onClick={() => navigate('/boms/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New BoM
          </button>
        )}
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name..." className="input-field pl-9" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['active','archived','all'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  filter === f ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Product','BoM Version','Components','Operations','Product Status','BoM Status','Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="table-cell text-center py-12 text-gray-400">Loading BoMs...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-12 text-gray-400">No BoMs found</td></tr>
            ) : filtered.map(bom => (
              <tr key={bom.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-cell font-medium text-gray-900">{bom.product_name}</td>
                <td className="table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                    v{bom.version}
                  </span>
                </td>
                <td className="table-cell text-gray-500">—</td>
                <td className="table-cell text-gray-500">—</td>
                <td className="table-cell">
                  <span className={bom.product_status === 'active' ? 'badge-active' : 'badge-archived'}>
                    {bom.product_status}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={bom.status === 'active' ? 'badge-active' : 'badge-archived'}>
                    {bom.status}
                  </span>
                </td>
                <td className="table-cell">
                  <Link to={`/boms/${bom.id}`}
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
