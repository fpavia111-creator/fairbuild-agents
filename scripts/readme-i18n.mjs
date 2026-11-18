#!/usr/bin/env node
// Writes the root README in eight more languages from the agent groups in the English README.
// Translations by Claude; a native speaker's review is still pending (said at the top of each file).
// usage: node scripts/readme-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = ['rhine-of-costcodes', 'platte-of-releases'];
const COUNT = 30;

const GROUPS = {
  'Job cost, billing and cash': { de: 'Baukosten, Abrechnung und Liquidität', fr: 'Coûts de chantier, facturation et trésorerie', es: 'Costos de obra, facturación y caja', 'pt-BR': 'Custo de obra, faturamento e caixa', it: 'Costi di commessa, fatturazione e cassa', ja: '工事原価・請求・資金', 'zh-Hans': '项目成本、计量与现金', ko: '공사 원가, 기성 청구, 현금' },
  'Subcontractors and payables': { de: 'Nachunternehmer und Verbindlichkeiten', fr: 'Sous-traitants et fournisseurs', es: 'Subcontratistas y cuentas por pagar', 'pt-BR': 'Subempreiteiros e contas a pagar', it: 'Subappaltatori e debiti', ja: '協力会社と買掛金', 'zh-Hans': '分包商与应付账款', ko: '협력업체와 매입채무' },
  'Payroll and labour': { de: 'Lohn und Arbeitskräfte', fr: "Paie et main-d'œuvre", es: 'Nómina y mano de obra', 'pt-BR': 'Folha e mão de obra', it: 'Paghe e manodopera', ja: '給与と労務', 'zh-Hans': '工资与劳务', ko: '급여와 노무' },
  'Field, permits and closeout': { de: 'Baustelle, Genehmigungen und Abnahme', fr: 'Chantier, permis et clôture', es: 'Obra, permisos y cierre', 'pt-BR': 'Obra, licenças e encerramento', it: 'Cantiere, permessi e chiusura', ja: '現場・許可・竣工', 'zh-Hans': '现场、许可与竣工', ko: '현장, 인허가, 준공' },
  'Bids, backlog and bonding': { de: 'Angebote, Auftragsbestand und Bürgschaften', fr: 'Appels d\'offres, carnet de commandes et cautionnement', es: 'Licitaciones, cartera y fianzas', 'pt-BR': 'Propostas, carteira e garantias', it: 'Gare, portafoglio ordini e cauzioni', ja: '入札・受注残・ボンド', 'zh-Hans': '投标、在手订单与保函', ko: '입찰, 수주잔고, 보증' },
  'Service and warranty': { de: 'Service und Gewährleistung', fr: 'Service et garantie', es: 'Servicio y garantía', 'pt-BR': 'Serviço e garantia', it: 'Assistenza e garanzia', ja: 'サービスと保証', 'zh-Hans': '服务与保修', ko: '서비스와 하자보수' },
};

