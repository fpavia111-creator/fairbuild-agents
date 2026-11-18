// Column vocabularies shared by the Fairbuild agents, so a budget, a job cost detail,
// a commitment list or an AP invoice register reads the same way in every agent.
// Each field lists the header names it is also called. The names were written from
// knowledge of common construction accounting and project management exports; none was
// checked against a live account. A contractor can name columns by hand in
// fairbuild-sources.json, and `inspect` shows how a file was read.
import { exportProfile } from './exports.js';

const t = (aliases, extra = {}) => ({ aliases, ...extra });

const JOB = ['Job', 'Job Number', 'Job No', 'Job #', 'Job No.', 'Job ID', 'Project', 'Project Number', 'Project No', 'Project #', 'Project ID', 'Contract', 'Customer:Job'];
const CODE = ['Cost Code', 'Costcode', 'Cost Code Number', 'Phase', 'Phase Code', 'Phase/Cost Code', 'Item', 'Budget Code', 'Code', 'Cost Item'];
const TYPE = ['Cost Type', 'Category', 'Cost Category', 'Cost Class', 'CostType', 'Type Code', 'Class'];
const VENDOR = ['Vendor', 'Vendor Name', 'Subcontractor', 'Sub', 'Supplier', 'Contract Company', 'Company', 'Payee', 'Name', 'Assigned To'];

/** Job master: one row per job. */
export const JOB_FIELDS = Object.freeze({
  job: t(JOB, { required: true }),
  job_name: t(['Job Name', 'Project Name', 'Job Description', 'Description', 'Title']),
  client: t(['Customer', 'Owner', 'Client', 'Customer Name', 'Owner Name', 'Bill To']),
  contract_amount: t(['Contract Amount', 'Revised Contract', 'Revised Contract Amount', 'Contract Value', 'Contract Total', 'Current Contract'], { type: 'money' }),
  estimated_cost: t(['Estimated Cost', 'Revised Estimated Cost', 'Total Estimated Cost', 'Current Estimate', 'Estimated Cost at Completion', 'EAC'], { type: 'money' }),
  start_date: t(['Start Date', 'Start', 'Notice to Proceed', 'NTP Date'], { type: 'date' }),
  completion_date: t(['Completion Date', 'Substantial Completion', 'Substantial Completion Date', 'Finish Date', 'Completed'], { type: 'date' }),
  status: t(['Status', 'Job Status', 'Project Status', 'Stage']),
  project_manager: t(['Project Manager', 'PM', 'Manager']),
  retainage_pct: t(['Retainage %', 'Retainage Percent', 'Retention %', 'Retainage Rate', 'Retention Rate'], { type: 'number' }),
  bonded: t(['Bonded', 'Bond', 'Bond Required', 'P&P Bond'], { type: 'bool' }),
  tax_exempt: t(['Tax Exempt', 'Exempt', 'Tax Status'], { type: 'bool' }),
});

/** Budget by job and cost code (and cost type). */
export const BUDGET_FIELDS = Object.freeze({
  job: t(JOB),
  cost_code: t(CODE, { required: true }),
  cost_code_name: t(['Cost Code Description', 'Cost Code Name', 'Phase Description', 'Description', 'Item Description']),
  cost_type: t(TYPE),
  original_budget: t(['Original Budget', 'Original Budget Amount', 'Original Estimate', 'Orig Est Cost', 'OrigEstCost', 'Est. Cost', 'Budget', 'Budget Amount', 'Estimated Cost'], { type: 'money' }),
  approved_changes: t(['Approved Changes', 'Approved COs', 'Approved Change Orders', 'Budget Changes', 'Budget Modifications', 'Change Orders'], { type: 'money' }),
  revised_budget: t(['Revised Budget', 'Current Budget', 'Revised Estimate', 'Curr Est Cost', 'CurrEstCost', 'Current Estimate'], { type: 'money' }),
  committed: t(['Committed', 'Committed Costs', 'Committed Cost', 'Commitments', 'Total Cmtd Cost', 'TotalCmtdCost'], { type: 'money' }),
  actual: t(['Actual', 'Actual Cost', 'Actual Costs', 'Cost to Date', 'Job to Date Costs', 'JTD Cost', 'Act. Cost', 'ActualCost', 'Direct Costs'], { type: 'money' }),
  estimate_to_complete: t(['Estimate to Complete', 'Cost to Complete', 'ETC', 'Forecast to Complete', 'Remaining Cost'], { type: 'money' }),
  projected: t(['Projected', 'Projected Cost', 'Projected Costs', 'Estimated Cost at Completion', 'Forecast', 'EAC', 'Proj Cost', 'ProjCost'], { type: 'money' }),
  percent_complete: t(['Percent Complete', '% Complete', 'Pct Complete', 'Complete %'], { type: 'number' }),
});

