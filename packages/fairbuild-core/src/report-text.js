// The words on a report page, in the nine report languages: page headings, section
// headings and the common column names. `--lang` (or FAIRBUILD_LANG) picks the language.
//
// What does not change with the language: the CSV file (its column names are read by
// scripts), finding codes and status values, the finding sentences and the notes under
// "Limits". A page in another language says so in its footer.
//
// Translations are written by Claude and marked for review by a native speaker.
// A string with no translation is shown in English, never left blank.
import { normLang } from './lang.js';

const ORDER = ['de', 'fr', 'es', 'pt', 'it', 'ja', 'zh', 'ko'];

// English: [de, fr, es, pt, it, ja, zh, ko]. {d} is a date, {1} {2} are numbers.
const PAGE = {
  'All rows ({1})': ['Alle Zeilen ({1})', 'Toutes les lignes ({1})', 'Todas las filas ({1})', 'Todas as linhas ({1})', 'Tutte le righe ({1})', '全行（{1}）', '全部行（{1}）', '전체 행 ({1})'],
  Limits: ['Grenzen', 'Limites', 'Límites', 'Limites', 'Limiti', '制限事項', '限制说明', '한계'],
  'None.': ['Keine.', 'Aucun.', 'Ninguno.', 'Nenhum.', 'Nessuno.', 'なし。', '无。', '없음.'],
  'Written by a Fairbuild agent from your files. Nothing was sent or paid.': [
    'Von einem Fairbuild-Agenten aus Ihren Dateien erstellt. Es wurde nichts gesendet oder bezahlt.',
    'Rédigé par un agent Fairbuild à partir de vos fichiers. Rien n’a été envoyé ni payé.',
    'Escrito por un agente Fairbuild a partir de sus archivos. No se envió ni se pagó nada.',
    'Escrito por um agente Fairbuild a partir dos seus arquivos. Nada foi enviado nem pago.',
    'Scritto da un agente Fairbuild a partire dai vostri file. Nulla è stato inviato o pagato.',
    'Fairbuild エージェントがお客様のファイルから作成しました。送信も支払いも行っていません。',
    '由 Fairbuild 智能体根据您的文件生成。未发送任何内容，也未付款。',
    'Fairbuild 에이전트가 귀사의 파일로 작성했습니다. 아무것도 전송하거나 지급하지 않았습니다.'],
  'The summary line, finding texts, codes and the notes under Limits are in English. This page was translated by Claude; a native speaker has not reviewed it yet.': [
    'Die Zusammenfassung, die Befundtexte, die Codes und die Hinweise unter „Grenzen“ sind auf Englisch. Diese Seite wurde von Claude übersetzt; eine Prüfung durch Muttersprachler steht noch aus.',
    'La ligne de synthèse, les textes des constats, les codes et les notes sous « Limites » sont en anglais. Cette page a été traduite par Claude ; elle n’a pas encore été relue par un locuteur natif.',
    'La línea de resumen, los textos de los hallazgos, los códigos y las notas de «Límites» están en inglés. Esta página fue traducida por Claude; todavía no la ha revisado un hablante nativo.',
    'A linha de resumo, os textos dos apontamentos, os códigos e as notas em “Limites” estão em inglês. Esta página foi traduzida pelo Claude; ainda não foi revisada por um falante nativo.',
    'La riga di sintesi, i testi dei rilievi, i codici e le note sotto «Limiti» sono in inglese. Questa pagina è stata tradotta da Claude; non è ancora stata rivista da un madrelingua.',
    '概要行、指摘の本文、コード、「制限事項」の注記は英語です。このページは Claude が翻訳しました。ネイティブによる確認はまだ行われていません。',
    '摘要行、发现项的文字、代码以及“限制说明”下的备注为英文。本页由 Claude 翻译，尚未经母语人士审校。',
    '요약 문장, 지적 사항의 문구, 코드와 “한계” 아래의 주석은 영어입니다. 이 페이지는 Claude가 번역했으며 원어민 검토는 아직 이루어지지 않았습니다.'],
};

