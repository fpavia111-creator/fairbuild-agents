# Fairbuild

*Traducido por Claude; pendiente de revisión por un hablante nativo. El [README](README.md) en inglés es el que vale.*

30 pequeños agentes MCP para la administración de contratistas generales, subcontratistas y empresas de oficios y servicio técnico. Cada agente tiene **una sola tarea**, lee los archivos que ya exporta de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o una hoja de cálculo, y escribe informes y borradores en su computadora.

Licencia MIT · Node 20 o posterior · solo archivos locales · sin credenciales · solo datos de prueba ficticios

Instalación a precio fijo: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Pruébelo

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

Cada agente tiene una `demo` con archivos ficticios, un `eval` con sus propios casos y un servidor MCP (`<agente> mcp --root <carpeta>`).

## Los agentes

**Costos de obra, facturación y caja:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**Subcontratistas y cuentas por pagar:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**Nómina y mano de obra:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**Obra, permisos y cierre:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**Licitaciones, cartera y fianzas:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**Servicio y garantía:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## Cómo se mantienen seguros

- **Solo archivos locales.** Sin inicio de sesión en contabilidad, software de obra, banco, afianzadora, aseguradora ni portales públicos; sin red ni telemetría.
- **Las personas pagan, presentan y envían.** Pagar, presentar o liberar un gravamen, presentar o aprobar una estimación de obra, contabilizar y enviar correos se rechazan. Los borradores esperan el clic de una persona con nombre, incluso en modo Auto.
- **Enmascarado antes de que lo vea el modelo.** Nombres e identificadores de trabajadores, números de Seguro Social y datos de contacto de propietarios se convierten en seudónimos (`PERSON-3f9a1c2e`).
- **Ajustes en lugar de reglas ocultas.** Porcentajes de retención, plazos, umbrales y tarifas salariales vienen de un archivo de ajustes que usted controla.
- **Todo queda registrado.** Cada llamada se escribe en un registro de auditoría encadenado por hash.

## Límites

No es asesoría legal, fiscal, de seguros, de fianzas ni contable. Los nombres de columna de cada exportación aún no se han comprobado con exportaciones reales; la primera instalación los confirma con usted. Se leen archivos de nueve idiomas (codificaciones, números, fechas, nombres de columna); los resultados y los CSV quedan en inglés, y las páginas de informe existen en los nueve idiomas (`--lang`).

## Licencia

MIT. Vea [LICENSE](LICENSE).
