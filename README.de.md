# Fairbuild

*Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.*

30 kleine MCP-Agenten für die Verwaltung von Generalunternehmern, Nachunternehmern und Handwerks- und Servicebetrieben. Jeder Agent hat **eine Aufgabe**, liest die Dateien, die Sie schon aus Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan oder einer Tabelle exportieren, und schreibt Berichte und Entwürfe auf Ihrem Rechner.

MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · nur fiktive Testdaten

Einrichtung als Festpreis-Paket: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Ausprobieren

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

Jeder Agent hat eine `demo` mit fiktiven Dateien, ein `eval` mit eigenen Testfällen und einen MCP-Server (`<agent> mcp --root <ordner>`).

## Die Agenten

**Baukosten, Abrechnung und Liquidität:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**Nachunternehmer und Verbindlichkeiten:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**Lohn und Arbeitskräfte:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**Baustelle, Genehmigungen und Abnahme:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**Angebote, Auftragsbestand und Bürgschaften:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**Service und Gewährleistung:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
