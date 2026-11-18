# Fairbuild Job Cost fixtures

Everything here is fictional: jobs (24-101 Example Clinic fit-out, 24-102 Sample Library roof), vendors (Example Concrete LLC, Sample Lumber Supply, Test Drywall Co, Example Electric Inc, Sample Excavating, Example Roofing LLC) and amounts.

- `budget.csv`: seven budget lines, each planted with one issue or none: concrete committed and projected over budget, rough carpentry over budget, drywall spending ahead of progress, electrical revised budget that does not add up, general conditions on 24-102 whose detail does not tie.
- `costs.csv`: job cost detail. 31-000 on 24-101 has no budget line; job 24-199 is not in the budget.
- `settings.json`: thresholds (5% or 2,500 for projected overruns, 15 points for spend ahead of progress).
- `settings-loose.json`: wide thresholds, to show a setting changing the result.
- `exports/procore-budget.csv`: the 24-101 lines as a Procore budget export (cost types spelled out).
