import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import StagePipeline from '../../components/ui/StagePipeline';
import DiffTable from '../../components/ui/DiffTable';
import { ArrowLeft, Save, CheckCircle2, PlayCircle, Eye, Plus, Trash2 } from 'lucide-react';

const emptyDraftComp = () => ({ component_name: '', old_quantity: null, new_quantity: '', unit: 'pcs', change_type: 'added' });
const emptyDraftOp = () => ({ name: '', old_time_minutes: null, new_time_minutes: '', work_center: '', change_type: 'added' });

export default function EcoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, isApprover, user } = useAuth();
  const isNew = !id || id === 'new';

  const [eco, setEco] = useState(null);
  const [products, setProducts] = useState([]);
  const [boms, setBoms] = useState([]);
  const [stages, setStages] = useState([]);
  const [diff, setDiff] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  const [form, setForm] = useState({
    title: '', eco_type: 'bom', product_id: '', bom_id: '', effective_date: '', version_update: true, description: ''
  });

  const [draftComponents, setDraftComponents] = useState([]);
  const [draftOperations, setDraftOperations] = useState([]);
  const [draftProduct, setDraftProduct] = useState({ new_name: '', new_sale_price: '', new_cost_price: '', new_attachment: '', new_notes: '' });

  const loadEco = async () => {
    if (!id || id === 'new') return;
    try {
      const res = await api.get(`/ecos/${id}`);
      const e = res.data;
      setEco(e);
      setStages(e.all_stages || []);
      setForm({
        title: e.title,
        eco_type: e.eco_type,
        product_id: e.product_id,
        bom_id: e.bom_id || '',
        effective_date: e.effective_date ? e.effective_date.split('T')[0] : '',
        version_update: e.version_update,
        description: e.description || '',
      });
      if (e.draft_components?.length > 0) setDraftComponents(e.draft_components);
      if (e.draft_operations?.length > 0) setDraftOperations(e.draft_operations);
      if (e.draft_product) setDraftProduct({
        new_name: e.draft_product.new_name || '',
        new_sale_price: e.draft_product.new_sale_price || '',
        new_cost_price: e.draft_product.new_cost_price || '',
        new_attachment: e.draft_product.new_attachment || '',
        new_notes: e.draft_product.new_notes || '',
      });
    } catch (err) {
      toast.error('Failed to load ECO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/products?status=active').then(r => setProducts(r.data));
    api.get('/stages').then(r => setStages(r.data));
    if (!isNew) loadEco();
  }, [id]);

  useEffect(() => {
    if (form.product_id) {
      api.get(`/boms?product_id=${form.product_id}&status=active`).then(r => setBoms(r.data));
    }
  }, [form.product_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.product_id || !form.eco_type) {
      toast.error('Title, product, and type are required');
      return;
    }
    if (form.eco_type === 'bom' && !form.bom_id) {
      toast.error('Please select a BoM for BoM type ECOs');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/ecos', {
        title: form.title, eco_type: form.eco_type,
        product_id: parseInt(form.product_id),
        bom_id: form.bom_id ? parseInt(form.bom_id) : null,
        effective_date: form.effective_date || null,
        version_update: form.version_update,
        description: form.description,
      });
      toast.success('ECO created!');
      navigate(`/ecos/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ECO');
    } finally { setSaving(false); }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      if (eco.eco_type === 'bom') {
        await api.put(`/ecos/${id}/draft-bom`, {
          components: draftComponents,
          operations: draftOperations,
        });
        toast.success('Draft changes saved');
      } else {
        await api.put(`/ecos/${id}/draft-product`, draftProduct);
        toast.success('Draft product changes saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save draft');
    } finally { setSaving(false); }
  };

  const loadDiff = async () => {
    try {
      const res = await api.get(`/ecos/${id}/diff`);
      setDiff(res.data);
      setShowDiff(true);
    } catch (err) {
      toast.error('Failed to load diff');
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this ECO? If this is the final stage, changes will be applied immediately.')) return;
    setApproving(true);
    try {
      const res = await api.post(`/ecos/${id}/approve`, { notes: '' });
      toast.success(res.data.message);
      loadEco();
      setShowDiff(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally { setApproving(false); }
  };

  const handleValidate = async () => {
    if (!window.confirm('Validate and advance this ECO to the next stage?')) return;
    setApproving(true);
    try {
      const res = await api.post(`/ecos/${id}/validate`);
      toast.success(res.data.message);
      loadEco();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Validation failed');
    } finally { setApproving(false); }
  };

  const updateDraftComp = (i, field, val) => {
    setDraftComponents(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };
  const updateDraftOp = (i, field, val) => {
    setDraftOperations(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading ECO...</div>;

  const isReadOnly = eco?.status === 'applied' || eco?.status === 'cancelled';
  const canEdit = hasRole('admin','engineering_user') && !isReadOnly;
  const canApprove = (hasRole('admin','approver')) && eco?.requires_approval && eco?.status === 'open';
  const canValidate = hasRole('admin','engineering_user') && !eco?.requires_approval && eco?.status === 'open';

  if (isNew) {
    return (
      <div>
        <div className="page-header flex items-center gap-3">
          <Link to="/ecos" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18}/></Link>
          <div>
            <h1 className="page-title">New Engineering Change Order</h1>
            <p className="page-subtitle">Define the change you want to propose</p>
          </div>
        </div>
        <div className="card p-6 max-w-2xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ECO Title <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                placeholder="e.g. Increase screw count for structural integrity" required className="input-field"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ECO Type <span className="text-red-500">*</span></label>
                <select value={form.eco_type} onChange={e => setForm(p=>({...p,eco_type:e.target.value,bom_id:''}))} className="input-field">
                  <option value="bom">BoM Change</option>
                  <option value="product">Product Change</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product <span className="text-red-500">*</span></label>
                <select value={form.product_id} onChange={e => setForm(p=>({...p,product_id:e.target.value}))} className="input-field">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>)}
                </select>
              </div>
            </div>
            {form.eco_type === 'bom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bill of Materials <span className="text-red-500">*</span></label>
                <select value={form.bom_id} onChange={e => setForm(p=>({...p,bom_id:e.target.value}))} className="input-field">
                  <option value="">Select BoM...</option>
                  {boms.map(b => <option key={b.id} value={b.id}>BoM v{b.version} — {b.product_name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Effective Date</label>
                <input type="date" value={form.effective_date} onChange={e => setForm(p=>({...p,effective_date:e.target.value}))} className="input-field"/>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.version_update}
                    onChange={e => setForm(p=>({...p,version_update:e.target.checked}))}
                    className="w-4 h-4 text-brand-500 rounded border-gray-300"/>
                  <span className="text-sm font-medium text-gray-700">Create new version on approval</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                rows={3} placeholder="Describe the reason for this change..." className="input-field resize-none"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Plus size={15}/> {saving ? 'Creating...' : 'Create ECO'}
              </button>
              <Link to="/ecos" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/ecos" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18}/></Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{eco?.title}</h1>
              <span className={eco?.eco_type === 'product' ? 'badge-product' : 'badge-bom'}>
                {eco?.eco_type === 'product' ? 'Product' : 'BoM'}
              </span>
              <span className={eco?.status === 'applied' ? 'badge-applied' : eco?.status === 'open' ? 'badge-open' : 'badge-archived'}>
                {eco?.status}
              </span>
            </div>
            <p className="page-subtitle mt-1">Product: {eco?.product_name} (v{eco?.product_version})</p>
          </div>
        </div>
        <div className="card px-5 py-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <StagePipeline stages={eco?.all_stages || []} currentStageId={eco?.stage_id} ecoStatus={eco?.status}/>
            <div className="flex items-center gap-2">
              <button onClick={loadDiff} className="btn-secondary flex items-center gap-2 text-xs">
                <Eye size={14}/> View Changes
              </button>
              {canEdit && (
                <button onClick={saveDraft} disabled={saving} className="btn-secondary flex items-center gap-2 text-xs">
                  <Save size={14}/> {saving ? 'Saving...' : 'Save Draft'}
                </button>
              )}
              {canValidate && (
                <button onClick={handleValidate} disabled={approving} className="btn-primary flex items-center gap-2 text-xs">
                  <PlayCircle size={14}/> {approving ? 'Processing...' : 'Validate'}
                </button>
              )}
              {canApprove && (
                <button onClick={handleApprove} disabled={approving}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  <CheckCircle2 size={14}/> {approving ? 'Approving...' : 'Approve'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {eco?.status === 'applied'
            ? 'This ECO has been applied. A new version was created and the old version was archived.'
            : 'This ECO is cancelled.'}
        </div>
      )}

      {showDiff && diff && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Proposed Changes</h2>
            <button onClick={() => setShowDiff(false)} className="text-xs text-gray-400 hover:text-gray-600">Hide</button>
          </div>
          <DiffTable diff={diff}/>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {eco?.eco_type === 'bom' && (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Draft Component Changes</h2>
                  {canEdit && (
                    <button type="button" onClick={() => setDraftComponents(p => [...p, emptyDraftComp()])}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                      <Plus size={13}/> Add Row
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-1">
                    {['Component','Old Qty','New Qty','Unit','Change Type',''].map((h,i) => (
                      <span key={i} className={`text-xs font-medium text-gray-500 ${i===0?'col-span-4':i===4?'col-span-2':'col-span-2'}`}>{h}</span>
                    ))}
                  </div>
                  {draftComponents.map((comp, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={comp.component_name} onChange={e => updateDraftComp(i,'component_name',e.target.value)}
                        placeholder="Component name" disabled={isReadOnly}
                        className="input-field col-span-4 disabled:bg-gray-50 text-xs"/>
                      <input type="number" value={comp.old_quantity ?? ''} onChange={e => updateDraftComp(i,'old_quantity',e.target.value||null)}
                        placeholder="—" disabled={isReadOnly}
                        className="input-field col-span-2 disabled:bg-gray-50 text-xs"/>
                      <input type="number" value={comp.new_quantity ?? ''} onChange={e => updateDraftComp(i,'new_quantity',e.target.value)}
                        placeholder="New qty" disabled={isReadOnly}
                        className="input-field col-span-2 disabled:bg-gray-50 text-xs"/>
                      <input value={comp.unit} onChange={e => updateDraftComp(i,'unit',e.target.value)}
                        placeholder="pcs" disabled={isReadOnly}
                        className="input-field col-span-1 disabled:bg-gray-50 text-xs"/>
                      <select value={comp.change_type} onChange={e => updateDraftComp(i,'change_type',e.target.value)}
                        disabled={isReadOnly} className="input-field col-span-2 disabled:bg-gray-50 text-xs">
                        <option value="added">Added</option>
                        <option value="modified">Modified</option>
                        <option value="removed">Removed</option>
                        <option value="unchanged">Unchanged</option>
                      </select>
                      {canEdit && draftComponents.length > 1 && (
                        <button type="button" onClick={() => setDraftComponents(p => p.filter((_,idx)=>idx!==i))}
                          className="col-span-1 p-1.5 text-gray-300 hover:text-red-500 rounded">
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Draft Operation Changes</h2>
                  {canEdit && (
                    <button type="button" onClick={() => setDraftOperations(p => [...p, emptyDraftOp()])}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
                      <Plus size={13}/> Add Row
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {draftOperations.map((op, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={op.name} onChange={e => updateDraftOp(i,'name',e.target.value)}
                        placeholder="Operation name" disabled={isReadOnly}
                        className="input-field col-span-4 disabled:bg-gray-50 text-xs"/>
                      <input type="number" value={op.old_time_minutes ?? ''} onChange={e => updateDraftOp(i,'old_time_minutes',e.target.value||null)}
                        placeholder="Old min" disabled={isReadOnly}
                        className="input-field col-span-2 disabled:bg-gray-50 text-xs"/>
                      <input type="number" value={op.new_time_minutes ?? ''} onChange={e => updateDraftOp(i,'new_time_minutes',e.target.value)}
                        placeholder="New min" disabled={isReadOnly}
                        className="input-field col-span-2 disabled:bg-gray-50 text-xs"/>
                      <input value={op.work_center} onChange={e => updateDraftOp(i,'work_center',e.target.value)}
                        placeholder="Work center" disabled={isReadOnly}
                        className="input-field col-span-3 disabled:bg-gray-50 text-xs"/>
                      <select value={op.change_type} onChange={e => updateDraftOp(i,'change_type',e.target.value)}
                        disabled={isReadOnly} className="input-field col-span-1 disabled:bg-gray-50 text-xs">
                        <option value="added">+</option>
                        <option value="modified">~</option>
                        <option value="removed">-</option>
                        <option value="unchanged">=</option>
                      </select>
                      {canEdit && draftOperations.length > 1 && (
                        <button type="button" onClick={() => setDraftOperations(p => p.filter((_,idx)=>idx!==i))}
                          className="col-span-1 p-1.5 text-gray-300 hover:text-red-500 rounded">
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {eco?.eco_type === 'product' && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Proposed Product Changes</h2>
              <div className="space-y-4">
                {[
                  {label:'New Product Name',field:'new_name',type:'text',placeholder:eco?.product_name},
                  {label:'New Sale Price ($)',field:'new_sale_price',type:'number',placeholder:'0.00'},
                  {label:'New Cost Price ($)',field:'new_cost_price',type:'number',placeholder:'0.00'},
                  {label:'New Attachment URL',field:'new_attachment',type:'text',placeholder:'https://...'},
                ].map(({label,field,type,placeholder}) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input type={type} value={draftProduct[field]} onChange={e => setDraftProduct(p=>({...p,[field]:e.target.value}))}
                      placeholder={placeholder} disabled={isReadOnly}
                      className="input-field disabled:bg-gray-50"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">ECO Details</h3>
            <dl className="space-y-2.5">
              {[
                {label:'ECO Type', value: eco?.eco_type === 'product' ? 'Product Change' : 'BoM Change'},
                {label:'Product', value: `${eco?.product_name} v${eco?.product_version}`},
                {label:'BoM', value: eco?.bom_version ? `v${eco?.bom_version}` : '—'},
                {label:'Effective Date', value: eco?.effective_date ? new Date(eco.effective_date).toLocaleDateString() : '—'},
                {label:'New Version', value: eco?.version_update ? 'Yes' : 'No'},
                {label:'Created by', value: eco?.created_by_name},
                {label:'Created', value: eco?.created_at ? new Date(eco.created_at).toLocaleDateString() : '—'},
              ].map(({label,value}) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
                  <dd className="text-xs font-medium text-gray-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {eco?.approvals?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval History</h3>
              <div className="space-y-2">
                {eco.approvals.map(a => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-medium text-gray-700">{a.approver_name}</p>
                      <p className="text-gray-400">{a.stage_name} · {new Date(a.created_at).toLocaleDateString()}</p>
                      {a.notes && <p className="text-gray-500 mt-0.5">{a.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eco?.description && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{eco.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
