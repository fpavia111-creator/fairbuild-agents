# Real-data test (final pass, 19 Nov 2026)

`node scripts/realdata.mjs` downloads public building-permit records into `_realdata/` (git-ignored; never committed), runs `fairbuild-permits` on them with the column mapping a customer would set in `fairbuild-sources.json`, and writes counts only to `results.json`. Only permit columns are requested: both portals also publish contractor and applicant names and phones, which the script does not download.

Building permits are the one Fairbuild input that cities publish in its real format. Everything else the agents read (job cost, commitments, invoices, pay applications, lien waivers, certificates, payroll, timecards, bids) is a contractor's private record, and there is no public sample of a Procore, Sage, Foundation, Vista, Buildertrend or ServiceTitan export we could use. So 1 of 30 agents was tested on real data; the other 29 were not.

## Files

| Source | URL | Downloaded | Licence | Rows |
|---|---|---|---|---|
| City of Austin, Issued Construction Permits | https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu | 19 Nov 2026 (data updated 17 Nov 2026) | Public Domain U.S. Government (portal metadata) | 5,000 permits issued since 1 May 2025, newest first |
| NYC Department of Buildings, DOB Permit Issuance | https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/ipu4-2q9a | 19 Nov 2026 (data updated 18 Nov 2026) | No licence in the portal metadata; NYC Open Data terms of use | 5,000 permits issued in 2026 |

Columns used: permit number, job (Austin: street address; NYC: DOB job number), permit type, jurisdiction or borough, issue date, expiry date, status. As of: the download date.

## What the agent found

| Source | Read | Expired | Expiring within 30 days |
|---|---|---:|---:|
| Austin | 5,000 of 5,000 rows, every expiry date read (ISO dates with time) | 1 | 4 |
| NYC | 5,000 of 5,000 rows, every expiry date read (month-first dates) | 221 | 63 |

## False positives found, and what changed

1. **Austin, finaled permits (fixed).** The first run flagged 737 permits as expired; 736 of them have the status "Final": the work passed its final inspection and needs no renewal. The core reads "final" as approved (right for change orders and waivers), so the permits agent now treats a status that starts with Final, Finaled, Withdrawn or Aborted as closed. Second run: 1 expired permit, and its own status says "Expired". "Pending Final Inspection" is still treated as open (a test checks it).
2. **NYC, renewals (fixed).** DOB issues a new permit row when a permit is renewed. On the first extract (5,000 rows in storage order, back to 1992) 2,010 older rows were flagged. The agent now checks only the permit that expires last per job, permit type and jurisdiction; the others are marked `superseded` (setting `latest_per_job_and_type`, on by default; turn it off when a job really has several permits of one type). On permits issued in 2026: 598 rows are past their expiry date; 377 are replaced by a later permit of the same type for the same job and are no longer flagged.
3. **NYC, what is left (not confirmed).** The 221 still flagged have no later permit of the same type for the job in this extract (172 have no later row at all; 49 have a later permit of another type). The public data carries no sign-off status, so a permit that expired after the work was finished looks the same as one that lapsed on an active job. On a contractor's own permit log the status column would say which; here they cannot be called true or false positives.

`results.json` has the counts by finding and by the city's own status value.
