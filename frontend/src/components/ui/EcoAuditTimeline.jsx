import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Shield, RefreshCw, CheckCircle, ArrowRight, GitBranch, Plus } from 'lucide-react';

const ICON_MAP = {
  eco_created:       <Plus size={13}/>,
  eco_stage_moved:   <ArrowRight size={13}/>,
  eco_approved:      <CheckCircle size={13}/>,
  eco_validated:     <CheckCircle size={13}/>,
  eco_applied:       <GitBranch size={13}/>,
  eco_draft_saved:   <Shield size={13}/>,
};

const COLOR_MAP = {
  eco_created:     'bg-blue-100 text-blue-600',
  eco_stage_moved: 'bg-amber-100 text-amber-600',
  eco_approved:    'bg-green-100 text-green-600',
  eco_validated:   'bg-teal-100 text-teal-600',
  eco_applied:     'bg-green-100 text-green-700',
  eco_draft_saved: 'bg-gray-100 text-gray-500',
};

export default function EcoAuditTimeline({ ecoId }) {
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecoId) return;
    api.get(`/audit?record_type=eco&record_id=${ecoId}&limit=20`)
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ecoId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
      <RefreshCw size={13} className="animate-spin"/> Loading history...
    </div>
  );

  if (!logs.length) return (
    <p className="text-sm text-gray-400 py-4">No audit history yet</p>
  );

  return (
    <div className="space-y-3">
      {logs.map((log, i) => {
        const icon  = ICON_MAP[log.action]  || <Shield size={13}/>;
        const color = COLOR_MAP[log.action] || 'bg-gray-100 text-gray-500';
        return (
          <div key={log.id} className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center
                            flex-shrink-0 mt-0.5 ${color}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">{log.description || log.action}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {log.user_name || 'System'} ·{' '}
                {new Date(log.created_at).toLocaleString(undefined, {
                  month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