/** Job cost detail: one row per cost transaction. */
export const COST_FIELDS = Object.freeze({
  job: t(JOB, { required: true }),
  cost_code: t(CODE),
  cost_type: t(TYPE),
  date: t(['Date', 'Transaction Date', 'Accounting Date', 'Posting Date', 'Posted', 'GL Date', 'Actual Date', 'ActualDate', 'Invoice Date'], { type: 'date' }),
  source: t(['Source', 'Tran Type', 'Transaction Type', 'Trans Type', 'Type', 'Journal', 'Module']),
  vendor: t(VENDOR),
  reference: t(['Reference', 'Ref', 'Document', 'Document Number', 'Invoice', 'Invoice Number', 'Num', 'Check Number']),
  description: t(['Description', 'Memo', 'Line Description', 'Detail', 'Notes']),
  amount: t(['Amount', 'Cost', 'Actual Cost', 'ActualCost', 'Total', 'Extended Cost', 'Debit'], { type: 'money', required: true }),
  hours: t(['Hours', 'Units', 'Actual Hours', 'ActualHours', 'Qty', 'Quantity'], { type: 'number' }),
  commitment: t(['Commitment', 'PO', 'PO Number', 'Purchase Order', 'Subcontract', 'Contract Number', 'Commitment Number']),
});

/** Subcontracts and purchase orders. */
export const COMMITMENT_FIELDS = Object.freeze({
  commitment: t(['Commitment', 'Commitment Number', 'Number', 'Contract Number', 'Subcontract', 'Subcontract Number', 'PO', 'PO Number', 'PO #', 'Purchase Order', 'Purchase Order Number'], { required: true }),
  commitment_type: t(['Commitment Type', 'Type', 'Contract Type', 'Doc Type']),
  job: t(JOB),
  vendor: t(VENDOR),
  cost_code: t(CODE),
  cost_type: t(TYPE),
  description: t(['Description', 'Title', 'Scope', 'Name']),
  date: t(['Date', 'Contract Date', 'PO Date', 'Issued', 'Issue Date', 'Created'], { type: 'date' }),
  status: t(['Status', 'Commitment Status', 'PO Status']),
  original_amount: t(['Original Amount', 'Original Contract Amount', 'Original Commitment', 'Orig Amount', 'Contract Amount', 'PO Amount', 'Amount'], { type: 'money' }),
  approved_changes: t(['Approved Changes', 'Approved Change Orders', 'Approved COs', 'Change Orders'], { type: 'money' }),
  revised_amount: t(['Revised Amount', 'Revised Contract Amount', 'Current Commitment', 'Revised Commitment', 'Current Amount', 'Total Commitment'], { type: 'money' }),
  invoiced: t(['Invoiced', 'Invoiced to Date', 'Billed to Date', 'Billed', 'Invoiced Amount', 'Received to Date'], { type: 'money' }),
  paid: t(['Paid', 'Paid to Date', 'Payments Issued', 'Payments', 'Amount Paid'], { type: 'money' }),
  retainage_held: t(['Retainage Held', 'Retainage', 'Retention Held', 'Retainage Withheld'], { type: 'money' }),
  retainage_pct: t(['Retainage %', 'Retainage Percent', 'Retention %'], { type: 'number' }),
  executed: t(['Executed', 'Signed', 'Fully Executed', 'Contract Signed'], { type: 'bool' }),
});

/** Accounts payable invoices (subcontractor pay applications and supplier invoices). */
export const AP_INVOICE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No', 'Invoice #', 'Inv No', 'Bill #', 'Bill Number', 'Num', 'Pay App', 'Pay Application'], { required: true }),
  vendor: t(VENDOR),
  vendor_id: t(['Vendor ID', 'Vendor Number', 'Vendor No', 'Vendor Code', 'Supplier ID']),
  job: t(JOB),
  cost_code: t(CODE),
  cost_type: t(TYPE),
  invoice_date: t(['Invoice Date', 'Date', 'Bill Date', 'Inv Date'], { type: 'date' }),
  due_date: t(['Due Date', 'Due', 'Pay By'], { type: 'date' }),
  received_date: t(['Received Date', 'Date Received', 'Entered', 'Entry Date'], { type: 'date' }),
  amount: t(['Amount', 'Invoice Amount', 'Invoice Total', 'Total', 'Gross Amount', 'Bill Amount'], { type: 'money' }),
  retainage: t(['Retainage', 'Retainage Withheld', 'Retention', 'Retainage Amount'], { type: 'money' }),
  tax: t(['Tax', 'Sales Tax', 'Tax Amount', 'Use Tax'], { type: 'money' }),
  commitment: t(['Commitment', 'PO', 'PO Number', 'PO #', 'Purchase Order', 'Subcontract', 'Contract Number']),
  status: t(['Status', 'Invoice Status', 'Approval Status', 'Pay Status']),
  paid_date: t(['Paid Date', 'Payment Date', 'Date Paid', 'Check Date'], { type: 'date' }),
  paid_amount: t(['Paid Amount', 'Amount Paid', 'Payment Amount', 'Paid'], { type: 'money' }),
  check_number: t(['Check Number', 'Check #', 'Check No', 'Payment Number', 'Payment Ref']),
  description: t(['Description', 'Memo', 'Notes', 'Title']),
});

