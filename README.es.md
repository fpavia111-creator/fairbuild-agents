# Fairbuild

*Traducido por Claude; pendiente de revisión por un hablante nativo. El [README](README.md) en inglés es el que vale.*

30 pequeños agentes MCP para la administración de contratistas generales, subcontratistas y empresas de oficios y servicio técnico. Cada agente tiene **una sola tarea**, lee los archivos que ya exporta de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o una hoja de cálculo, y escribe informes y borradores en su computadora.

Licencia MIT · Node 20 o posterior · solo archivos locales · sin credenciales · solo datos de prueba ficticios

Instalación a precio fijo: [Fairbuild](https://fair-agents.com/fairbuild.html).

## Pruébelo

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

Cada agente tiene una `demo` con archivos ficticios, un `eval` con sus propios casos y un servidor MCP (`<agente> mcp --root <carpeta>`).

## Los agentes

**Costos de obra, facturación y caja:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**Subcontratistas y cuentas por pagar:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**Nómina y mano de obra:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**Obra, permisos y cierre:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**Licitaciones, cartera y fianzas:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**Servicio y garantía:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
