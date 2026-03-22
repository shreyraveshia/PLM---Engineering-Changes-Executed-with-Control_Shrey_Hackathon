import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Archive, Eye, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/products${params}`);
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleArchive = async (id, name) => {
    if (!window.confirm(`Archive "${name}"? This cannot be undone.`)) return;
    try {
      await api.patch(`/products/${id}/archive`);
      toast.success('Product archived successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to archive product');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Master product registry with version control</p>
        </div>
        {hasRole('admin', 'engineering_user') && (
          <button onClick={() => navigate('/products/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Product
          </button>
        )}
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['active','archived','all'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  filter === f ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Product Name', 'Version', 'Sale Price', 'Cost Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="table-cell text-center py-12 text-gray-400">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-12">
                    <Package size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm">No products found</p>
                  </td>
                </tr>
              ) : filtered.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <Link to={`/products/${product.id}`} className="font-medium text-gray-900 hover:text-brand-500">
                      {product.name}
                    </Link>
                    {product.parent_id && (
                      <span className="ml-2 text-xs text-gray-400">(versioned)</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      v{product.version}
                    </span>
                  </td>
                  <td className="table-cell">{product.sale_price ? `$${parseFloat(product.sale_price).toFixed(2)}` : <span className="text-gray-300">—</span>}</td>
                  <td className="table-cell">{product.cost_price ? `$${parseFloat(product.cost_price).toFixed(2)}` : <span className="text-gray-300">—</span>}</td>
                  <td className="table-cell">
                    <span className={product.status === 'active' ? 'badge-active' : 'badge-archived'}>
                      {product.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${product.id}`}
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded transition-colors" title="View/Edit">
                        <Eye size={15} />
                      </Link>
                      {hasRole('admin') && product.status === 'active' && (
                        <button onClick={() => handleArchive(product.id, product.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Archive">
                          <Archive size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
