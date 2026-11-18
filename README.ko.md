# Fairbuild

*Claude가 번역했으며 원어민 검토는 아직입니다. 영문 [README](README.md)가 기준입니다.*

종합건설사, 전문건설사, 설비·서비스 업체의 백오피스를 위한 작은 MCP 에이전트 30개. 각 에이전트는 **한 가지 일**만 맡아, Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan 또는 스프레드시트에서 이미 내보내는 파일을 읽고 여러분의 컴퓨터에 보고서와 초안을 씁니다.

MIT 라이선스 · Node 20 이상 · 로컬 파일만 · 자격 증명 불필요 · 가상의 테스트 데이터만

고정 가격 도입 서비스: [Fairbuild](https://fair-agents.com/fairbuild.html).

## 사용해 보기

```bash
npx -y fairbuild-job-cost demo
npx -y fairbuild-payment-release demo
```

각 에이전트에는 가상 파일로 실행하는 `demo`, 자체 테스트 케이스가 있는 `eval`, MCP 서버(`<agent> mcp --root <폴더>`)가 있습니다.

## 에이전트 목록

**공사 원가, 기성 청구, 현금:** [`fairbuild-job-cost`](packages/fairbuild-job-cost), [`fairbuild-commitments`](packages/fairbuild-commitments), [`fairbuild-change-orders`](packages/fairbuild-change-orders), [`fairbuild-schedule-of-values`](packages/fairbuild-schedule-of-values), [`fairbuild-pay-applications`](packages/fairbuild-pay-applications), [`fairbuild-wip-schedule`](packages/fairbuild-wip-schedule), [`fairbuild-retainage`](packages/fairbuild-retainage), [`fairbuild-job-cash-flow`](packages/fairbuild-job-cash-flow)

**협력업체와 매입채무:** [`fairbuild-three-way-match`](packages/fairbuild-three-way-match), [`fairbuild-payment-release`](packages/fairbuild-payment-release), [`fairbuild-lien-waivers`](packages/fairbuild-lien-waivers), [`fairbuild-insurance-certificates`](packages/fairbuild-insurance-certificates), [`fairbuild-sub-compliance`](packages/fairbuild-sub-compliance), [`fairbuild-duplicate-vendors`](packages/fairbuild-duplicate-vendors), [`fairbuild-backcharges`](packages/fairbuild-backcharges), [`fairbuild-delivery-tickets`](packages/fairbuild-delivery-tickets), [`fairbuild-sales-tax`](packages/fairbuild-sales-tax)

**급여와 노무:** [`fairbuild-certified-payroll`](packages/fairbuild-certified-payroll), [`fairbuild-union-fringes`](packages/fairbuild-union-fringes), [`fairbuild-timecards`](packages/fairbuild-timecards)

**현장, 인허가, 준공:** [`fairbuild-equipment-rentals`](packages/fairbuild-equipment-rentals), [`fairbuild-permits`](packages/fairbuild-permits), [`fairbuild-submittals`](packages/fairbuild-submittals), [`fairbuild-punch-lists`](packages/fairbuild-punch-lists), [`fairbuild-closeout`](packages/fairbuild-closeout)

**입찰, 수주잔고, 보증:** [`fairbuild-bid-leveling`](packages/fairbuild-bid-leveling), [`fairbuild-backlog`](packages/fairbuild-backlog), [`fairbuild-bonding-capacity`](packages/fairbuild-bonding-capacity)

**서비스와 하자보수:** [`fairbuild-service-tickets`](packages/fairbuild-service-tickets), [`fairbuild-warranty-callbacks`](packages/fairbuild-warranty-callbacks)

## 안전을 지키는 방식

- **로컬 파일만.** 회계·공사관리 시스템, 은행, 보증회사, 보험사, 행정 포털에 로그인하지 않으며 네트워크 호출과 원격 측정도 없습니다.
- **지급, 신고, 발송은 사람이 합니다.** 지급, 유치권 등록이나 해제, 기성 청구서 제출이나 승인, 전표 기표, 이메일 발송은 모두 거부됩니다. 초안은 Auto 모드에서도 이름이 지정된 담당자의 클릭을 기다립니다.
- **모델이 보기 전에 마스킹.** 작업자 이름과 ID, 사회보장번호, 건축주 연락처는 가명(`PERSON-3f9a1c2e`)이 됩니다.
- **숨은 규칙 대신 설정.** 유보금 비율, 통지 기한, 기준값, 임금 단가는 여러분이 관리하는 설정 파일에서 읽습니다.
- **모든 것을 기록.** 모든 호출은 해시로 연결된 감사 로그에 남습니다.

## 한계

법률, 세무, 보험, 보증, 회계 자문이 아닙니다. 각 내보내기의 열 이름은 아직 실제 내보내기 파일로 검증되지 않았으며, 첫 도입 때 함께 확인합니다. 9개 언어의 파일(인코딩, 숫자, 날짜, 열 이름)을 읽으며 결과와 CSV는 영어로 유지되고, 보고서 페이지는 9개 언어 모두로 쓸 수 있습니다(`--lang`).

## 라이선스

MIT. [LICENSE](LICENSE)를 참고하세요.
