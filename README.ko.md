# Fairbuild

*Claude가 번역했으며 원어민 검토는 아직입니다. 영문 [README](README.md)가 기준입니다.*

종합건설사, 전문건설사, 설비·서비스 업체의 백오피스를 위한 작은 MCP 에이전트 30개. 각 에이전트는 **한 가지 일**만 맡아, Procore, Sage 100/300 Contractor, Foundation, Vista, QuickBooks, Buildertrend, ServiceTitan 또는 스프레드시트에서 이미 내보내는 파일을 읽고 여러분의 컴퓨터에 보고서와 초안을 씁니다.

MIT 라이선스 · Node 20 이상 · 로컬 파일만 · 자격 증명 불필요 · 가상의 테스트 데이터만

고정 가격 도입 서비스: [Fairbuild](https://fair-agents.com/fairbuild.html).

## 사용해 보기

```bash
npx -y rhine-of-costcodes demo
npx -y platte-of-releases demo
```

각 에이전트에는 가상 파일로 실행하는 `demo`, 자체 테스트 케이스가 있는 `eval`, MCP 서버(`<agent> mcp --root <폴더>`)가 있습니다.

## 에이전트 목록

**공사 원가, 기성 청구, 현금:** [`rhine-of-costcodes`](packages/rhine-of-costcodes), [`danube-of-commitments`](packages/danube-of-commitments), [`volga-of-changeorders`](packages/volga-of-changeorders), [`seine-of-values`](packages/seine-of-values), [`thames-of-payapps`](packages/thames-of-payapps), [`loire-of-wip`](packages/loire-of-wip), [`nile-of-retainage`](packages/nile-of-retainage), [`lena-of-cashflow`](packages/lena-of-cashflow)

**협력업체와 매입채무:** [`yangtze-of-matching`](packages/yangtze-of-matching), [`platte-of-releases`](packages/platte-of-releases), [`tiber-of-waivers`](packages/tiber-of-waivers), [`ganges-of-insurance`](packages/ganges-of-insurance), [`indus-of-compliance`](packages/indus-of-compliance), [`orinoco-of-vendors`](packages/orinoco-of-vendors), [`brazos-of-backcharges`](packages/brazos-of-backcharges), [`mekong-of-tickets`](packages/mekong-of-tickets), [`tagus-of-salestax`](packages/tagus-of-salestax)

**급여와 노무:** [`hudson-of-wages`](packages/hudson-of-wages), [`yukon-of-fringes`](packages/yukon-of-fringes), [`columbia-of-timecards`](packages/columbia-of-timecards)

**현장, 인허가, 준공:** [`colorado-of-equipment`](packages/colorado-of-equipment), [`zambezi-of-permits`](packages/zambezi-of-permits), [`oder-of-submittals`](packages/oder-of-submittals), [`elbe-of-punchlists`](packages/elbe-of-punchlists), [`douro-of-closeout`](packages/douro-of-closeout)

**입찰, 수주잔고, 보증:** [`congo-of-bids`](packages/congo-of-bids), [`limpopo-of-backlog`](packages/limpopo-of-backlog), [`vistula-of-bonding`](packages/vistula-of-bonding)

**서비스와 하자보수:** [`shannon-of-service`](packages/shannon-of-service), [`murray-of-warranty`](packages/murray-of-warranty)

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
