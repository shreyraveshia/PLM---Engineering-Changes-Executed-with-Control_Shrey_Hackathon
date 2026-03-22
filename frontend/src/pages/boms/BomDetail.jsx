import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

const emptyComponent = () => ({ component_name: '', quantity: '', unit: 'pcs' });
const emptyOperation = () => ({ name: '', time_minutes: '', work_center: '' });

export default function BomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isNew = !id || id === 'new';

  const [bom, setBom] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', notes: '' });
  const [components, setComponents] = useState([emptyComponent()]);
  const [operations, setOperations] = useState([emptyOperation()]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/products?status=active').then(res => setProducts(res.data));
    if (!isNew && id) {
      api.get(`/boms/${id}`).then(res => {
        const b = res.data;
        setBom(b);
        setForm({ product_id: b.product_id, notes: b.notes || '' });
        setComponents(b.components?.length > 0 ? b.components : [emptyComponent()]);
        setOperations(b.operations?.length > 0 ? b.operations : [emptyOperation()]);
      }).catch(() => toast.error('Failed to load BoM'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const updateComponent = (i, field, val) => {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };
  const updateOperation = (i, field, val) => {
    setOperations(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.product_id) { toast.error('Please select a product'); return; }
    const validComps = components.filter(c => c.component_name.trim() && c.quantity);
    if (validComps.length === 0) { toast.error('Add at least one component'); return; }

    setSaving(true);
    try {
      const payload = {
        product_id: parseInt(form.product_id),
        notes: form.notes,
        components: validComps,
        operations: operations.filter(o => o.name.trim() && o.time_minutes),
      };
      if (isNew) {
        const res = await api.post('/boms', payload);
        toast.success('BoM created successfully!');
        navigate(`/boms/${res.data.id}`);
      } else {
        await api.put(`/boms/${id}`, payload);
        toast.success('BoM updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save BoM');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = bom?.status === 'archived' || !hasRole('admin', 'engineering_user');
  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/boms" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">{isNew ? 'New Bill of Materials' : `BoM v${bom?.version} — ${bom?.product_name}`}</h1>
            <p className="page-subtitle">{isNew ? 'Define components and operations' : `Status: ${bom?.status}`}</p>
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={15} /> {saving ? 'Saving...' : 'Save BoM'}
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">General</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product <span className="text-red-500">*</span>
              </label>
              <select value={form.product_id} onChange={e => setForm(p => ({...p, product_id: e.target.value}))}
                disabled={isReadOnly || !isNew} className="input-field disabled:bg-gray-50">
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                placeholder="Optional notes..." disabled={isReadOnly}
                className="input-field disabled:bg-gray-50" />
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Components</h2>
            {!isReadOnly && (
              <button type="button" onClick={() => setComponents(p => [...p, emptyComponent()])}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                <Plus size={13} /> Add Component
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-6 text-xs font-medium text-gray-500">Component Name</span>
              <span className="col-span-3 text-xs font-medium text-gray-500">Quantity</span>
              <span className="col-span-2 text-xs font-medium text-gray-500">Unit</span>
              <span className="col-span-1"></span>
            </div>
            {components.map((comp, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={comp.component_name} onChange={e => updateComponent(i, 'component_name', e.target.value)}
                  placeholder="e.g. Wooden Legs" disabled={isReadOnly}
                  className="input-field col-span-6 disabled:bg-gray-50" />
                <input type="number" value={comp.quantity} onChange={e => updateComponent(i, 'quantity', e.target.value)}
                  placeholder="0" min="0" step="0.001" disabled={isReadOnly}
                  className="input-field col-span-3 disabled:bg-gray-50" />
                <input value={comp.unit} onChange={e => updateComponent(i, 'unit', e.target.value)}
                  placeholder="pcs" disabled={isReadOnly}
                  className="input-field col-span-2 disabled:bg-gray-50" />
                {!isReadOnly && components.length > 1 && (
                  <button type="button" onClick={() => setComponents(p => p.filter((_, idx) => idx !== i))}
                    className="col-span-1 p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Operations */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Operations</h2>
            {!isReadOnly && (
              <button type="button" onClick={() => setOperations(p => [...p, emptyOperation()])}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                <Plus size={13} /> Add Operation
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-5 text-xs font-medium text-gray-500">Operation Name</span>
              <span className="col-span-3 text-xs font-medium text-gray-500">Time (min)</span>
              <span className="col-span-3 text-xs font-medium text-gray-500">Work Center</span>
              <span className="col-span-1"></span>
            </div>
            {operations.map((op, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={op.name} onChange={e => updateOperation(i, 'name', e.target.value)}
                  placeholder="e.g. Assembly" disabled={isReadOnly}
                  className="input-field col-span-5 disabled:bg-gray-50" />
                <input type="number" value={op.time_minutes} onChange={e => updateOperation(i, 'time_minutes', e.target.value)}
                  placeholder="0" min="0" disabled={isReadOnly}
                  className="input-field col-span-3 disabled:bg-gray-50" />
                <input value={op.work_center} onChange={e => updateOperation(i, 'work_center', e.target.value)}
                  placeholder="Assembly Line" disabled={isReadOnly}
                  className="input-field col-span-3 disabled:bg-gray-50" />
                {!isReadOnly && operations.length > 1 && (
                  <button type="button" onClick={() => setOperations(p => p.filter((_, idx) => idx !== i))}
                    className="col-span-1 p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
