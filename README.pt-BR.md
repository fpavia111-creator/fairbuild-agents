# Fairbuild

*Traduzido por Claude; revisão por falante nativo pendente. O [README](README.md) em inglês é o que vale.*

30 pequenos agentes MCP para o back-office de construtoras, subempreiteiros e empresas de instalações e manutenção. Cada agente tem **uma única tarefa**, lê os arquivos que você já exporta do Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou de uma planilha, e escreve relatórios e rascunhos no seu computador.

Licença MIT · Node 20 ou mais recente · apenas arquivos locais · sem credenciais · apenas dados de teste fictícios

Implantação com preço fixo: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Experimente

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

Cada agente tem uma `demo` com arquivos fictícios, um `eval` com seus próprios casos e um servidor MCP (`<agente> mcp --root <pasta>`).

## Os agentes

**Custo de obra, faturamento e caixa:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**Subempreiteiros e contas a pagar:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**Folha e mão de obra:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**Obra, licenças e encerramento:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**Propostas, carteira e garantias:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**Serviço e garantia:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

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
