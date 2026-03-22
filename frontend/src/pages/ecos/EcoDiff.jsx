import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import DiffTable from '../../components/ui/DiffTable';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EcoDiff() {
  const { id } = useParams();
  const [diff, setDiff] = useState(null);
  const [eco, setEco] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/ecos/${id}`), api.get(`/ecos/${id}/diff`)])
      .then(([e, d]) => { setEco(e.data); setDiff(d.data); })
      .catch(() => toast.error('Failed to load diff'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw size={20} className="animate-spin text-gray-400 mr-2"/>
      <span className="text-gray-400">Loading comparison...</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/ecos/${id}`} className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14}/> Back to ECO
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Change Comparison</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Change Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">{eco?.title}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            Comparing: <span className="font-medium">{eco?.product_name} v{eco?.product_version}</span>
            {eco?.eco_type === 'bom' && <span> · BoM v{eco?.bom_version}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-green-700">
              <span className="w-2 h-2 rounded-sm bg-green-400"/> Added
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="w-2 h-2 rounded-sm bg-red-400"/> Removed
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2 h-2 rounded-sm bg-amber-400"/> Modified
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-gray-200"/> Unchanged
            </span>
          </div>
        </div>
        <DiffTable diff={diff}/>
      </div>
    </div>
  );
}
