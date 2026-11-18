// Douro: the closeout checklist for completed jobs. Pure functions, no I/O.
import { num, str, round2, pct, isoDate, daysBetween, statusOf, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CLOSEOUT_JOB_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  job_name: t(['Job Name', 'Project Name']),
  completion_date: t(['Completion Date', 'Substantial Completion', 'Substantial Completion Date', 'Completed'], { type: 'date' }),
  project_manager: t(['Project Manager', 'PM']),
});
export const CHECKLIST_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  item: t(['Item', 'Closeout Item', 'Document', 'Requirement', 'Deliverable'], { required: true }),
  status: t(['Status', 'State']),
  due_date: t(['Due Date', 'Due', 'Required By'], { type: 'date' }),
  received_date: t(['Received Date', 'Received', 'Completed', 'Submitted'], { type: 'date' }),
});
export const CLOSEOUT_REQUIREMENTS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['required'],
  properties: {
    required: { type: 'array', items: { type: 'string', maxLength: 120 }, description: 'Closeout items every completed job must have' },
    grace_days: { type: 'integer', minimum: 0, maximum: 365, description: 'An item still open this many days after substantial completion is flagged (default 30)' },
    item_aliases: { type: 'object', additionalProperties: { type: 'string', maxLength: 120 }, description: 'Your words for an item, e.g. {"O and M": "O&M manuals"}' },
  },
});
const ORDER = ['item_missing', 'item_rejected', 'item_overdue', 'item_open_too_long'];
const norm = (s) => str(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function checkCloseout({ jobRows, checklistRows, requirements, asOf }) {
  const grace = num(requirements.grace_days) ?? 30; const alias = Object.fromEntries(Object.entries(requirements.item_aliases || {}).map(([k, v]) => [norm(k), norm(v)]));
  const ikey = (s) => alias[norm(s)] || norm(s);
  const lists = new Map(); for (const c of checklistRows) { const k = jobKey(c.job); if (!k || !str(c.item)) continue; if (!lists.has(k)) lists.set(k, new Map()); lists.get(k).set(ikey(c.item), c); }
  const items = []; const jobs = {};
  for (const j of jobRows) {
    const done = isoDate(j.completion_date); if (!str(j.job) || !done || done > asOf) continue;
    const since = daysBetween(done, asOf); const list = lists.get(jobKey(j.job)) || new Map(); let complete = 0;
    for (const name of requirements.required) {
      const f = []; const c = list.get(ikey(name)); const st = c ? statusOf(c.status) : null; const finished = c && (st === 'closed' || st === 'approved' || /received|complete|done|approved/i.test(str(c.status)) || (!!isoDate(c.received_date) && st !== 'rejected'));
      if (!c) f.push(finding('item_missing', null, `${name} is not on the closeout checklist for job ${str(j.job)}.`));
      else if (st === 'rejected') f.push(finding('item_rejected', null, `${name} was returned or rejected; resubmit it.`));
      else if (!finished) {
        const due = isoDate(c.due_date);
        if (due && due < asOf) f.push(finding('item_overdue', null, `${name} was due ${due} and is still ${str(c.status).toLowerCase() || 'open'}.`));
        else if (since > grace) f.push(finding('item_open_too_long', null, `${name} is still ${str(c.status).toLowerCase() || 'open'} ${since} days after completion.`));
      }
      if (finished) complete++;
      const code = f[0] ? f[0].code : null;
      items.push({ key: `${str(j.job)} ${name}`, job: str(j.job), item: name, item_status: c ? str(c.status) : '', due_date: c ? isoDate(c.due_date) : null, received_date: c ? isoDate(c.received_date) : null, status: finished ? 'done' : code === 'item_missing' ? 'missing' : code === 'item_rejected' ? 'rejected' : code ? 'overdue' : 'open', findings: orderFindings(f, ORDER) });
    }
    const n = requirements.required.length;
    jobs[str(j.job)] = { completed: done, days_since: since, items: n, done: complete, percent: pct(complete, n), ready_for_final_billing: complete === n ? 'yes' : 'no' };
  }
  const rank = { missing: 0, rejected: 1, overdue: 2, open: 3, done: 4 };
  const out = sortBy(items, ['job', 1], [(i) => rank[i.status], 1], ['item', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    jobs: Object.keys(jobs).length, item_count: out.length, done: count('done'), missing: count('missing'), rejected: count('rejected'), overdue: count('overdue'), open: count('open'),
    jobs_ready: Object.values(jobs).filter((j) => j.ready_for_final_billing === 'yes').length, as_of: asOf, settings_used: { required: requirements.required, grace_days: grace },
    by_job: jobs, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.jobs} completed job(s), ${r.item_count} closeout item(s) as of ${asOf}: ${r.done} done, ${r.missing} missing, ${r.rejected} rejected, ${r.overdue} overdue or open too long, ${r.open} open. ${r.jobs_ready} job(s) ready for final billing.`;
  return r;
}

/** Markdown body of a closeout reminder to one job's project manager. */
export function reminderText(items, job, { to, from }) {
  const rows = items.filter((i) => i.status !== 'done');
  const L = [`# Closeout: job ${job.name}`, '', `**To:** ${to || '[TO CONFIRM project manager]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    `Job ${job.name} reached completion on ${job.completed} (${job.days_since} days ago); ${job.done} of ${job.items} closeout items are done. Final billing and retainage release wait for the rest:`, '',
    '| Item | Status | What is needed |', '| --- | --- | --- |', ...rows.map((i) => `| ${i.item} | ${i.item_status || 'not on the checklist'} | ${i.findings.map((f) => f.detail).join(' ') || 'Finish and record it.'} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
