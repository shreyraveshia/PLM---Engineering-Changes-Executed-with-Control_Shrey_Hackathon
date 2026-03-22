import Papa from 'papaparse';

/**
 * exportCSV
 * Converts any array of objects to a downloadable CSV file
 * @param {Array}  data     — array of plain objects
 * @param {string} filename — e.g. 'eco-report-2024-01-01.csv'
 */
export const exportCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.warn('exportCSV: no data to export');
    return;
  }

  const csv = Papa.unparse(data, {
    header: true,
    skipEmptyLines: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
