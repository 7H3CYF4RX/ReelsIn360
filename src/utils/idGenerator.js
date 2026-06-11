const { query, run, get } = require('../config/database');

// Generate next lead ID: R360-L-001, R360-L-002, ...
function generateLeadId() {
  const result = get('SELECT COUNT(*) as cnt FROM leads');
  const num = ((result ? result.cnt : 0) + 1).toString().padStart(3, '0');
  return `R360-L-${num}`;
}

// Generate next project ID: R360-YYYY-001
function generateProjectId() {
  const year = new Date().getFullYear();
  const result = get(`SELECT COUNT(*) as cnt FROM projects WHERE project_id LIKE 'R360-${year}-%'`);
  const num = ((result ? result.cnt : 0) + 1).toString().padStart(3, '0');
  return `R360-${year}-${num}`;
}

// Generate invoice number: INV-YYYY-001
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const result = get(`SELECT COUNT(*) as cnt FROM invoices WHERE invoice_number LIKE 'INV-${year}-%'`);
  const num = ((result ? result.cnt : 0) + 1).toString().padStart(3, '0');
  return `INV-${year}-${num}`;
}

module.exports = { generateLeadId, generateProjectId, generateInvoiceNumber };
