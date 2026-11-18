# Fairbuild

*Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.*

30 kleine MCP-Agenten für die Verwaltung von Generalunternehmern, Nachunternehmern und Handwerks- und Servicebetrieben. Jeder Agent hat **eine Aufgabe**, liest die Dateien, die Sie schon aus Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan oder einer Tabelle exportieren, und schreibt Berichte und Entwürfe auf Ihrem Rechner.

MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · nur fiktive Testdaten

Einrichtung als Festpreis-Paket: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Ausprobieren

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

Jeder Agent hat eine `demo` mit fiktiven Dateien, ein `eval` mit eigenen Testfällen und einen MCP-Server (`<agent> mcp --root <ordner>`).

## Die Agenten

**Baukosten, Abrechnung und Liquidität:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**Nachunternehmer und Verbindlichkeiten:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**Lohn und Arbeitskräfte:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**Baustelle, Genehmigungen und Abnahme:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**Angebote, Auftragsbestand und Bürgschaften:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**Service und Gewährleistung:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## Wie sie sicher bleiben

- **Nur lokale Dateien.** Keine Anmeldung bei Buchhaltung, Projektsoftware, Bank, Bürge, Versicherer oder Behördenportal; kein Netzwerk, keine Telemetrie.
- **Menschen zahlen, melden und senden.** Zahlen, Sicherungshypotheken eintragen oder freigeben, Abschlagsrechnungen einreichen oder genehmigen, Buchen und E-Mail-Versand verweigert jeder Agent. Entwürfe warten auf den Klick einer namentlich genannten Person, auch im Auto-Modus.
- **Maskiert, bevor das Modell es sieht.** Namen und Kennungen von Arbeitskräften, Sozialversicherungsnummern und Kontaktdaten von Hauseigentümern werden zu Pseudonymen (`PERSON-3f9a1c2e`).
- **Einstellungen statt versteckter Regeln.** Einbehaltssätze, Fristen, Schwellen und Lohnsätze stehen in einer Einstellungsdatei, die Sie kontrollieren.
- **Alles wird protokolliert.** Jeder Aufruf landet in einem hashverketteten Audit-Log.

## Grenzen

Keine Rechts-, Steuer-, Versicherungs-, Bürgschafts- oder Buchhaltungsberatung. Die Spaltennamen der Exporte wurden noch nicht an echten Exporten geprüft; die erste Einrichtung bestätigt sie mit Ihnen. Dateien aus neun Sprachen werden gelesen (Kodierungen, Zahlen, Daten, Spaltennamen); Ergebnisse und CSV bleiben auf Englisch, Berichtsseiten gibt es in allen neun Sprachen (`--lang`).

## Lizenz

MIT. Siehe [LICENSE](LICENSE).