const TITLES = {
  'Job cost against budget': ['Projektkosten gegenüber Budget', 'Coûts de chantier face au budget', 'Coste de obra frente al presupuesto', 'Custo da obra frente ao orçamento', 'Costi di commessa rispetto al budget', '工事原価と実行予算の比較', '项目成本与预算对比', '현장 원가 대비 예산'],
  'Commitments and open purchase orders': ['Beauftragungen und offene Bestellungen', 'Engagements et commandes ouvertes', 'Compromisos y pedidos abiertos', 'Compromissos e pedidos em aberto', 'Impegni e ordini aperti', '発注済額と未完了の発注', '已承诺成本与未结采购订单', '약정 원가와 미결 발주'],
  'Change order log': ['Nachtragsliste', 'Journal des avenants', 'Registro de modificados', 'Registro de aditivos', 'Registro delle varianti', '変更契約台帳', '变更单台账', '설계변경 대장'],
  'Retainage receivable and payable': ['Einbehalte: Forderungen und Verbindlichkeiten', 'Retenues de garantie à recevoir et à payer', 'Retenciones por cobrar y por pagar', 'Retenções a receber e a pagar', 'Ritenute da incassare e da pagare', '保留金の未収と未払', '应收与应付质保金', '받을 유보금과 줄 유보금'],
  'Pay application check': ['Prüfung der Abschlagsrechnung', 'Contrôle de la situation de travaux', 'Revisión de la certificación', 'Verificação da medição', 'Verifica dello stato avanzamento lavori', '出来高請求書の検算', '进度款申请核对', '기성청구서 검산'],
  'Schedule of values against billings': ['Leistungsverzeichnis gegenüber Abrechnung', 'Décomposition du prix face à la facturation', 'Partidas contratadas frente a lo facturado', 'Itens contratados frente ao faturado', 'Voci contrattuali rispetto al fatturato', '契約内訳と請求の比較', '合同清单与已开票对比', '계약내역 대비 청구'],
  'Work in progress, period ending {d}': ['Unfertige Leistungen, Periodenende {d}', 'Travaux en cours, période close le {d}', 'Obra en curso, periodo cerrado el {d}', 'Obras em andamento, período encerrado em {d}', 'Lavori in corso, periodo chiuso al {d}', '未成工事（{d} 締め）', '在建工程（截至 {d}）', '진행 공사 ({d} 마감)'],
  'Lien waivers against payments': ['Verzichtserklärungen gegenüber Zahlungen', 'Renonciations au privilège face aux paiements', 'Renuncias de gravamen frente a pagos', 'Renúncias de ônus frente aos pagamentos', 'Rinunce al privilegio rispetto ai pagamenti', '支払と先取特権放棄書の照合', '付款与留置权放弃书核对', '지급 대비 유치권 포기서'],
  'Subcontractor insurance certificates as of {d}': ['Versicherungsnachweise der Nachunternehmer, Stand {d}', 'Attestations d’assurance des sous-traitants au {d}', 'Certificados de seguro de subcontratistas al {d}', 'Certificados de seguro dos subempreiteiros em {d}', 'Certificati assicurativi dei subappaltatori al {d}', '下請業者の保険証明（{d} 時点）', '分包商保险证明（截至 {d}）', '협력업체 보험증권 ({d} 기준)'],
  'Subcontractor compliance documents as of {d}': ['Nachweise der Nachunternehmer, Stand {d}', 'Documents des sous-traitants au {d}', 'Documentación de subcontratistas al {d}', 'Documentos dos subempreiteiros em {d}', 'Documenti dei subappaltatori al {d}', '下請業者の必要書類（{d} 時点）', '分包商合规文件（截至 {d}）', '협력업체 제출서류 ({d} 기준)'],
  'Certified payroll against wage rates': ['Lohnnachweise gegenüber Tariflöhnen', 'Registres de paie face aux taux de salaire', 'Nóminas certificadas frente a salarios fijados', 'Folhas de pagamento frente aos pisos salariais', 'Buste paga certificate rispetto alle tariffe', '賃金台帳と賃金基準の照合', '工资单与工资标准对比', '임금대장 대비 임금기준'],
  'Union fringe remittances': ['Beiträge an Sozialkassen', 'Cotisations aux caisses', 'Aportaciones a fondos sindicales', 'Contribuições aos fundos sindicais', 'Versamenti alle casse', '組合基金への拠出', '工会基金缴款', '노조 기금 납부'],
  'Timecards against job assignments': ['Stundenzettel gegenüber Einsatzplanung', 'Relevés d’heures face aux affectations', 'Partes de horas frente a asignaciones', 'Apontamentos de horas frente às alocações', 'Fogli ore rispetto alle assegnazioni', 'タイムカードと配置計画の照合', '工时卡与派工对比', '근무표 대비 현장 배치'],
  'Equipment hours and rental costs': ['Gerätestunden und Mietkosten', 'Heures d’engins et coûts de location', 'Horas de equipo y costes de alquiler', 'Horas de equipamento e custos de locação', 'Ore macchina e costi di noleggio', '機械稼働時間とレンタル費', '设备工时与租赁费用', '장비 가동시간과 임차료'],
  'Delivery tickets against supplier invoices': ['Lieferscheine gegenüber Lieferantenrechnungen', 'Bons de livraison face aux factures fournisseurs', 'Albaranes frente a facturas de proveedores', 'Notas de entrega frente às faturas de fornecedores', 'Bolle rispetto alle fatture dei fornitori', '納品書と仕入先請求書の照合', '送货单与供应商发票核对', '납품서 대비 공급업체 청구서'],
  'Three-way match': ['Dreifacher Abgleich', 'Rapprochement à trois voies', 'Conciliación a tres vías', 'Conciliação de três vias', 'Riconciliazione a tre vie', '3点照合', '三单匹配', '3자 대사'],
  'Duplicate vendors and invoices': ['Doppelte Lieferanten und Rechnungen', 'Fournisseurs et factures en double', 'Proveedores y facturas duplicados', 'Fornecedores e faturas duplicados', 'Fornitori e fatture duplicati', '重複した仕入先と請求書', '重复的供应商与发票', '중복 거래처와 청구서'],
  'Permits and inspections as of {d}': ['Genehmigungen und Abnahmen, Stand {d}', 'Permis et contrôles au {d}', 'Licencias e inspecciones al {d}', 'Alvarás e vistorias em {d}', 'Permessi e ispezioni al {d}', '許可と検査（{d} 時点）', '许可证与验收（截至 {d}）', '인허가와 검사 ({d} 기준)'],
  'Bid tabulation': ['Angebotsspiegel', 'Tableau comparatif des offres', 'Comparativo de ofertas', 'Mapa comparativo de propostas', 'Quadro comparativo delle offerte', '入札比較表', '投标比价表', '입찰 비교표'],
  'Backlog and margin fade': ['Auftragsbestand und Margenverfall', 'Carnet de commandes et érosion de marge', 'Cartera y erosión de margen', 'Carteira e erosão de margem', 'Portafoglio ordini ed erosione del margine', '受注残と利益率の低下', '在手订单与毛利下滑', '수주잔고와 이익률 하락'],
  'Warranty callbacks': ['Gewährleistungseinsätze', 'Interventions sous garantie', 'Llamadas en garantía', 'Chamados em garantia', 'Interventi in garanzia', '保証期間中の手直し依頼', '保修回访', '하자보수 요청'],
  'Service tickets and technician utilisation': ['Serviceaufträge und Technikerauslastung', 'Interventions et taux d’occupation des techniciens', 'Avisos de servicio y ocupación de técnicos', 'Ordens de serviço e ocupação dos técnicos', 'Interventi e utilizzo dei tecnici', 'サービス作業と技術者の稼働率', '服务工单与技术员利用率', '서비스 작업과 기사 가동률'],
  'Sales tax on materials': ['Steuer auf Material', 'Taxes sur les matériaux', 'Impuestos sobre materiales', 'Impostos sobre materiais', 'Imposte sui materiali', '材料の売上税', '材料销售税', '자재 판매세'],
  'Job closeout checklist': ['Checkliste für den Projektabschluss', 'Liste de clôture de chantier', 'Lista de cierre de obra', 'Lista de encerramento da obra', 'Lista di chiusura commessa', '工事完了チェックリスト', '项目收尾清单', '현장 마감 점검표'],
  'Punch list as of {d}': ['Mängelliste, Stand {d}', 'Liste des réserves au {d}', 'Lista de repasos al {d}', 'Lista de pendências em {d}', 'Elenco dei difetti al {d}', '手直しリスト（{d} 時点）', '整改清单（截至 {d}）', '하자 목록 ({d} 기준)'],
  'Submittal register as of {d}': ['Freigabeliste der Unterlagen, Stand {d}', 'Registre des visas au {d}', 'Registro de remisiones técnicas al {d}', 'Registro de submissões técnicas em {d}', 'Registro delle approvazioni tecniche al {d}', '承認図書台帳（{d} 時点）', '报审资料台账（截至 {d}）', '승인 요청서 대장 ({d} 기준)'],
  'Bonding capacity summary': ['Übersicht über den Bürgschaftsrahmen', 'Synthèse de la capacité de caution', 'Resumen de capacidad de afianzamiento', 'Resumo da capacidade de garantia', 'Sintesi della capacità fideiussoria', '保証枠の概要', '保函额度概览', '보증 한도 요약'],
  'Cash flow by job': ['Liquidität je Projekt', 'Trésorerie par chantier', 'Flujo de caja por obra', 'Fluxo de caixa por obra', 'Flusso di cassa per commessa', '工事別の資金収支', '按项目的现金流', '현장별 현금흐름'],
  'Backcharges to subcontractors': ['Belastungen an Nachunternehmer', 'Refacturations aux sous-traitants', 'Repercusiones a subcontratistas', 'Descontos aos subempreiteiros', 'Addebiti ai subappaltatori', '下請業者への相殺請求', '对分包商的扣款', '협력업체 공제'],
  'Subcontractor payment releases': ['Zahlungsfreigaben an Nachunternehmer', 'Mises en paiement des sous-traitants', 'Liberación de pagos a subcontratistas', 'Liberação de pagamentos aos subempreiteiros', 'Sblocco dei pagamenti ai subappaltatori', '下請業者への支払可否', '分包商付款放行', '협력업체 지급 승인'],
};

