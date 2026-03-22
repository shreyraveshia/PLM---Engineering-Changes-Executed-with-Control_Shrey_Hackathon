import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import DiffTable from '../../components/ui/DiffTable';
import { exportEcoReportPDF } from '../../utils/exportPDF';
import { exportCSV } from '../../utils/exportCSV';
import {
  BarChart3, RefreshCw, Download, Eye, FileText,
  X, Package, FileStack, Archive, Grid3x3
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'ecos',            label: 'ECO Report',        icon: FileText },
  { key: 'product-history', label: 'Product History',   icon: Package },
  { key: 'bom-history',     label: 'BoM History',       icon: FileStack },
  { key: 'archived',        label: 'Archived Products', icon: Archive },
  { key: 'matrix',          label: 'Active Matrix',     icon: Grid3x3 },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('ecos');
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [diffModal, setDiffModal] = useState(null); // { ecoId, ecoTitle }
  const [diff, setDiff]           = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const ENDPOINTS = {
    'ecos':            '/reports/ecos',
    'product-history': '/reports/product-history',
    'bom-history':     '/reports/bom-history',
    'archived':        '/reports/archived-products',
    'matrix':          '/reports/active-matrix',
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setData([]);
    try {
      const res = await api.get(ENDPOINTS[activeTab]);
      setData(res.data);
    } catch {
      toast.error('Failed to load report');
    } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDiff = async (eco) => {
    setDiffModal({ ecoId: eco.id, ecoTitle: eco.title });
    setDiffLoading(true);
    setDiff(null);
    try {
      const res = await api.get(`/ecos/${eco.id}/diff`);
      setDiff(res.data);
    } catch {
      toast.error('Failed to load diff');
    } finally { setDiffLoading(false); }
  };

  const handleExportPDF = () => {
    if (activeTab !== 'ecos') { toast.error('PDF export available for ECO Report only'); return; }
    try { exportEcoReportPDF(data); toast.success('PDF downloaded!'); }
    catch { toast.error('PDF export failed'); }
  };

  const handleExportCSV = () => {
    const filename = `plm-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    try { exportCSV(data, filename); toast.success('CSV downloaded!'); }
    catch { toast.error('CSV export failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            <BarChart3 size={18} className="text-gray-600"/>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Traceability and change history across all PLM objects
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16}/>
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600
                       hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Download size={14}/> CSV
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700
                       text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <FileText size={14}/> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                        transition-colors whitespace-nowrap
              ${activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14}/>
            {label}
          </button>
        ))}
      </div>

      {/* Report table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={18} className="animate-spin text-gray-400 mr-2"/>
            <span className="text-gray-400 text-sm">Loading report...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BarChart3 size={28} className="mx-auto mb-3 opacity-40"/>
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          <>
            {/* ECO REPORT TAB */}
            {activeTab === 'ecos' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['ECO Title','Type','Product','Stage','Status','Changes','Date'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/ecos/${row.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${row.eco_type === 'bom'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-blue-50 text-blue-700'}`}>
                          {row.eco_type === 'bom' ? 'BoM' : 'Product'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.product_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {row.stage_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${row.status === 'applied' ? 'bg-green-50 text-green-700' :
                            row.status === 'open'    ? 'bg-blue-50 text-blue-600' :
                            'bg-gray-50 text-gray-500'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDiff(row)}
                          className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600
                                     border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100
                                     font-medium transition-colors">
                          <Eye size={12}/>
                          Changes
                          {row.changes_count > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full
                                             w-4 h-4 flex items-center justify-center leading-none">
                              {row.changes_count}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* PRODUCT HISTORY TAB */}
            {activeTab === 'product-history' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Product Name','Version','Status','Sale Price','Cost Price','Created'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/products/${row.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {row.name}
                        </Link>
                        {row.parent_id && <span className="ml-2 text-xs text-gray-400">(from v{row.version - 1})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                          v{row.version}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border
                          ${row.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.sale_price ? `$${row.sale_price}` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.cost_price ? `$${row.cost_price}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* BOM HISTORY TAB */}
            {activeTab === 'bom-history' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Product','BoM Version','Status','Components','Operations','Created'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/boms/${row.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {row.product_name}
                        </Link>
                        <p className="text-xs text-gray-400">Product v{row.product_version}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-100">
                          BoM v{row.version}
                        </span>
                        {row.parent_id && <span className="ml-1 text-xs text-gray-400">(derived)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border
                          ${row.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.component_count} components</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.operation_count} operations</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ARCHIVED PRODUCTS TAB */}
            {activeTab === 'archived' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Product Name','Version','Sale Price','Cost Price','Archived On'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/products/${row.id}`} className="text-sm font-medium text-gray-500 hover:text-blue-600">
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          v{row.version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{row.sale_price ? `$${row.sale_price}` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{row.cost_price ? `$${row.cost_price}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ACTIVE MATRIX TAB */}
            {activeTab === 'matrix' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Product','Version','Sale Price','Cost Price','Active BoM','Components'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(row => (
                    <tr key={row.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/products/${row.product_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {row.product_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
                          v{row.product_version} active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.sale_price ? `$${row.sale_price}` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.cost_price ? `$${row.cost_price}` : '—'}</td>
                      <td className="px-4 py-3">
                        {row.bom_id
                          ? <Link to={`/boms/${row.bom_id}`}
                              className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-100 hover:bg-purple-100">
                              BoM v{row.bom_version}
                            </Link>
                          : <span className="text-xs text-gray-400">No BoM</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.component_count > 0 ? `${row.component_count} components` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              {data.length} records
            </div>
          </>
        )}
      </div>

      {/* Diff Modal */}
      {diffModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDiffModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Change Comparison</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{diffModal.ecoTitle}</p>
              </div>
              <button onClick={() => setDiffModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {diffLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={18} className="animate-spin text-gray-400 mr-2"/>
                  <span className="text-gray-400 text-sm">Loading diff...</span>
                </div>
              ) : diff ? (
                <DiffTable diff={diff}/>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">No diff data available</p>
              )}
            </div>
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
              <Link to={`/ecos/${diffModal.ecoId}`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <Eye size={13}/> View full ECO
              </Link>
              <button onClick={() => setDiffModal(null)}
                className="text-sm border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
