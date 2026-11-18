# Fairbuild

*Tradotto da Claude; revisione di un madrelingua in attesa. Fa fede il [README](README.md) inglese.*

30 piccoli agenti MCP per il back-office di imprese generali, subappaltatori e aziende di impianti e assistenza. Ogni agente ha **un solo compito**, legge i file che già esportate da Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o da un foglio di calcolo, e scrive report e bozze sul vostro computer.

Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · solo dati di prova fittizi

Installazione a prezzo fisso: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Provatelo

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

Ogni agente ha una `demo` su file fittizi, un `eval` con i propri casi e un server MCP (`<agente> mcp --root <cartella>`).

## Gli agenti

**Costi di commessa, fatturazione e cassa:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**Subappaltatori e debiti:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**Paghe e manodopera:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**Cantiere, permessi e chiusura:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**Gare, portafoglio ordini e cauzioni:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**Assistenza e garanzia:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## Come restano sicuri

- **Solo file locali.** Nessun accesso a contabilità, software di cantiere, banca, garante, assicuratore o portali pubblici; niente rete, niente telemetria.
- **Sono le persone a pagare, depositare e inviare.** Pagare, iscrivere o cancellare un privilegio, presentare o approvare uno stato di avanzamento, registrare in contabilità e inviare e-mail sono rifiutati. Le bozze aspettano il clic di una persona nominata, anche in modalità Auto.
- **Mascherato prima che il modello lo veda.** Nomi e codici dei lavoratori, numeri di previdenza sociale e contatti dei proprietari diventano pseudonimi (`PERSON-3f9a1c2e`).
- **Impostazioni invece di regole nascoste.** Percentuali di ritenuta, termini, soglie e tariffe salariali vengono da un file di impostazioni che controllate voi.
- **Tutto viene registrato.** Ogni chiamata finisce in un registro di audit concatenato con hash.

## Limiti

Nessuna consulenza legale, fiscale, assicurativa, sulle cauzioni o contabile. I nomi delle colonne di ogni esportazione non sono ancora stati verificati su esportazioni reali; la prima installazione li conferma con voi. Si leggono file in nove lingue (codifiche, numeri, date, nomi di colonna); risultati e CSV restano in inglese, le pagine di report esistono in tutte e nove le lingue (`--lang`).

## Licenza

MIT. Vedi [LICENSE](LICENSE).
