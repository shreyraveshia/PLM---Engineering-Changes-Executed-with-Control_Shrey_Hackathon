import { TrendingUp, TrendingDown, Minus, Plus, RefreshCw } from 'lucide-react';

const CHANGE_STYLES = {
  added:     { row: 'bg-green-50 border-l-4 border-l-green-400',  badge: 'bg-green-100 text-green-700', label: '+ Added',    icon: Plus },
  removed:   { row: 'bg-red-50 border-l-4 border-l-red-400',     badge: 'bg-red-100 text-red-700',     label: '- Removed',  icon: Minus },
  modified:  { row: 'bg-amber-50 border-l-4 border-l-amber-400', badge: 'bg-amber-100 text-amber-700', label: '~ Modified', icon: RefreshCw },
  unchanged: { row: '',                                            badge: 'bg-gray-100 text-gray-400',   label: 'Unchanged',  icon: Minus },
};

function ChangeBadge({ type }) {
  const style = CHANGE_STYLES[type] || CHANGE_STYLES.unchanged;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${style.badge}`}>
      <Icon size={10}/>
      {style.label}
    </span>
  );
}

function QtyCell({ value, isNew, changeType }) {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span className={`font-mono text-sm ${
      isNew && changeType !== 'unchanged'
        ? changeType === 'added' ? 'text-green-700 font-semibold'
          : changeType === 'removed' ? 'text-red-600 line-through'
          : 'text-amber-700 font-semibold'
        : 'text-gray-500'
    }`}>
      {value}
    </span>
  );
}

export default function DiffTable({ diff }) {
  if (!diff) return (
    <div className="text-center py-8 text-gray-400 text-sm">No diff data available</div>
  );

  if (diff.type === 'bom') {
    const hasComponents = diff.components && diff.components.length > 0;
    const hasOperations = diff.operations && diff.operations.length > 0;

    const changedCount = (diff.components || []).filter(c => c.change_type !== 'unchanged').length +
                         (diff.operations || []).filter(o => o.change_type !== 'unchanged').length;

    return (
      <div className="space-y-6">
        {/* Summary bar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">{changedCount} change{changedCount !== 1 ? 's' : ''} proposed</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {['added','modified','removed'].map(type => {
              const cnt = (diff.components||[]).filter(c=>c.change_type===type).length +
                          (diff.operations||[]).filter(o=>o.change_type===type).length;
              if (cnt === 0) return null;
              const style = CHANGE_STYLES[type];
              return (
                <span key={type} className={`px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                  {cnt} {type}
                </span>
              );
            })}
          </div>
        </div>

        {/* Components diff */}
        {hasComponents && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"/>
              <h3 className="text-sm font-semibold text-gray-700">Components</h3>
              <span className="text-xs text-gray-400">({diff.components.length} total)</span>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Component</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Unit</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Old Qty</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">New Qty</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.components.map((comp, i) => {
                    const style = CHANGE_STYLES[comp.change_type] || CHANGE_STYLES.unchanged;
                    return (
                      <tr key={i} className={`border-b border-gray-100 last:border-0 ${style.row}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{comp.component_name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{comp.unit || 'pcs'}</td>
                        <td className="px-4 py-3 text-center">
                          <QtyCell value={comp.old_quantity} isNew={false} changeType={comp.change_type}/>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <QtyCell value={comp.new_quantity} isNew={true} changeType={comp.change_type}/>
                        </td>
                        <td className="px-4 py-3">
                          <ChangeBadge type={comp.change_type}/>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Operations diff */}
        {hasOperations && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500"/>
              <h3 className="text-sm font-semibold text-gray-700">Operations</h3>
              <span className="text-xs text-gray-400">({diff.operations.length} total)</span>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Operation</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Center</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Old Time</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">New Time</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.operations.map((op, i) => {
                    const style = CHANGE_STYLES[op.change_type] || CHANGE_STYLES.unchanged;
                    return (
                      <tr key={i} className={`border-b border-gray-100 last:border-0 ${style.row}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{op.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{op.work_center || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {op.old_time_minutes !== null ? `${op.old_time_minutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {op.new_time_minutes !== null
                            ? <span className={`font-mono ${op.change_type!=='unchanged'?'text-amber-700 font-semibold':'text-gray-500'}`}>
                                {op.new_time_minutes} min
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <ChangeBadge type={op.change_type}/>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (diff.type === 'product') {
    const fields = [
      { label: 'Product Name', old: diff.current?.name, new: diff.draft?.new_name },
      { label: 'Sale Price', old: diff.current?.sale_price ? `$${parseFloat(diff.current.sale_price).toFixed(2)}` : '—',
        new: diff.draft?.new_sale_price ? `$${parseFloat(diff.draft.new_sale_price).toFixed(2)}` : '—' },
      { label: 'Cost Price', old: diff.current?.cost_price ? `$${parseFloat(diff.current.cost_price).toFixed(2)}` : '—',
        new: diff.draft?.new_cost_price ? `$${parseFloat(diff.draft.new_cost_price).toFixed(2)}` : '—' },
      { label: 'Attachment', old: diff.current?.attachment || '—', new: diff.draft?.new_attachment || '—' },
    ];

    const changedFields = fields.filter(f => f.new && f.new !== '—' && f.old !== f.new);

    return (
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <span className="font-medium text-gray-700">{changedFields.length} field{changedFields.length!==1?'s':''} changed</span>
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Field</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposed Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Change</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const changed = f.new && f.new !== '—' && f.old !== f.new;
                return (
                  <tr key={i} className={`border-b border-gray-100 last:border-0
                    ${changed ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-700">{f.label}</td>
                    <td className="px-4 py-3 text-gray-500">{f.old}</td>
                    <td className={`px-4 py-3 font-medium ${changed ? 'text-amber-700' : 'text-gray-400'}`}>
                      {f.new || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {changed ? <ChangeBadge type="modified"/> : <ChangeBadge type="unchanged"/>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <div className="text-center py-8 text-gray-400 text-sm">Unknown diff type</div>;
}