const SECTIONS = {
  'By job': ['Nach Projekt', 'Par chantier', 'Por obra', 'Por obra', 'Per commessa', '工事別', '按项目', '현장별'],
  'By finding': ['Nach Befund', 'Par constat', 'Por hallazgo', 'Por apontamento', 'Per rilievo', '指摘別', '按发现项', '지적 사항별'],
  'By vendor': ['Nach Lieferant', 'Par fournisseur', 'Por proveedor', 'Por fornecedor', 'Per fornitore', '仕入先別', '按供应商', '거래처별'],
  'By status': ['Nach Status', 'Par statut', 'Por estado', 'Por status', 'Per stato', 'ステータス別', '按状态', '상태별'],
  'By month': ['Nach Monat', 'Par mois', 'Por mes', 'Por mês', 'Per mese', '月別', '按月', '월별'],
  'By worker': ['Nach Mitarbeiter', 'Par salarié', 'Por trabajador', 'Por trabalhador', 'Per lavoratore', '作業員別', '按工人', '근로자별'],
  'By trade': ['Nach Gewerk', 'Par corps d’état', 'Por oficio', 'Por disciplina', 'Per categoria', '職種別', '按专业', '공종별'],
  'By classification': ['Nach Lohngruppe', 'Par qualification', 'Por categoría', 'Por função', 'Per qualifica', '職種区分別', '按工种', '직종별'],
  'By fund': ['Nach Kasse', 'Par caisse', 'Por fondo', 'Por fundo', 'Per cassa', '基金別', '按基金', '기금별'],
  'By supplier': ['Nach Lieferant', 'Par fournisseur', 'Por suministrador', 'Por fornecedor', 'Per fornitore', '仕入先別', '按供货商', '공급업체별'],
  'By jurisdiction': ['Nach Steuergebiet', 'Par juridiction', 'Por jurisdicción', 'Por jurisdição', 'Per giurisdizione', '課税地域別', '按辖区', '과세지역별'],
  'By technician': ['Nach Techniker', 'Par technicien', 'Por técnico', 'Por técnico', 'Per tecnico', '技術者別', '按技术员', '기사별'],
  'By ball in court': ['Nach Zuständigkeit', 'Par intervenant en attente', 'Por responsable actual', 'Por responsável atual', 'Per responsabile attuale', '対応者別', '按当前处理人', '현재 담당자별'],
  'By spec section': ['Nach LV-Abschnitt', 'Par article du CCTP', 'Por capítulo del pliego', 'Por seção da especificação', 'Per sezione del capitolato', '仕様書項目別', '按规范章节', '시방 항목별'],
  'By document': ['Nach Dokument', 'Par document', 'Por documento', 'Por documento', 'Per documento', '書類別', '按文件', '서류별'],
  'By equipment': ['Nach Gerät', 'Par engin', 'Por equipo', 'Por equipamento', 'Per macchina', '機械別', '按设备', '장비별'],
  'By bid package': ['Nach Vergabepaket', 'Par lot', 'Por paquete de licitación', 'Por pacote de concorrência', 'Per pacchetto di gara', '入札パッケージ別', '按招标包', '입찰 패키지별'],
  'Totals': ['Summen', 'Totaux', 'Totales', 'Totais', 'Totali', '合計', '合计', '합계'],
  'Receivable by job': ['Forderungen nach Projekt', 'À recevoir par chantier', 'Por cobrar por obra', 'A receber por obra', 'Da incassare per commessa', '工事別の未収', '按项目应收', '현장별 받을 금액'],
  'Payable by vendor': ['Verbindlichkeiten nach Lieferant', 'À payer par fournisseur', 'Por pagar por proveedor', 'A pagar por fornecedor', 'Da pagare per fornitore', '仕入先別の未払', '按供应商应付', '거래처별 줄 금액'],
  'Summary (G702)': ['Zusammenfassung (G702)', 'Récapitulatif (G702)', 'Resumen (G702)', 'Resumo (G702)', 'Riepilogo (G702)', '概要（G702）', '汇总（G702）', '요약 (G702)'],
  'Duplicate vendors': ['Doppelte Lieferanten', 'Fournisseurs en double', 'Proveedores duplicados', 'Fornecedores duplicados', 'Fornitori duplicati', '重複した仕入先', '重复的供应商', '중복 거래처'],
  'Capacity': ['Rahmen', 'Capacité', 'Capacidad', 'Capacidade', 'Capacità', '保証枠', '额度', '한도'],
  'Bonded jobs': ['Verbürgte Projekte', 'Chantiers cautionnés', 'Obras afianzadas', 'Obras garantidas', 'Commesse garantite', '保証付き工事', '有保函的项目', '보증 현장'],
  'Calendar': ['Kalender', 'Calendrier', 'Calendario', 'Calendário', 'Calendario', 'カレンダー', '日历', '일정'],
};

