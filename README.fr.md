# Fairbuild

*Traduit par Claude ; relecture par un locuteur natif en attente. Le [README](README.md) anglais fait foi.*

30 petits agents MCP pour le back-office des entreprises générales, des sous-traitants et des entreprises de second œuvre et de maintenance. Chaque agent a **une seule tâche**, lit les fichiers que vous exportez déjà de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou d'un tableur, et écrit des rapports et des brouillons sur votre ordinateur.

Licence MIT · Node 20 ou plus récent · fichiers locaux uniquement · aucun identifiant · données de test fictives

Mise en place à prix fixe : [Fairbuild](https://fair-agents.com/fairbuild.html).

## Essayer

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

Chaque agent a une `demo` sur des fichiers fictifs, un `eval` avec ses propres cas et un serveur MCP (`<agent> mcp --root <dossier>`).

## Les agents

**Coûts de chantier, facturation et trésorerie:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**Sous-traitants et fournisseurs:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**Paie et main-d'œuvre:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**Chantier, permis et clôture:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**Appels d'offres, carnet de commandes et cautionnement:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**Service et garantie:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## Comment ils restent sûrs

- **Fichiers locaux uniquement.** Aucune connexion à la comptabilité, au logiciel de chantier, à la banque, à la caution, à l'assureur ou à un portail public ; pas de réseau, pas de télémétrie.
- **Ce sont les personnes qui paient, déposent et envoient.** Payer, inscrire ou lever un privilège, déposer ou approuver une situation de travaux, passer une écriture et envoyer un e-mail sont refusés. Les brouillons attendent le clic d'une personne nommée, même en mode Auto.
- **Masqué avant que le modèle ne le voie.** Noms et identifiants des ouvriers, numéros de sécurité sociale et coordonnées des propriétaires deviennent des pseudonymes (`PERSON-3f9a1c2e`).
- **Des réglages plutôt que des règles cachées.** Taux de retenue, délais, seuils et taux de salaire viennent d'un fichier de réglages que vous contrôlez.
- **Tout est tracé.** Chaque appel est inscrit dans un journal d'audit chaîné par hachage.

## Limites

Aucun conseil juridique, fiscal, d'assurance, de cautionnement ou comptable. Les noms de colonnes des exports n'ont pas encore été vérifiés sur de vrais exports ; la première mise en place les confirme avec vous. Les fichiers de neuf langues sont lus (encodages, nombres, dates, noms de colonnes) ; les résultats et les CSV restent en anglais, les pages de rapport existent dans les neuf langues (`--lang`).

## Licence

MIT. Voir [LICENSE](LICENSE).
