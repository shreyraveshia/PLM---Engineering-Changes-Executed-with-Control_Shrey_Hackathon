// DiffTable renders the proposed changes for an ECO.
// Green rows = added, Red rows = removed, Yellow rows = modified, Gray rows = unchanged.

const CHANGE_COLORS = {
  added:     'bg-green-50 border-l-2 border-green-400',
  removed:   'bg-red-50 border-l-2 border-red-400',
  modified:  'bg-amber-50 border-l-2 border-amber-400',
  unchanged: 'bg-white',
};

const CHANGE_LABELS = {
  added:     { text: 'Added',    cls: 'bg-green-100 text-green-700' },
  removed:   { text: 'Removed',  cls: 'bg-red-100 text-red-700' },
  modified:  { text: 'Modified', cls: 'bg-amber-100 text-amber-700' },
  unchanged: { text: 'Same',     cls: 'bg-gray-100 text-gray-500' },
};

function ComponentsDiff({ components }) {
  if (!components || components.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Component Changes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="table-header">Component</th>
            <th className="table-header">Old Qty</th>
            <th className="table-header">New Qty</th>
            <th className="table-header">Unit</th>
            <th className="table-header">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {components.map((c, i) => {
            const { text, cls } = CHANGE_LABELS[c.change_type] || CHANGE_LABELS.unchanged;
            return (
              <tr key={i} className={CHANGE_COLORS[c.change_type] || ''}>
                <td className="table-cell font-medium">{c.component_name}</td>
                <td className="table-cell text-gray-500">{c.old_quantity ?? '—'}</td>
                <td className="table-cell">{c.new_quantity ?? '—'}</td>
                <td className="table-cell text-gray-500">{c.unit || '—'}</td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OperationsDiff({ operations }) {
  if (!operations || operations.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Operation Changes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="table-header">Operation</th>
            <th className="table-header">Old Time</th>
            <th className="table-header">New Time</th>
            <th className="table-header">Work Center</th>
            <th className="table-header">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {operations.map((o, i) => {
            const { text, cls } = CHANGE_LABELS[o.change_type] || CHANGE_LABELS.unchanged;
            return (
              <tr key={i} className={CHANGE_COLORS[o.change_type] || ''}>
                <td className="table-cell font-medium">{o.name}</td>
                <td className="table-cell text-gray-500">{o.old_time_minutes != null ? `${o.old_time_minutes} min` : '—'}</td>
                <td className="table-cell">{o.new_time_minutes != null ? `${o.new_time_minutes} min` : '—'}</td>
                <td className="table-cell text-gray-500">{o.work_center || '—'}</td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductDiff({ productDraft, currentProduct }) {
  if (!productDraft) return null;
  const fields = [
    { label: 'Name', current: currentProduct?.name, proposed: productDraft.new_name },
    { label: 'Sale Price', current: currentProduct?.sale_price, proposed: productDraft.new_sale_price },
    { label: 'Cost Price', current: currentProduct?.cost_price, proposed: productDraft.new_cost_price },
    { label: 'Attachment', current: currentProduct?.attachment, proposed: productDraft.new_attachment },
    { label: 'Notes', current: currentProduct?.notes, proposed: productDraft.new_notes },
  ].filter(f => f.proposed);

  if (fields.length === 0) return <p className="text-sm text-gray-400">No product changes drafted yet.</p>;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product Field Changes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="table-header">Field</th>
            <th className="table-header">Current Value</th>
            <th className="table-header">Proposed Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {fields.map(({ label, current, proposed }) => (
            <tr key={label} className="bg-amber-50 border-l-2 border-amber-400">
              <td className="table-cell font-medium text-gray-700">{label}</td>
              <td className="table-cell text-gray-500 line-through">{current || '—'}</td>
              <td className="table-cell font-medium text-amber-800">{proposed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DiffTable({ diff }) {
  if (!diff) return <p className="text-sm text-gray-400">No diff data available.</p>;
  return (
    <div>
      <ComponentsDiff components={diff.components} />
      <OperationsDiff operations={diff.operations} />
      <ProductDiff productDraft={diff.draft_product} currentProduct={diff.current_product} />
    </div>
  );
}
