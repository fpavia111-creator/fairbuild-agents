# Fairbuild

*Traduzido por Claude; revisão por falante nativo pendente. O [README](README.md) em inglês é o que vale.*

30 pequenos agentes MCP para o back-office de construtoras, subempreiteiros e empresas de instalações e manutenção. Cada agente tem **uma única tarefa**, lê os arquivos que você já exporta do Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou de uma planilha, e escreve relatórios e rascunhos no seu computador.

Licença MIT · Node 20 ou mais recente · apenas arquivos locais · sem credenciais · apenas dados de teste fictícios

Implantação com preço fixo: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Experimente

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

Cada agente tem uma `demo` com arquivos fictícios, um `eval` com seus próprios casos e um servidor MCP (`<agente> mcp --root <pasta>`).

## Os agentes

**Custo de obra, faturamento e caixa:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**Subempreiteiros e contas a pagar:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**Folha e mão de obra:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**Obra, licenças e encerramento:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**Propostas, carteira e garantias:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**Serviço e garantia:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

## Como eles se mantêm seguros

- **Apenas arquivos locais.** Sem login na contabilidade, no software de obra, no banco, na seguradora-fiadora, na seguradora ou em portais públicos; sem rede, sem telemetria.
- **Pessoas pagam, protocolam e enviam.** Pagar, registrar ou liberar um gravame, enviar ou aprovar uma medição, lançar na contabilidade e enviar e-mail são recusados. Os rascunhos esperam o clique de uma pessoa nomeada, mesmo no modo Auto.
- **Mascarado antes de o modelo ver.** Nomes e identificações de trabalhadores, números de Seguridade Social e contatos de proprietários viram pseudônimos (`PERSON-3f9a1c2e`).
- **Configurações em vez de regras ocultas.** Percentuais de retenção, prazos, limites e salários vêm de um arquivo de configuração que você controla.
- **Tudo fica registrado.** Cada chamada vai para um log de auditoria encadeado por hash.

## Limites

Não é aconselhamento jurídico, fiscal, de seguros, de garantias ou contábil. Os nomes de colunas de cada exportação ainda não foram verificados em exportações reais; a primeira implantação os confirma com você. Arquivos de nove idiomas são lidos (codificações, números, datas, nomes de colunas); resultados e CSV ficam em inglês, e as páginas de relatório existem nos nove idiomas (`--lang`).

## Licença

MIT. Veja [LICENSE](LICENSE).
