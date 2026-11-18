# Fairbuild Duplicate Vendors fixtures

Everything here is fictional: vendors, tax ids, addresses, phone numbers, bank digits and invoices.

- `vendors.csv`: nine vendor records. V100 and V101 are the same company (same tax id, bank, address and phone); V200 and V201 share a bank account and address, with tax ids one digit apart; V500 and V501 differ only by "Co" and "Company"; V400 and V401 are different companies with similar names (not flagged).
- `invoices.csv`: EC-2210 was entered and paid under both concrete records; SL-88120 sits open a second time as 0088120 under V201; TD-101 is entered twice, once paid and once open; EE-5501 and EE-5510 are the same amount two days apart with near-identical numbers, both paid.