/** Change orders: owner change orders, potential change orders and commitment change orders. */
export const CHANGE_ORDER_FIELDS = Object.freeze({
  change_order: t(['Change Order', 'Change Order Number', 'CO Number', 'CO #', 'CO', 'Number', 'PCO', 'PCO Number', 'ID #', 'ID'], { required: true }),
  job: t(JOB),
  co_type: t(['CO Type', 'Change Order Type', 'Type', 'Kind']),
  status: t(['Status', 'Approval Status', 'CO Status']),
  description: t(['Description', 'Title', 'Scope', 'Reason']),
  amount: t(['Amount', 'Owner Price', 'Price', 'Revenue', 'Contract Change', 'Change Amount', 'Grand Total'], { type: 'money' }),
  cost: t(['Cost', 'Estimated Cost', 'Builder Cost', 'Cost Estimate', 'Budget Change'], { type: 'money' }),
  submitted_date: t(['Submitted Date', 'Date Submitted', 'Submitted', 'Created', 'Date Created', 'Date'], { type: 'date' }),
  approved_date: t(['Approved Date', 'Date Approved', 'Approved', 'Executed Date', 'Signed Date'], { type: 'date' }),
  billed: t(['Billed', 'Billed to Date', 'Amount Billed', 'Invoiced'], { type: 'money' }),
  commitment: t(['Commitment', 'Subcontract', 'PO', 'Contract Number']),
  vendor: t(['Vendor', 'Subcontractor', 'Contract Company', 'Sub']),
  cost_code: t(CODE),
});

/** Schedule of values lines of a pay application (the G703 continuation sheet layout). */
export const SOV_FIELDS = Object.freeze({
  job: t(JOB),
  application: t(['Application', 'Application Number', 'Application No', 'Pay App', 'Pay App Number', 'App #', 'App No']),
  period_to: t(['Period To', 'Period Ending', 'Period End', 'Through Date'], { type: 'date' }),
  item: t(['Item', 'Item No', 'Item Number', 'Line', 'Line Item', 'Line Number', 'SOV Item'], { required: true }),
  description: t(['Description', 'Description of Work', 'Scope', 'Line Description']),
  scheduled_value: t(['Scheduled Value', 'Scheduled Values', 'Contract Value', 'SOV Amount', 'Budget'], { type: 'money' }),
  previous: t(['From Previous Application', 'Previous', 'Previously Completed', 'Work Completed Previous', 'Previous Applications', 'Prior Billed'], { type: 'money' }),
  this_period: t(['This Period', 'Work Completed This Period', 'Current Billing', 'This Application', 'Billed This Period'], { type: 'money' }),
  stored_materials: t(['Materials Presently Stored', 'Stored Materials', 'Materials Stored', 'Stored'], { type: 'money' }),
  completed_stored: t(['Total Completed and Stored', 'Completed and Stored to Date', 'Total Completed', 'Billed to Date'], { type: 'money' }),
  percent: t(['%', 'Percent', '% (G / C)', 'Percent Complete', '% Complete'], { type: 'number' }),
  balance: t(['Balance to Finish', 'Balance', 'Remaining'], { type: 'money' }),
  retainage: t(['Retainage', 'Retainage Amount', 'Retention'], { type: 'money' }),
  field_percent: t(['Field Percent', 'Field % Complete', 'PM % Complete', 'Physical % Complete'], { type: 'number' }),
});

/** Payments to vendors (check register). */
export const PAYMENT_FIELDS = Object.freeze({
  check_number: t(['Check Number', 'Check #', 'Check No', 'Payment Number', 'Payment ID', 'Reference', 'Ref'], { required: true }),
  vendor: t(VENDOR),
  job: t(JOB),
  date: t(['Date', 'Check Date', 'Payment Date', 'Paid Date'], { type: 'date' }),
  amount: t(['Amount', 'Check Amount', 'Payment Amount', 'Paid'], { type: 'money' }),
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No', 'Bill #', 'Applied To']),
  status: t(['Status', 'Payment Status']),
});

// --------------------------------------------------------- named exports ----