const T = {
  de: { file: 'README.de.md', note: 'Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.',
    intro: (n) => `${n} kleine MCP-Agenten für die Verwaltung von Generalunternehmern, Nachunternehmern und Handwerks- und Servicebetrieben. Jeder Agent hat **eine Aufgabe**, liest die Dateien, die Sie schon aus Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan oder einer Tabelle exportieren, und schreibt Berichte und Entwürfe auf Ihrem Rechner.`,
    tags: 'MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · nur fiktive Testdaten',
    sold: 'Einrichtung als Festpreis-Paket: [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: 'Ausprobieren', tryText: 'Jeder Agent hat eine `demo` mit fiktiven Dateien, ein `eval` mit eigenen Testfällen und einen MCP-Server (`<agent> mcp --root <ordner>`).',
    agents: 'Die Agenten', safe: 'Wie sie sicher bleiben',
    rules: ['**Nur lokale Dateien.** Keine Anmeldung bei Buchhaltung, Projektsoftware, Bank, Bürge, Versicherer oder Behördenportal; kein Netzwerk, keine Telemetrie.', '**Menschen zahlen, melden und senden.** Zahlen, Sicherungshypotheken eintragen oder freigeben, Abschlagsrechnungen einreichen oder genehmigen, Buchen und E-Mail-Versand verweigert jeder Agent. Entwürfe warten auf den Klick einer namentlich genannten Person, auch im Auto-Modus.', '**Maskiert, bevor das Modell es sieht.** Namen und Kennungen von Arbeitskräften, Sozialversicherungsnummern und Kontaktdaten von Hauseigentümern werden zu Pseudonymen (`PERSON-3f9a1c2e`).', '**Einstellungen statt versteckter Regeln.** Einbehaltssätze, Fristen, Schwellen und Lohnsätze stehen in einer Einstellungsdatei, die Sie kontrollieren.', '**Alles wird protokolliert.** Jeder Aufruf landet in einem hashverketteten Audit-Log.'],
    limits: 'Grenzen', limitText: 'Keine Rechts-, Steuer-, Versicherungs-, Bürgschafts- oder Buchhaltungsberatung. Die Spaltennamen der Exporte wurden noch nicht an echten Exporten geprüft; die erste Einrichtung bestätigt sie mit Ihnen. Dateien aus neun Sprachen werden gelesen (Kodierungen, Zahlen, Daten, Spaltennamen); Ergebnisse und CSV bleiben auf Englisch, Berichtsseiten gibt es in allen neun Sprachen (`--lang`).',
    licence: 'Lizenz', licText: 'MIT. Siehe [LICENSE](LICENSE).' },
  fr: { file: 'README.fr.md', note: 'Traduit par Claude ; relecture par un locuteur natif en attente. Le [README](README.md) anglais fait foi.',
    intro: (n) => `${n} petits agents MCP pour le back-office des entreprises générales, des sous-traitants et des entreprises de second œuvre et de maintenance. Chaque agent a **une seule tâche**, lit les fichiers que vous exportez déjà de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou d'un tableur, et écrit des rapports et des brouillons sur votre ordinateur.`,
    tags: 'Licence MIT · Node 20 ou plus récent · fichiers locaux uniquement · aucun identifiant · données de test fictives',
    sold: 'Mise en place à prix fixe : [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: 'Essayer', tryText: 'Chaque agent a une `demo` sur des fichiers fictifs, un `eval` avec ses propres cas et un serveur MCP (`<agent> mcp --root <dossier>`).',
    agents: 'Les agents', safe: 'Comment ils restent sûrs',
    rules: ["**Fichiers locaux uniquement.** Aucune connexion à la comptabilité, au logiciel de chantier, à la banque, à la caution, à l'assureur ou à un portail public ; pas de réseau, pas de télémétrie.", "**Ce sont les personnes qui paient, déposent et envoient.** Payer, inscrire ou lever un privilège, déposer ou approuver une situation de travaux, passer une écriture et envoyer un e-mail sont refusés. Les brouillons attendent le clic d'une personne nommée, même en mode Auto.", "**Masqué avant que le modèle ne le voie.** Noms et identifiants des ouvriers, numéros de sécurité sociale et coordonnées des propriétaires deviennent des pseudonymes (`PERSON-3f9a1c2e`).", '**Des réglages plutôt que des règles cachées.** Taux de retenue, délais, seuils et taux de salaire viennent d\'un fichier de réglages que vous contrôlez.', "**Tout est tracé.** Chaque appel est inscrit dans un journal d'audit chaîné par hachage."],
    limits: 'Limites', limitText: "Aucun conseil juridique, fiscal, d'assurance, de cautionnement ou comptable. Les noms de colonnes des exports n'ont pas encore été vérifiés sur de vrais exports ; la première mise en place les confirme avec vous. Les fichiers de neuf langues sont lus (encodages, nombres, dates, noms de colonnes) ; les résultats et les CSV restent en anglais, les pages de rapport existent dans les neuf langues (`--lang`).",
    licence: 'Licence', licText: 'MIT. Voir [LICENSE](LICENSE).' },
  es: { file: 'README.es.md', note: 'Traducido por Claude; pendiente de revisión por un hablante nativo. El [README](README.md) en inglés es el que vale.',
    intro: (n) => `${n} pequeños agentes MCP para la administración de contratistas generales, subcontratistas y empresas de oficios y servicio técnico. Cada agente tiene **una sola tarea**, lee los archivos que ya exporta de Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o una hoja de cálculo, y escribe informes y borradores en su computadora.`,
    tags: 'Licencia MIT · Node 20 o posterior · solo archivos locales · sin credenciales · solo datos de prueba ficticios',
    sold: 'Instalación a precio fijo: [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: 'Pruébelo', tryText: 'Cada agente tiene una `demo` con archivos ficticios, un `eval` con sus propios casos y un servidor MCP (`<agente> mcp --root <carpeta>`).',
    agents: 'Los agentes', safe: 'Cómo se mantienen seguros',
    rules: ['**Solo archivos locales.** Sin inicio de sesión en contabilidad, software de obra, banco, afianzadora, aseguradora ni portales públicos; sin red ni telemetría.', '**Las personas pagan, presentan y envían.** Pagar, presentar o liberar un gravamen, presentar o aprobar una estimación de obra, contabilizar y enviar correos se rechazan. Los borradores esperan el clic de una persona con nombre, incluso en modo Auto.', '**Enmascarado antes de que lo vea el modelo.** Nombres e identificadores de trabajadores, números de Seguro Social y datos de contacto de propietarios se convierten en seudónimos (`PERSON-3f9a1c2e`).', '**Ajustes en lugar de reglas ocultas.** Porcentajes de retención, plazos, umbrales y tarifas salariales vienen de un archivo de ajustes que usted controla.', '**Todo queda registrado.** Cada llamada se escribe en un registro de auditoría encadenado por hash.'],
    limits: 'Límites', limitText: 'No es asesoría legal, fiscal, de seguros, de fianzas ni contable. Los nombres de columna de cada exportación aún no se han comprobado con exportaciones reales; la primera instalación los confirma con usted. Se leen archivos de nueve idiomas (codificaciones, números, fechas, nombres de columna); los resultados y los CSV quedan en inglés, y las páginas de informe existen en los nueve idiomas (`--lang`).',
    licence: 'Licencia', licText: 'MIT. Vea [LICENSE](LICENSE).' },
  'pt-BR': { file: 'README.pt-BR.md', note: 'Traduzido por Claude; revisão por falante nativo pendente. O [README](README.md) em inglês é o que vale.',
    intro: (n) => `${n} pequenos agentes MCP para o back-office de construtoras, subempreiteiros e empresas de instalações e manutenção. Cada agente tem **uma única tarefa**, lê os arquivos que você já exporta do Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan ou de uma planilha, e escreve relatórios e rascunhos no seu computador.`,
    tags: 'Licença MIT · Node 20 ou mais recente · apenas arquivos locais · sem credenciais · apenas dados de teste fictícios',
    sold: 'Implantação com preço fixo: [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: 'Experimente', tryText: 'Cada agente tem uma `demo` com arquivos fictícios, um `eval` com seus próprios casos e um servidor MCP (`<agente> mcp --root <pasta>`).',
    agents: 'Os agentes', safe: 'Como eles se mantêm seguros',
    rules: ['**Apenas arquivos locais.** Sem login na contabilidade, no software de obra, no banco, na seguradora-fiadora, na seguradora ou em portais públicos; sem rede, sem telemetria.', '**Pessoas pagam, protocolam e enviam.** Pagar, registrar ou liberar um gravame, enviar ou aprovar uma medição, lançar na contabilidade e enviar e-mail são recusados. Os rascunhos esperam o clique de uma pessoa nomeada, mesmo no modo Auto.', '**Mascarado antes de o modelo ver.** Nomes e identificações de trabalhadores, números de Seguridade Social e contatos de proprietários viram pseudônimos (`PERSON-3f9a1c2e`).', '**Configurações em vez de regras ocultas.** Percentuais de retenção, prazos, limites e salários vêm de um arquivo de configuração que você controla.', '**Tudo fica registrado.** Cada chamada vai para um log de auditoria encadeado por hash.'],
    limits: 'Limites', limitText: 'Não é aconselhamento jurídico, fiscal, de seguros, de garantias ou contábil. Os nomes de colunas de cada exportação ainda não foram verificados em exportações reais; a primeira implantação os confirma com você. Arquivos de nove idiomas são lidos (codificações, números, datas, nomes de colunas); resultados e CSV ficam em inglês, e as páginas de relatório existem nos nove idiomas (`--lang`).',
    licence: 'Licença', licText: 'MIT. Veja [LICENSE](LICENSE).' },
  it: { file: 'README.it.md', note: 'Tradotto da Claude; revisione di un madrelingua in attesa. Fa fede il [README](README.md) inglese.',
    intro: (n) => `${n} piccoli agenti MCP per il back-office di imprese generali, subappaltatori e aziende di impianti e assistenza. Ogni agente ha **un solo compito**, legge i file che già esportate da Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan o da un foglio di calcolo, e scrive report e bozze sul vostro computer.`,
    tags: 'Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · solo dati di prova fittizi',
    sold: 'Installazione a prezzo fisso: [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: 'Provatelo', tryText: 'Ogni agente ha una `demo` su file fittizi, un `eval` con i propri casi e un server MCP (`<agente> mcp --root <cartella>`).',
    agents: 'Gli agenti', safe: 'Come restano sicuri',
    rules: ['**Solo file locali.** Nessun accesso a contabilità, software di cantiere, banca, garante, assicuratore o portali pubblici; niente rete, niente telemetria.', '**Sono le persone a pagare, depositare e inviare.** Pagare, iscrivere o cancellare un privilegio, presentare o approvare uno stato di avanzamento, registrare in contabilità e inviare e-mail sono rifiutati. Le bozze aspettano il clic di una persona nominata, anche in modalità Auto.', '**Mascherato prima che il modello lo veda.** Nomi e codici dei lavoratori, numeri di previdenza sociale e contatti dei proprietari diventano pseudonimi (`PERSON-3f9a1c2e`).', '**Impostazioni invece di regole nascoste.** Percentuali di ritenuta, termini, soglie e tariffe salariali vengono da un file di impostazioni che controllate voi.', '**Tutto viene registrato.** Ogni chiamata finisce in un registro di audit concatenato con hash.'],
    limits: 'Limiti', limitText: 'Nessuna consulenza legale, fiscale, assicurativa, sulle cauzioni o contabile. I nomi delle colonne di ogni esportazione non sono ancora stati verificati su esportazioni reali; la prima installazione li conferma con voi. Si leggono file in nove lingue (codifiche, numeri, date, nomi di colonna); risultati e CSV restano in inglese, le pagine di report esistono in tutte e nove le lingue (`--lang`).',
    licence: 'Licenza', licText: 'MIT. Vedi [LICENSE](LICENSE).' },
  ja: { file: 'README.ja.md', note: 'Claude による翻訳です。ネイティブスピーカーによる確認は未了です。英語の [README](README.md) が正本です。',
    intro: (n) => `ゼネコン、専門工事会社、設備・サービス会社のバックオフィス向けの小さな MCP エージェント ${n} 個。各エージェントは**一つの仕事**だけを担当し、Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan や表計算からすでにエクスポートしているファイルを読み、あなたのコンピューター上にレポートと下書きを書き出します。`,
    tags: 'MIT ライセンス · Node 20 以降 · ローカルファイルのみ · 認証情報不要 · 架空のテストデータのみ',
    sold: '固定価格の導入サービス：[Fairbuild](https://fair-agents.com/fairbuild.html)。',
    tryIt: '試してみる', tryText: '各エージェントには架空のファイルで動く `demo`、独自のテストケースを持つ `eval`、MCP サーバー（`<agent> mcp --root <folder>`）があります。',
    agents: 'エージェント一覧', safe: '安全に保つ仕組み',
    rules: ['**ローカルファイルのみ。** 会計・工事管理システム、銀行、保証会社、保険会社、行政ポータルにはログインしません。ネットワーク通信もテレメトリもありません。', '**支払い・届出・送信は人が行います。** 支払、先取特権の登録や解除、出来高請求の提出や承認、仕訳の計上、メール送信はすべて拒否されます。下書きは Auto モードでも、名前のある担当者のクリックを待ちます。', '**モデルに渡る前にマスク。** 作業員の氏名と ID、社会保障番号、施主の連絡先は仮名（`PERSON-3f9a1c2e`）になります。', '**隠れたルールではなく設定。** 保留金率、通知日数、しきい値、賃率はあなたが管理する設定ファイルから読みます。', '**すべて記録。** すべての呼び出しはハッシュで連結された監査ログに残ります。'],
    limits: '限界', limitText: '法律、税務、保険、保証、会計に関する助言ではありません。各エクスポートの列名はまだ実際のエクスポートで検証されていません。最初の導入時に一緒に確認します。9 言語のファイル（文字コード、数値、日付、列名）を読みます。結果と CSV は英語のままで、レポートページは 9 言語すべてで出力できます（`--lang`）。',
    licence: 'ライセンス', licText: 'MIT。[LICENSE](LICENSE) を参照してください。' },
  'zh-Hans': { file: 'README.zh-Hans.md', note: '由 Claude 翻译；尚待母语人士审校。以英文 [README](README.md) 为准。',
    intro: (n) => `面向总承包商、分包商和专业工程与维修服务公司后台的 ${n} 个小型 MCP 代理。每个代理只负责**一项工作**，读取你已经从 Procore、Sage 100/300 Contractor、Foundation、Vista、QuickBooks、Buildertrend、ServiceTitan 或电子表格导出的文件，并在你的电脑上写出报告和草稿。`,
    tags: 'MIT 许可证 · Node 20 或更高版本 · 仅本地文件 · 无需凭据 · 仅虚构测试数据',
    sold: '固定价格的部署服务：[Fairbuild](https://fair-agents.com/fairbuild.html)。',
    tryIt: '试用', tryText: '每个代理都有使用虚构文件的 `demo`、带自有测试用例的 `eval`，以及 MCP 服务器（`<agent> mcp --root <文件夹>`）。',
    agents: '代理列表', safe: '如何保证安全',
    rules: ['**仅本地文件。** 不登录财务或项目管理系统、银行、担保公司、保险公司或政府门户；无网络调用，无遥测。', '**付款、申报和发送由人完成。** 付款、登记或解除留置权、提交或批准进度款申请、记账和发送邮件都会被拒绝。草稿即使在 Auto 模式下也要等待指定人员点击。', '**在模型看到之前先做掩码。** 工人姓名和编号、社会保障号码以及业主联系方式会变成化名（`PERSON-3f9a1c2e`）。', '**用设置代替隐藏规则。** 保留金比例、通知天数、阈值和工资标准都来自你掌控的设置文件。', '**全程留痕。** 每次调用都写入哈希链式审计日志。'],
    limits: '局限', limitText: '不提供法律、税务、保险、担保或会计建议。各导出文件的列名尚未在真实导出文件上验证；首次部署时会与你一起确认。可读取九种语言的文件（编码、数字、日期、列名）；结果和 CSV 保持英文，报告页面可用全部九种语言生成（`--lang`）。',
    licence: '许可证', licText: 'MIT。见 [LICENSE](LICENSE)。' },
  ko: { file: 'README.ko.md', note: 'Claude가 번역했으며 원어민 검토는 아직입니다. 영문 [README](README.md)가 기준입니다.',
    intro: (n) => `종합건설사, 전문건설사, 설비·서비스 업체의 백오피스를 위한 작은 MCP 에이전트 ${n}개. 각 에이전트는 **한 가지 일**만 맡아, Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan 또는 스프레드시트에서 이미 내보내는 파일을 읽고 여러분의 컴퓨터에 보고서와 초안을 씁니다.`,
    tags: 'MIT 라이선스 · Node 20 이상 · 로컬 파일만 · 자격 증명 불필요 · 가상의 테스트 데이터만',
    sold: '고정 가격 도입 서비스: [Fairbuild](https://fair-agents.com/fairbuild.html).',
    tryIt: '사용해 보기', tryText: '각 에이전트에는 가상 파일로 실행하는 `demo`, 자체 테스트 케이스가 있는 `eval`, MCP 서버(`<agent> mcp --root <폴더>`)가 있습니다.',
    agents: '에이전트 목록', safe: '안전을 지키는 방식',
    rules: ['**로컬 파일만.** 회계·공사관리 시스템, 은행, 보증회사, 보험사, 행정 포털에 로그인하지 않으며 네트워크 호출과 원격 측정도 없습니다.', '**지급, 신고, 발송은 사람이 합니다.** 지급, 유치권 등록이나 해제, 기성 청구서 제출이나 승인, 전표 기표, 이메일 발송은 모두 거부됩니다. 초안은 Auto 모드에서도 이름이 지정된 담당자의 클릭을 기다립니다.', '**모델이 보기 전에 마스킹.** 작업자 이름과 ID, 사회보장번호, 건축주 연락처는 가명(`PERSON-3f9a1c2e`)이 됩니다.', '**숨은 규칙 대신 설정.** 유보금 비율, 통지 기한, 기준값, 임금 단가는 여러분이 관리하는 설정 파일에서 읽습니다.', '**모든 것을 기록.** 모든 호출은 해시로 연결된 감사 로그에 남습니다.'],
    limits: '한계', limitText: '법률, 세무, 보험, 보증, 회계 자문이 아닙니다. 각 내보내기의 열 이름은 아직 실제 내보내기 파일로 검증되지 않았으며, 첫 도입 때 함께 확인합니다. 9개 언어의 파일(인코딩, 숫자, 날짜, 열 이름)을 읽으며 결과와 CSV는 영어로 유지되고, 보고서 페이지는 9개 언어 모두로 쓸 수 있습니다(`--lang`).',
    licence: '라이선스', licText: 'MIT. [LICENSE](LICENSE)를 참고하세요.' },
};

