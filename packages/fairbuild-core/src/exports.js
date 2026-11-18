// Catalogue of export files from construction accounting, project management,
// payroll and field service systems that the Fairbuild agents recognise.
//
// Each entry says how to recognise the file (column names that must be there).
// An agent turns an entry into a profile by adding its own column map:
//
//   exportProfile('procore_budget', { cost_code: 'Cost Code', original_budget: 'Original Budget Amount' })
//
// basis:
//   'documented'  the column names were checked against the vendor's own
//                 documentation (source and date given);
//   'recalled'    the layout was written from knowledge of the export and was
//                 not checked against documentation or a live account.
// Neither kind was tested against a live account. When a header differs, the
// file still maps by each column's "also called" list, `inspect` shows what was
// matched, and fairbuild-sources.json names the columns by hand.

const e = (id, system, label, signature, extra = {}) => Object.freeze({ id, system, label, signature, basis: 'recalled', ...extra });

export const EXPORTS = Object.freeze(Object.fromEntries([
  // Budgets and job cost
  e('procore_budget', 'Procore', 'Budget tab, export to CSV', ['Cost Code', 'Original Budget Amount', 'Revised Budget']),
  e('vista_jc_estimates', 'Viewpoint Vista', 'JC estimates by phase and cost type (list export with field names)', ['Phase', 'CostType', 'OrigEstCost']),
  e('qb_job_estimates_vs_actuals', 'QuickBooks Desktop (Contractor edition)', 'Job Estimates vs. Actuals Detail report (CSV or Excel)', ['Item', 'Est. Cost', 'Act. Cost'], { dropTotals: true }),
  e('sage300_jc_detail', 'Sage 300 Construction and Real Estate', 'Job cost detail report exported to Excel or CSV', ['Job', 'Cost Code', 'Category', 'Tran Type', 'Amount']),
  e('sage100c_job_cost', 'Sage 100 Contractor', 'Job cost records exported from the job cost journal', ['Job', 'Cost Type', 'Trn Date', 'Amount']),
  e('foundation_job_cost', 'Foundation Software', 'Job cost detail export', ['Job No', 'Cost Code', 'Cost Class', 'Amount']),
  e('vista_jc_detail', 'Viewpoint Vista', 'JC cost detail (list export with field names)', ['Phase', 'CostType', 'ActualCost', 'ActualDate']),
  // Commitments, invoices and change orders
  e('procore_commitments', 'Procore', 'Commitments tool, export to CSV (subcontracts and purchase orders)', ['Number', 'Contract Company', 'Original Contract Amount']),
  e('buildertrend_purchase_orders', 'Buildertrend', 'Purchase Orders list, export to Excel', ['PO #', 'Assigned To', 'Total']),
  e('sage300_ap_invoices', 'Sage 300 Construction and Real Estate', 'AP invoice register exported to Excel or CSV', ['Vendor', 'Invoice', 'Invoice Date', 'Retainage']),
  e('buildertrend_bills', 'Buildertrend', 'Bills list, export to Excel', ['Bill #', 'Assigned To', 'Total']),
  e('buildertrend_change_orders', 'Buildertrend', 'Change Orders list, export to Excel', ['ID #', 'Approval Status', 'Owner Price']),
  e('procore_change_orders', 'Procore', 'Change Orders tool, export to CSV', ['#', 'Contract Company', 'Date Approved']),
  // Field, compliance and service exports (each agent adds its own column map)
  e('procore_submittals', 'Procore', 'Submittals log, export to CSV', ['Spec Section', 'Ball In Court', 'Required On-Site Date']),
  e('procore_punch_list', 'Procore', 'Punch List, export to CSV', ['Punch Item Manager', 'Ball In Court', 'Due Date']),
  e('procore_inspections', 'Procore', 'Inspections list, export to CSV', ['Inspection Type', 'Inspection Date', 'Status']),
  e('servicetitan_jobs', 'ServiceTitan', 'Jobs report exported to Excel', ['Job #', 'Business Unit', 'Job Type', 'Technician']),
  e('servicetitan_timesheets', 'ServiceTitan', 'Technician timesheet report exported to Excel', ['Technician', 'Timesheet Code', 'Hours']),
  e('wh347_payroll_lines', 'Certified payroll (WH-347 layout)', 'Certified payroll lines typed or exported in the WH-347 column order', ['Work Classification', 'Rate of Pay', ['Total Hours', 'Straight Time Hours']]),
  e('sage300_timecards', 'Sage 300 Construction and Real Estate', 'Payroll timecard entry export', ['Employee', 'Job', 'Cost Code', 'Regular Hours', 'Overtime Hours']),
].map((x) => [x.id, x])));

/** A profile for an agent: a catalogue entry plus the agent's column map. */
export function exportProfile(key, map, extra = {}) {
  const base = EXPORTS[key];
  if (!base) throw new Error(`unknown export "${key}"`);
  return { ...base, map, ...extra };
}

export const EXPORTS_BASIS_NOTE = 'Where a layout says "checked", its column names were compared with the vendor\'s documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.';

/**
 * Row hook for grouped reports (QuickBooks style): a row with only its first
 * cell filled names the group for the rows under it; "Total for ..." rows end it.
 * The group name is written to `field` on each detail row.
 */
export function carryGroup(field, { groupColumn = '', isDetail } = {}) {
  return (rows) => {
    const out = []; let group = '';
    for (const r of rows) {
      const label = String(r[groupColumn] ?? '').trim();
      const detail = isDetail ? isDetail(r) : Object.entries(r).some(([k, v]) => k !== groupColumn && k !== field && String(v ?? '').trim() !== '');
      if (label && /^(grand\s+)?total\b/i.test(label)) continue;
      if (label && !detail) { group = label; continue; }
      if (!detail) continue;
      const { [groupColumn]: _drop, ...rest } = r;
      out.push({ ...rest, [field]: String(r[field] ?? '').trim() || label || group });
    }
    return out;
  };
}

/** Row hook: keep the first row for each value of `field` (Shopify repeats an order once per line item). */
export function firstRowPer(field) {
  return (rows) => { const seen = new Set(); return rows.filter((r) => { const k = String(r[field] ?? ''); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
}

/** "First Last" from two columns, for exports that split the name. */
export const fullName = (first, last) => ({ from: [first, last], compute: (_r, get) => [get(first), get(last)].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ') });