/** Budget exports from named systems. */
export const BUDGET_PROFILES = Object.freeze([
  exportProfile('procore_budget', { job: ['Project Number', 'Project'], cost_code: 'Cost Code', cost_code_name: 'Description', cost_type: ['Cost Type', 'Category'], original_budget: 'Original Budget Amount', approved_changes: 'Approved COs', revised_budget: 'Revised Budget', committed: 'Committed Costs', actual: ['Job to Date Costs', 'Direct Costs'], estimate_to_complete: 'Forecast To Complete', projected: 'Estimated Cost at Completion' }),
  exportProfile('vista_jc_estimates', { job: 'Job', cost_code: 'Phase', cost_code_name: 'Description', cost_type: 'CostType', original_budget: 'OrigEstCost', revised_budget: 'CurrEstCost', committed: 'TotalCmtdCost', actual: 'ActualCost', projected: 'ProjCost' }),
  exportProfile('qb_job_estimates_vs_actuals', { job: ['Customer:Job', 'Job'], cost_code: 'Item', original_budget: 'Est. Cost', actual: 'Act. Cost' }, { note: 'QuickBooks uses items as cost codes. When the report is grouped by job, add a Customer:Job column or export one job at a time.' }),
]);

/** Job cost detail exports. */
export const COST_PROFILES = Object.freeze([
  exportProfile('sage300_jc_detail', { job: 'Job', cost_code: 'Cost Code', cost_type: 'Category', date: ['Accounting Date', 'Date'], source: 'Tran Type', vendor: 'Vendor', reference: ['Invoice', 'Reference'], description: 'Description', amount: 'Amount', hours: 'Units' }),
  exportProfile('sage100c_job_cost', { job: 'Job', cost_code: ['Cost Code', 'Phase'], cost_type: 'Cost Type', date: 'Trn Date', source: 'Source', vendor: 'Vendor', reference: 'Invoice#', description: 'Description', amount: 'Amount', hours: 'Hours' }),
  exportProfile('foundation_job_cost', { job: 'Job No', cost_code: 'Cost Code', cost_type: 'Cost Class', date: 'Date', source: 'Source', vendor: 'Vendor Name', reference: 'Reference', description: 'Description', amount: 'Amount', hours: 'Units' }),
  exportProfile('vista_jc_detail', { job: 'Job', cost_code: 'Phase', cost_type: 'CostType', date: 'ActualDate', source: 'Source', description: 'Description', amount: 'ActualCost', hours: 'ActualHours' }),
]);

/** Commitment (subcontract and PO) exports. */
export const COMMITMENT_PROFILES = Object.freeze([
  exportProfile('procore_commitments', { commitment: 'Number', commitment_type: 'Type', job: ['Project Number', 'Project'], vendor: 'Contract Company', description: 'Title', status: 'Status', original_amount: 'Original Contract Amount', approved_changes: 'Approved Change Orders', revised_amount: 'Revised Contract Amount', invoiced: 'Invoiced', paid: 'Payments Issued', retainage_held: ['Retainage', 'Total Retainage'], executed: 'Executed' }),
  exportProfile('buildertrend_purchase_orders', { commitment: 'PO #', job: 'Job', vendor: 'Assigned To', description: 'Title', status: 'Status', original_amount: 'Total', paid: 'Paid', cost_code: 'Cost Codes' }),
]);

/** AP invoice exports. */
export const AP_PROFILES = Object.freeze([
  exportProfile('sage300_ap_invoices', { invoice_number: 'Invoice', vendor: 'Vendor', job: 'Job', cost_code: 'Cost Code', cost_type: 'Category', invoice_date: 'Invoice Date', due_date: 'Due Date', amount: 'Amount', retainage: 'Retainage', tax: 'Tax', commitment: 'Commitment', status: 'Status', paid_date: 'Check Date', check_number: 'Check' }),
  exportProfile('buildertrend_bills', { invoice_number: 'Bill #', job: 'Job', vendor: 'Assigned To', description: 'Title', amount: 'Total', status: 'Status', paid_date: 'Paid Date', due_date: 'Due Date', cost_code: 'Cost Codes', commitment: 'Related PO' }),
]);

/** Change order exports. */
export const CHANGE_ORDER_PROFILES = Object.freeze([
  exportProfile('buildertrend_change_orders', { change_order: 'ID #', job: 'Job', description: 'Title', status: 'Approval Status', amount: 'Owner Price', cost: 'Builder Cost', approved_date: 'Approved Date', submitted_date: 'Date Created' }),
  exportProfile('procore_change_orders', { change_order: '#', job: ['Project Number', 'Project'], co_type: 'Type', description: 'Title', status: 'Status', amount: 'Amount', submitted_date: 'Created At', approved_date: 'Date Approved', commitment: 'Contract', vendor: 'Contract Company' }),
]);
