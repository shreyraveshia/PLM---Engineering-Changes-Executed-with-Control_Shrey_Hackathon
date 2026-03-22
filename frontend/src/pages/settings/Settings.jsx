import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  Plus, Trash2, Edit2, Save, X, RefreshCw,
  Settings as SettingsIcon, AlertTriangle, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [stages, setStages]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newStage, setNewStage] = useState({
    name: '', order_index: '', requires_approval: false, is_final: false, description: ''
  });
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stages');
      setStages(res.data);
    } catch { toast.error('Failed to load stages'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStages(); }, [loadStages]);

  const startEdit = (stage) => {
    setEditingId(stage.id);
    setEditForm({
      name: stage.name,
      requires_approval: stage.requires_approval,
      is_final: stage.is_final,
      description: stage.description || '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    if (!editForm.name?.trim()) { toast.error('Stage name is required'); return; }
    setSaving(true);
    try {
      await api.put(`/stages/${id}`, editForm);
      toast.success('Stage updated');
      setEditingId(null);
      loadStages();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stage');
    } finally { setSaving(false); }
  };

  const deleteStage = async (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"?\n\nThis will fail if any ECOs are currently in this stage.`)) return;
    try {
      await api.delete(`/stages/${stage.id}`);
      toast.success(`Stage "${stage.name}" deleted`);
      loadStages();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete stage');
    }
  };

  const addStage = async (e) => {
    e.preventDefault();
    if (!newStage.name.trim())        { toast.error('Stage name required'); return; }
    if (!newStage.order_index)        { toast.error('Order index required'); return; }
    setSaving(true);
    try {
      await api.post('/stages', {
        ...newStage,
        order_index: parseInt(newStage.order_index),
      });
      toast.success(`Stage "${newStage.name}" created`);
      setNewStage({ name:'', order_index:'', requires_approval:false, is_final:false, description:'' });
      setAdding(false);
      loadStages();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create stage');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
          <SettingsIcon size={18} className="text-gray-600"/>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure ECO stages and approval rules</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0"/>
        <p className="text-sm text-amber-700">
          <span className="font-medium">Changes affect all ECOs.</span>{' '}
          Modifying stages may impact ECOs currently in progress.
          The stage with <strong>is_final = true</strong> triggers ECO application and version creation.
        </p>
      </div>

      {/* ECO Stages */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">ECO Stages</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Stages define the approval pipeline. ECOs flow from lowest to highest order_index.
            </p>
          </div>
          <button onClick={() => setAdding(!adding)}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700
                       text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
            <Plus size={14}/> Add Stage
          </button>
        </div>

        {/* Add new stage form */}
        {adding && (
          <form onSubmit={addStage}
            className="px-5 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">New Stage</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input value={newStage.name}
                  onChange={e => setNewStage(p => ({...p, name: e.target.value}))}
                  placeholder="e.g. Legal Review"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Order Index <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" value={newStage.order_index}
                  onChange={e => setNewStage(p => ({...p, order_index: e.target.value}))}
                  placeholder="e.g. 4"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input value={newStage.description}
                onChange={e => setNewStage(p => ({...p, description: e.target.value}))}
                placeholder="Optional description..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"/>
            </div>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newStage.requires_approval}
                  onChange={e => setNewStage(p => ({...p, requires_approval: e.target.checked}))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                <div>
                  <p className="text-sm font-medium text-gray-700">Requires Approval</p>
                  <p className="text-xs text-gray-400">Shows "Approve" button instead of "Validate"</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newStage.is_final}
                  onChange={e => setNewStage(p => ({...p, is_final: e.target.checked}))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                <div>
                  <p className="text-sm font-medium text-gray-700">Is Final Stage</p>
                  <p className="text-xs text-gray-400">Triggers ECO application to master data</p>
                </div>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm
                           px-4 py-1.5 rounded-lg font-medium disabled:opacity-60">
                {saving ? <RefreshCw size={13} className="animate-spin"/> : <Save size={13}/>}
                {saving ? 'Creating...' : 'Create Stage'}
              </button>
              <button type="button" onClick={() => setAdding(false)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600
                           text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50">
                <X size={13}/> Cancel
              </button>
            </div>
          </form>
        )}

        {/* Stage pipeline preview */}
        {!loading && stages.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">Current pipeline:</p>
            <div className="flex items-center gap-1 flex-wrap">
              {stages.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border
                    ${s.is_final
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : s.requires_approval
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {i + 1}. {s.name}
                  </span>
                  {i < stages.length - 1 && (
                    <span className="text-gray-300 text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stages table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={18} className="animate-spin text-gray-400 mr-2"/>
            <span className="text-gray-400 text-sm">Loading stages...</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Order','Stage Name','Requires Approval','Is Final','Description','Actions'].map(h => (
                  <th key={h}
                    className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stages.map(stage => (
                <tr key={stage.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === stage.id ? (
                    /* Inline edit row */
                    <>
                      <td className="px-5 py-3 text-sm text-gray-500">{stage.order_index}</td>
                      <td className="px-5 py-3">
                        <input value={editForm.name}
                          onChange={e => setEditForm(p => ({...p, name: e.target.value}))}
                          className="border border-blue-300 rounded px-2 py-1 text-sm w-36
                                     focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </td>
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={editForm.requires_approval}
                          onChange={e => setEditForm(p => ({...p, requires_approval: e.target.checked}))}
                          className="w-4 h-4 rounded text-blue-600"/>
                      </td>
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={editForm.is_final}
                          onChange={e => setEditForm(p => ({...p, is_final: e.target.checked}))}
                          className="w-4 h-4 rounded text-blue-600"/>
                      </td>
                      <td className="px-5 py-3">
                        <input value={editForm.description}
                          onChange={e => setEditForm(p => ({...p, description: e.target.value}))}
                          placeholder="Description..."
                          className="border border-blue-300 rounded px-2 py-1 text-sm w-48
                                     focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveEdit(stage.id)} disabled={saving}
                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                            <Check size={13}/>
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
                            <X size={13}/>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* Normal row */
                    <>
                      <td className="px-5 py-3">
                        <span className="w-7 h-7 bg-gray-100 text-gray-600 rounded-full
                                         flex items-center justify-center text-xs font-bold">
                          {stage.order_index}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{stage.name}</td>
                      <td className="px-5 py-3">
                        {stage.requires_approval
                          ? <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Yes — Approve button</span>
                          : <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">No — Validate button</span>}
                      </td>
                      <td className="px-5 py-3">
                        {stage.is_final
                          ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✓ Final — applies ECO</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {stage.description || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(stage)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                                       rounded transition-colors" title="Edit">
                            <Edit2 size={13}/>
                          </button>
                          <button onClick={() => deleteStage(stage)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                                       rounded transition-colors" title="Delete">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How Stages Work</h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-700 mb-1">Order Index</p>
            <p>Defines the flow direction. ECOs move from order 1 → 2 → 3. Must be unique.</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="font-medium text-amber-700 mb-1">Requires Approval</p>
            <p>When ON: Approver/Admin must click "Approve". When OFF: Engineering can click "Validate".</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="font-medium text-green-700 mb-1">Is Final</p>
            <p>When ECO reaches this stage, changes are applied to master data and new version is created.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
