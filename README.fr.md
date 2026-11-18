# Fairbuild

*Traduit par Claude ; relecture par un locuteur natif en attente. Le [README](README.md) anglais fait foi.*

30 petits agents MCP pour le back-office des entreprises générales, des sous-traitants et des entreprises de second œuvre et de maintenance. Chaque agent a **une seule tâche**, lit les fichiers que vous exportez déjà de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou d'un tableur, et écrit des rapports et des brouillons sur votre ordinateur.

Licence MIT · Node 20 ou plus récent · fichiers locaux uniquement · aucun identifiant · données de test fictives

Mise en place à prix fixe : [Fairbuild](https://fair-agents.com/fairbuild.html).

## Essayer

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

Chaque agent a une `demo` sur des fichiers fictifs, un `eval` avec ses propres cas et un serveur MCP (`<agent> mcp --root <dossier>`).

## Les agents

**Coûts de chantier, facturation et trésorerie:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**Sous-traitants et fournisseurs:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**Paie et main-d'œuvre:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**Chantier, permis et clôture:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**Appels d'offres, carnet de commandes et cautionnement:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**Service et garantie:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
