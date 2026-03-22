import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * exportEcoReportPDF
 * Generates a branded PDF from the ECO report data
 * @param {Array} data — array of ECO report rows from /api/reports/ecos
 */
export const exportEcoReportPDF = (data) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header branding
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PLM Control — Engineering Change Orders Report', 10, 13);

  // Generated timestamp
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 220, 13);

  // Summary stats
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  const open    = data.filter(r => r.status === 'open').length;
  const applied = data.filter(r => r.status === 'applied').length;
  doc.text(`Total ECOs: ${data.length}   |   Open: ${open}   |   Applied: ${applied}`, 10, 28);

  // Main table
  autoTable(doc, {
    startY: 32,
    head: [['#', 'ECO Title', 'Type', 'Product', 'Stage', 'Status', 'Created By', 'Date']],
    body: data.map((row, i) => [
      i + 1,
      row.title,
      row.eco_type === 'bom' ? 'Bill of Materials' : 'Product',
      row.product_name,
      row.stage_name,
      row.status.toUpperCase(),
      row.created_by_name || '—',
      new Date(row.created_at).toLocaleDateString(),
    ]),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [55, 65, 81],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 65 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 30 },
      7: { cellWidth: 22 },
    },
    didDrawCell: (data) => {
      // Color status column cells
      if (data.section === 'body' && data.column.index === 5) {
        const status = data.cell.raw?.toLowerCase();
        if (status === 'applied') {
          doc.setFillColor(220, 252, 231);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(21, 128, 61);
          doc.text(data.cell.raw, data.cell.x + 2, data.cell.y + 4);
        } else if (status === 'open') {
          doc.setFillColor(219, 234, 254);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(29, 78, 216);
          doc.text(data.cell.raw, data.cell.x + 2, data.cell.y + 4);
        }
      }
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `PLM Control — Confidential · Page ${i} of ${pageCount}`,
      10, doc.internal.pageSize.height - 5
    );
  }

  doc.save(`eco-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * exportProductHistoryPDF
 */
export const exportProductHistoryPDF = (data) => {
  const doc = new jsPDF();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PLM Control — Product Version History', 10, 13);

  autoTable(doc, {
    startY: 28,
    head: [['Product Name', 'Version', 'Status', 'Sale Price', 'Cost Price', 'Date']],
    body: data.map(row => [
      row.name,
      `v${row.version}`,
      row.status,
      row.sale_price ? `$${row.sale_price}` : '—',
      row.cost_price ? `$${row.cost_price}` : '—',
      new Date(row.created_at).toLocaleDateString(),
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`product-history-${new Date().toISOString().split('T')[0]}.pdf`);
};
