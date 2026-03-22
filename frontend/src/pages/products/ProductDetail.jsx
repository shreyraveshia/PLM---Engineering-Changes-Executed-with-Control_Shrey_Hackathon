import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, History } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isNew = id === undefined || id === 'new';

  const [form, setForm] = useState({
    name: '', sale_price: '', cost_price: '', attachment: '', notes: ''
  });
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/history`),
      ]).then(([productRes, historyRes]) => {
        const p = productRes.data;
        setProduct(p);
        setHistory(historyRes.data);
        setForm({
          name: p.name || '',
          sale_price: p.sale_price || '',
          cost_price: p.cost_price || '',
          attachment: p.attachment || '',
          notes: p.notes || '',
        });
      }).catch(() => toast.error('Failed to load product'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/products', form);
        toast.success('Product created successfully!');
        navigate(`/products/${res.data.id}`);
      } else {
        await api.put(`/products/${id}`, form);
        toast.success('Product updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = product?.status === 'archived' || !hasRole('admin', 'engineering_user');

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">{isNew ? 'New Product' : product?.name}</h1>
            <p className="page-subtitle">
              {isNew ? 'Create a new product' : `Version ${product?.version} · ${product?.status}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && history.length > 1 && (
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2">
              <History size={15} /> History ({history.length})
            </button>
          )}
          {!isReadOnly && (
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={15} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="card p-6">
            {isReadOnly && product?.status === 'archived' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                This product is archived and read-only. Create an ECO to propose changes.
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Wooden Table" required disabled={isReadOnly}
                  className="input-field disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sale Price ($)</label>
                  <input
                    type="number" name="sale_price" value={form.sale_price} onChange={handleChange}
                    placeholder="0.00" step="0.01" min="0" disabled={isReadOnly}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Price ($)</label>
                  <input
                    type="number" name="cost_price" value={form.cost_price} onChange={handleChange}
                    placeholder="0.00" step="0.01" min="0" disabled={isReadOnly}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attachment URL</label>
                <input
                  type="text" name="attachment" value={form.attachment} onChange={handleChange}
                  placeholder="https://..." disabled={isReadOnly}
                  className="input-field disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  name="notes" value={form.notes} onChange={handleChange}
                  rows={3} placeholder="Product description or notes..." disabled={isReadOnly}
                  className="input-field resize-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {!isNew && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Version</dt>
                  <dd className="text-xs font-medium text-gray-900">v{product?.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Status</dt>
                  <dd>
                    <span className={product?.status === 'active' ? 'badge-active' : 'badge-archived'}>
                      {product?.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Created by</dt>
                  <dd className="text-xs font-medium text-gray-900">{product?.created_by_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-gray-500">Created</dt>
                  <dd className="text-xs text-gray-900">{product?.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}</dd>
                </div>
              </dl>
            </div>
          )}

          {showHistory && history.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Version History</h3>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className={`p-2.5 rounded-lg border text-xs ${
                    h.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">v{h.version}</span>
                      <span className={h.status === 'active' ? 'text-green-600' : 'text-gray-400'}>{h.status}</span>
                    </div>
                    <p className="text-gray-500 mt-0.5">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
