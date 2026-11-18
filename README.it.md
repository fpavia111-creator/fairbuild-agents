# Fairbuild

*Tradotto da Claude; revisione di un madrelingua in attesa. Fa fede il [README](README.md) inglese.*

30 piccoli agenti MCP per il back-office di imprese generali, subappaltatori e aziende di impianti e assistenza. Ogni agente ha **un solo compito**, legge i file che già esportate da Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o da un foglio di calcolo, e scrive report e bozze sul vostro computer.

Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · solo dati di prova fittizi

Installazione a prezzo fisso: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Provatelo

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

Ogni agente ha una `demo` su file fittizi, un `eval` con i propri casi e un server MCP (`<agente> mcp --root <cartella>`).

## Gli agenti

**Costi di commessa, fatturazione e cassa:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**Subappaltatori e debiti:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**Paghe e manodopera:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**Cantiere, permessi e chiusura:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**Gare, portafoglio ordini e cauzioni:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**Assistenza e garanzia:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
