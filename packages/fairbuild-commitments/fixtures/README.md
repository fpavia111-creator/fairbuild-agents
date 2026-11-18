# Fairbuild Commitments fixtures

Everything here is fictional: jobs 24-101 and 24-102, vendors (Example Concrete LLC, Test Drywall Co, Example Electric Inc, Sample Lumber Supply, Sample Rebar Co, Example Roofing LLC, Sample Sheet Metal, Sample Painting Co, Example Glazing LLC) and amounts.

- `commitments.csv`: eight subcontracts and POs, planted with: a drywall subcontract billed but not signed (SC-102), an electrical subcontract whose revised amount does not add up (SC-103), a lumber PO invoiced 16,400 past its value (PO-201), a rebar PO open with no invoice since April (PO-202), roofing retainage held at the wrong rate (SC-104), a closed PO with 2,500 not invoiced (PO-203), a painting subcontract paid 1,000 more than invoiced and whose invoiced column does not tie (SC-105). SC-101 is clean.
- `invoices.csv`: the AP invoices behind them, plus EX-77 naming a commitment that does not exist.
- `exports/procore-commitments.csv`: three of the subcontracts as a Procore commitments export.