// Column names used by two or more agents. A column with no entry keeps its English name on the page.
const COLUMNS = {
  job: ['Projekt', 'Chantier', 'Obra', 'Obra', 'Commessa', '工事', '项目', '현장'],
  job_name: ['Projektname', 'Nom du chantier', 'Nombre de la obra', 'Nome da obra', 'Nome commessa', '工事名', '项目名称', '현장명'],
  cost_code: ['Leistungsposition', 'Code de coût', 'Partida', 'Item de custo', 'Voce di costo', '工種', '成本科目', '공종'],
  cost_type: ['Kostenart', 'Nature de coût', 'Tipo de coste', 'Tipo de custo', 'Tipo di costo', '原価区分', '成本类型', '원가구분'],
  name: ['Bezeichnung', 'Libellé', 'Descripción', 'Descrição', 'Descrizione', '名称', '名称', '명칭'],
  description: ['Beschreibung', 'Description', 'Descripción', 'Descrição', 'Descrizione', '内容', '描述', '내용'],
  vendor: ['Lieferant', 'Fournisseur', 'Proveedor', 'Fornecedor', 'Fornitore', '仕入先', '供应商', '거래처'],
  vendors: ['Lieferanten', 'Fournisseurs', 'Proveedores', 'Fornecedores', 'Fornitori', '仕入先', '供应商', '거래처'],
  supplier: ['Lieferant', 'Fournisseur', 'Suministrador', 'Fornecedor', 'Fornitore', '仕入先', '供货商', '공급업체'],
  status: ['Status', 'Statut', 'Estado', 'Status', 'Stato', 'ステータス', '状态', '상태'],
  code: ['Code', 'Code', 'Código', 'Código', 'Codice', 'コード', '代码', '코드'],
  count: ['Anzahl', 'Nombre', 'Cantidad', 'Quantidade', 'Numero', '件数', '数量', '건수'],
  amount: ['Betrag', 'Montant', 'Importe', 'Valor', 'Importo', '金額', '金额', '금액'],
  total: ['Summe', 'Total', 'Total', 'Total', 'Totale', '合計', '合计', '합계'],
  reasons: ['Gründe', 'Motifs', 'Motivos', 'Motivos', 'Motivi', '理由', '原因', '사유'],
  findings: ['Befunde', 'Constats', 'Hallazgos', 'Apontamentos', 'Rilievi', '指摘', '发现项', '지적 사항'],
  lines: ['Zeilen', 'Lignes', 'Líneas', 'Linhas', 'Righe', '行数', '行数', '행 수'],
  items: ['Positionen', 'Éléments', 'Elementos', 'Itens', 'Voci', '件数', '项目数', '항목 수'],
  revised_budget: ['Aktuelles Budget', 'Budget révisé', 'Presupuesto revisado', 'Orçamento revisado', 'Budget aggiornato', '変更後予算', '调整后预算', '변경예산'],
  committed: ['Beauftragt', 'Engagé', 'Comprometido', 'Comprometido', 'Impegnato', '発注済', '已承诺', '약정액'],
  actual: ['Ist-Kosten', 'Réalisé', 'Coste real', 'Custo real', 'Consuntivo', '実績原価', '实际成本', '실적원가'],
  projected: ['Prognose', 'Prévision', 'Previsión', 'Previsão', 'Previsione', '見込原価', '预计成本', '예상원가'],
  overrun: ['Überschreitung', 'Dépassement', 'Sobrecoste', 'Estouro', 'Sforamento', '超過額', '超支', '초과액'],
  percent_spent: ['Verbraucht %', 'Consommé %', 'Gastado %', 'Gasto %', 'Speso %', '消化率 %', '已花费 %', '집행률 %'],
  percent_complete: ['Fertigstellung %', 'Avancement %', 'Avance %', 'Avanço %', 'Avanzamento %', '進捗率 %', '完成 %', '공정률 %'],
  contract_amount: ['Auftragssumme', 'Montant du marché', 'Importe del contrato', 'Valor do contrato', 'Importo contrattuale', '契約金額', '合同金额', '계약금액'],
  commitment: ['Auftrag NU', 'Commande', 'Pedido', 'Pedido', 'Ordine', '発注番号', '合同编号', '발주번호'],
  invoice_number: ['Rechnungsnummer', 'N° de facture', 'N.º de factura', 'N.º da fatura', 'N. fattura', '請求書番号', '发票号', '청구서 번호'],
  invoiced: ['Abgerechnet', 'Facturé', 'Facturado', 'Faturado', 'Fatturato', '請求済', '已开票', '청구액'],
  billed: ['Abgerechnet', 'Facturé', 'Facturado', 'Faturado', 'Fatturato', '請求済', '已开票', '청구액'],
  paid: ['Bezahlt', 'Payé', 'Pagado', 'Pago', 'Pagato', '支払済', '已付款', '지급액'],
  remaining: ['Offen', 'Reste', 'Pendiente', 'Saldo', 'Residuo', '残額', '剩余', '잔액'],
  open_amount: ['Offener Betrag', 'Montant ouvert', 'Importe abierto', 'Valor em aberto', 'Importo aperto', '未完了額', '未结金额', '미결 금액'],
  retainage: ['Einbehalt', 'Retenue', 'Retención', 'Retenção', 'Ritenuta', '保留金', '质保金', '유보금'],
  retainage_held: ['Einbehalt', 'Retenue', 'Retención', 'Retenção', 'Ritenuta', '保留金', '质保金', '유보금'],
  change_order: ['Nachtrag', 'Avenant', 'Modificado', 'Aditivo', 'Variante', '変更番号', '变更单', '설계변경'],
  unbilled: ['Nicht abgerechnet', 'Non facturé', 'Sin facturar', 'Não faturado', 'Non fatturato', '未請求', '未开票', '미청구'],
  days: ['Tage', 'Jours', 'Días', 'Dias', 'Giorni', '日数', '天数', '일수'],
  days_open: ['Offen seit (Tage)', 'Jours ouverts', 'Días abierto', 'Dias em aberto', 'Giorni aperto', '経過日数', '未结天数', '경과일수'],
  age_days: ['Alter (Tage)', 'Âge (jours)', 'Antigüedad (días)', 'Idade (dias)', 'Età (giorni)', '経過日数', '账龄（天）', '경과일수'],
  due_date: ['Fällig am', 'Échéance', 'Vencimiento', 'Vencimento', 'Scadenza', '期日', '到期日', '기한'],
  expires: ['Gültig bis', 'Expire le', 'Vence', 'Vence em', 'Scade il', '有効期限', '到期日', '만료일'],
  date: ['Datum', 'Date', 'Fecha', 'Data', 'Data', '日付', '日期', '날짜'],
  hours: ['Stunden', 'Heures', 'Horas', 'Horas', 'Ore', '時間', '工时', '시간'],
  worker: ['Mitarbeiter', 'Salarié', 'Trabajador', 'Trabalhador', 'Lavoratore', '作業員', '工人', '근로자'],
  classification: ['Lohngruppe', 'Qualification', 'Categoría', 'Função', 'Qualifica', '職種', '工种', '직종'],
  trade: ['Gewerk', 'Corps d’état', 'Oficio', 'Disciplina', 'Categoria', '職種', '专业', '공종'],
  rate: ['Satz', 'Taux', 'Tarifa', 'Taxa', 'Tariffa', '単価', '费率', '단가'],
  owed: ['Geschuldet', 'Dû', 'Adeudado', 'Devido', 'Dovuto', '不足額', '应补', '미지급액'],
  shortfall: ['Fehlbetrag', 'Manque', 'Faltante', 'Falta', 'Ammanco', '不足額', '差额', '부족액'],
  exposure: ['Risiko', 'Exposition', 'Exposición', 'Exposição', 'Esposizione', 'リスク額', '风险金额', '위험 금액'],
  equipment: ['Gerät', 'Engin', 'Equipo', 'Equipamento', 'Macchina', '機械', '设备', '장비'],
  permit: ['Genehmigung', 'Permis', 'Licencia', 'Alvará', 'Permesso', '許可', '许可证', '허가'],
  trade_package: ['Vergabepaket', 'Lot', 'Paquete', 'Pacote', 'Pacchetto', 'パッケージ', '招标包', '패키지'],
  bidder: ['Bieter', 'Soumissionnaire', 'Licitador', 'Proponente', 'Offerente', '入札者', '投标人', '입찰자'],
  technician: ['Techniker', 'Technicien', 'Técnico', 'Técnico', 'Tecnico', '技術者', '技术员', '기사'],
  jurisdiction: ['Steuergebiet', 'Juridiction', 'Jurisdicción', 'Jurisdição', 'Giurisdizione', '課税地域', '辖区', '과세지역'],
  item: ['Position', 'Élément', 'Elemento', 'Item', 'Voce', '項目', '项目', '항목'],
  document: ['Dokument', 'Document', 'Documento', 'Documento', 'Documento', '書類', '文件', '서류'],
  month: ['Monat', 'Mois', 'Mes', 'Mês', 'Mese', '月', '月份', '월'],
  net: ['Netto', 'Net', 'Neto', 'Líquido', 'Netto', '差引', '净额', '순액'],
  margin: ['Marge', 'Marge', 'Margen', 'Margem', 'Margine', '利益', '毛利', '이익'],
  margin_pct: ['Marge %', 'Marge %', 'Margen %', 'Margem %', 'Margine %', '利益率 %', '毛利率 %', '이익률 %'],
};