const en = readFileSync(join(ROOT, 'README.md'), 'utf8');
const groups = []; let g = null;
for (const l of en.split('\n')) {
  const h = l.match(/^### (.*)/); if (h) { g = { name: h[1].trim(), agents: [] }; groups.push(g); continue; }
  if (/^## /.test(l)) g = null;
  const a = g && l.match(/^\| \[`([a-z0-9-]+)`\]/); if (a) g.agents.push(a[1]);
}
const total = groups.reduce((n, x) => n + x.agents.length, 0);
if (total !== COUNT) throw new Error(`found ${total} agents in README.md, expected ${COUNT}`);
for (const [code, L] of Object.entries(T)) {
  const md = [
    '# Fairbuild', '',
    `*${L.note}*`, '',
    L.intro(COUNT), '',
    L.tags, '',
    L.sold, '',
    `## ${L.tryIt}`, '',
    '```bash', ...DEMO.map((d) => `npx -y ${d} demo`), '```', '',
    L.tryText, '',
    `## ${L.agents}`, '',
    ...groups.flatMap((x) => { const name = (GROUPS[x.name] || {})[code]; if (!name) throw new Error(`no ${code} name for group "${x.name}"`); return [`**${name}:** ${x.agents.map((a) => `[\`${a}\`](packages/${a})`).join(', ')}`, '']; }),
    `## ${L.safe}`, '',
    ...L.rules.map((r) => `- ${r}`), '',
    `## ${L.limits}`, '',
    L.limitText, '',
    `## ${L.licence}`, '',
    L.licText, '',
  ].join('\n');
  writeFileSync(join(ROOT, L.file), md);
}
console.log(`README in ${1 + Object.keys(T).length} languages, ${total} agents in ${groups.length} groups`);
