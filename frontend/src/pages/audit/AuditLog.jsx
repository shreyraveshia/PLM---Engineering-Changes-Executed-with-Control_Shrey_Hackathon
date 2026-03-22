import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { RefreshCw, Shield, Filter } from 'lucide-react';

const ACTION_ICONS = {
  product_created:      { label: 'Product Created',       color: 'bg-green-100 text-green-700' },
  product_updated:      { label: 'Product Updated',       color: 'bg-blue-100 text-blue-700' },
  product_archived:     { label: 'Product Archived',      color: 'bg-gray-100 text-gray-600' },
  product_archived_by_eco:   { label: 'Archived by ECO',  color: 'bg-orange-100 text-orange-700' },
  product_version_created:   { label: 'New Version',      color: 'bg-purple-100 text-purple-700' },
  bom_created:          { label: 'BoM Created',           color: 'bg-green-100 text-green-700' },
  bom_updated:          { label: 'BoM Updated',           color: 'bg-blue-100 text-blue-700' },
  bom_archived:         { label: 'BoM Archived',          color: 'bg-gray-100 text-gray-600' },
  bom_archived_by_eco:  { label: 'BoM Archived by ECO',   color: 'bg-orange-100 text-orange-700' },
  bom_version_created:  { label: 'BoM New Version',       color: 'bg-purple-100 text-purple-700' },
  eco_created:          { label: 'ECO Created',           color: 'bg-blue-100 text-blue-700' },
  eco_draft_saved:      { label: 'Draft Saved',           color: 'bg-sky-100 text-sky-700' },
  eco_approved:         { label: 'ECO Approved',          color: 'bg-green-100 text-green-700' },
  eco_validated:        { label: 'ECO Validated',         color: 'bg-teal-100 text-teal-700' },
  eco_stage_moved:      { label: 'Stage Advanced',        color: 'bg-amber-100 text-amber-700' },
  eco_applied:          { label: 'ECO Applied ✓',         color: 'bg-green-100 text-green-700' },
  eco_apply_failed:     { label: 'Apply Failed!',         color: 'bg-red-100 text-red-700' },
  stage_created:        { label: 'Stage Created',         color: 'bg-indigo-100 text-indigo-700' },
};

export default function AuditLog() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ record_type: '', limit: '100' });
  const [searchParams] = useSearchParams();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.record_type) params.set('record_type', filter.record_type);
      if (filter.limit)       params.set('limit', filter.limit);
      const recordId = searchParams.get('record_id');
      if (recordId) params.set('record_id', recordId);

      const res = await api.get(`/audit?${params.toString()}`);
      setLogs(res.data);
    } catch {
      // silently fail
    } finally { setLoading(false); }
  }, [filter, searchParams]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionStyle = (action) =>
    ACTION_ICONS[action] || { label: action, color: 'bg-gray-100 text-gray-600' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-gray-600"/>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Immutable record of all system actions
            </p>
          </div>
        </div>
        <button onClick={loadLogs}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={14}/>
          <span>Filter by:</span>
        </div>
        <select value={filter.record_type}
          onChange={e => setFilter(p => ({...p, record_type: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All record types</option>
          <option value="product">Products</option>
          <option value="bom">Bills of Materials</option>
          <option value="eco">ECOs</option>
          <option value="stage">Stages</option>
        </select>
        <select value={filter.limit}
          onChange={e => setFilter(p => ({...p, limit: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="50">Last 50</option>
          <option value="100">Last 100</option>
          <option value="200">Last 200</option>
        </select>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={18} className="animate-spin text-gray-400 mr-2"/>
            <span className="text-gray-400 text-sm">Loading audit log...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Shield size={28} className="mx-auto mb-3 opacity-40"/>
            <p className="text-sm">No audit log entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Time','Action','Record','Description','User','Old → New'].map(h => (
                  <th key={h}
                    className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => {
                const style = getActionStyle(log.action);
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.color}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.record_type && (
                        <span className="capitalize">{log.record_type}</span>
                      )}
                      {log.record_id && (
                        <span className="ml-1 font-mono text-gray-400">#{log.record_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                      {log.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.user_name || '—'}
                      {log.user_role && (
                        <span className="ml-1 text-gray-400 capitalize">
                          ({log.user_role.replace('_',' ')})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">
                      {log.old_value || log.new_value ? (
                        <div className="font-mono">
                          {log.old_value && (
                            <span className="text-red-500 line-through mr-1">
                              {log.old_value.length > 40
                                ? log.old_value.substring(0,40) + '...'
                                : log.old_value}
                            </span>
                          )}
                          {log.old_value && log.new_value && <span className="text-gray-300">→</span>}
                          {log.new_value && (
                            <span className="text-green-600 ml-1">
                              {log.new_value.length > 40
                                ? log.new_value.substring(0,40) + '...'
                                : log.new_value}
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && logs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {logs.length} entries · Audit log is immutable
          </div>
        )}
      </div>
    </div>
  );
}