// Labels an agent passes for its own column headings.
const LABELS = {
  'Over billed': ['Überfakturiert', 'Surfacturé', 'Facturado de más', 'Faturado a mais', 'Fatturato in eccesso', '過大請求', '超额开票', '과다 청구'],
  'Under billed': ['Unterfakturiert', 'Sous-facturé', 'Facturado de menos', 'Faturado a menos', 'Fatturato in difetto', '過少請求', '开票不足', '과소 청구'],
};

/** Every catalog, for the tests: { name: { english: [8 translations] } }. */
export const REPORT_TEXT = Object.freeze({ page: PAGE, titles: TITLES, sections: SECTIONS, columns: COLUMNS, labels: LABELS });
export const ENGLISH_NOTE = 'The summary line, finding texts, codes and the notes under Limits are in English. This page was translated by Claude; a native speaker has not reviewed it yet.';

const DATE = /\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?/;
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : vars[k]));

/** Find a phrase in a catalog: as written, then with its date as {d}, then with its numbers as {1} {2}. */
function lookup(cat, s) {
  if (Object.hasOwn(cat, s)) return [cat[s], {}];
  const d = DATE.exec(s);
  if (d) { const k = s.replace(DATE, '{d}'); if (Object.hasOwn(cat, k)) return [cat[k], { d: d[0] }]; }
  const vars = {}; let n = 0; const k = s.replace(/\d+(?:\.\d+)?/g, (m) => { vars[++n] = m; return `{${n}}`; });
  return n && Object.hasOwn(cat, k) ? [cat[k], vars] : [null, {}];
}

/**
 * Text for a report page in one language:
 *   t.page(s), t.title(s), t.section(s)  a phrase, translated when the catalog has it;
 *   t.column(name, label)                a column heading (label is the agent's own, when it set one);
 *   t.english                            true when nothing is translated.
 */
export function reportText(lang) {
  const l = normLang(lang); const i = ORDER.indexOf(l);
  const tr = (cat) => (s) => { if (i < 0) return s; const [hit, vars] = lookup(cat, String(s)); return hit && hit[i] ? fill(hit[i], vars) : s; };
  const label = tr(LABELS);
  return {
    lang: l, english: i < 0, page: tr(PAGE), title: tr(TITLES), section: tr(SECTIONS),
    column: (name, own) => { if (own) return label(own); if (i >= 0 && Object.hasOwn(COLUMNS, name) && COLUMNS[name][i]) return COLUMNS[name][i]; return String(name).replace(/_/g, ' '); },
  };
}
