# Return Guardian MVP 제품/기술 설계서

## 1. 제품 포지셔닝

Return Guardian은 구매 후 반품기한, 환불 가능 기간, 보증기간, 영수증 위치를 놓쳐 손해 보는 문제를 해결하는 로컬 우선 구매 기억 앱이다.

이 앱은 가계부, 쇼핑 기록 앱, 클라우드 영수증 보관함이 아니다. 첫 MVP의 역할은 명확하다. 사용자가 구매 정보를 직접 등록하고, 영수증 파일을 붙이고, 돈을 아낄 수 있는 마감일을 놓치지 않게 보여준다.

### README 첫 문단

```md
# Return Guardian

Never miss a return window or warranty again.

Local-first, privacy-friendly purchase memory for receipts, returns, and warranties. Return Guardian helps you manually record purchases, attach receipt images or PDFs, and see return and warranty deadlines before they cost you money. The MVP runs as a local web app and keeps purchase information and receipt files on the user's device.
```

### 핵심 메시지

- 사용자가 반품, 환불, 보증 마감일을 놓쳐 생기는 손해를 줄인다.
- 구매 정보와 영수증은 기본적으로 사용자 기기에만 저장한다.
- 첫 MVP는 자동화보다 수동 등록과 확실한 마감일 관리에 집중한다.
- 샘플 데이터를 포함해 설치 직후에도 대시보드의 가치를 바로 이해할 수 있게 한다.

### 초기 범위

- 로컬 웹앱
- 향후 PWA 대응이 쉬운 구조
- 초기에는 앱스토어/플레이스토어 배포 제외
- 서버 업로드 없음
- 구매정보, 영수증 메타데이터, 첨부 파일은 로컬 저장

### MVP에서 제외할 것

- OCR 자동 인식
- 클라우드 동기화
- 회원가입/로그인
- 이메일 영수증 자동 수집
- 쇼핑몰 API 연동
- 캘린더 자동 동기화
- 로컬 암호화 저장
- 제품 매뉴얼, 시리얼, 수리 이력 관리

위 항목들은 v1 이후 후보로 둔다. 첫 릴리스에서는 범위를 줄여 완성도를 높이는 것이 중요하다.

## 2. 추천 기술 구조

### 추천 스택

- 앱: Vite + React + TypeScript
- 스타일: CSS Modules 또는 일반 CSS + 디자인 토큰
- 로컬 데이터베이스: IndexedDB, 가능하면 Dexie 또는 가벼운 typed wrapper 사용
- 테스트: Vitest, Testing Library, Playwright
- 배포 형태: 정적 프론트엔드 앱

### 설계 원칙

- Local-first: 로그인이나 서버 없이 동작해야 한다.
- Date-first: 구매 데이터는 결국 마감일 중심으로 보여야 한다.
- Manual-first: OCR은 보조 기능이지 MVP의 전제 조건이 아니다.
- Exportable: 사용자는 언제든 CSV/JSON으로 데이터를 내보낼 수 있어야 한다.
- PWA-ready: 라우팅과 데이터 구조가 향후 PWA 전환을 방해하지 않아야 한다.

## 3. 정보 구조

### 주요 내비게이션

- 대시보드: 오늘 할 일, 이번 주 만료, 보증 곧 만료
- 구매 목록: 전체 구매 내역 검색/필터
- 구매 등록: 수동 입력
- 구매 상세: 영수증, 마감일, 보증, 메모, 첨부파일 관리
- 내보내기: CSV/JSON export
- 설정: 샘플 데이터, 저장 상태, 향후 PWA/프라이버시 설정

### 추천 라우트

- `/` - 첫 화면/대시보드
- `/purchases` - 전체 구매 목록
- `/purchases/new` - 구매 수동 등록
- `/purchases/:purchaseId` - 구매 상세
- `/purchases/:purchaseId/edit` - 구매 수정
- `/exports` - CSV/JSON 내보내기
- `/settings` - 설정

### 화면별 핵심 데이터

- 대시보드: purchase, reminder, 계산된 마감일 그룹
- 등록/수정: purchase, receipt, attachment
- 상세: purchase, receipt, attachment, reminder timeline
- 내보내기: purchases, receipts, attachment metadata, reminders, export metadata

## 4. 화면 구성

## 4.1 첫 화면: 대시보드

첫 화면은 랜딩페이지가 아니라 실제로 바로 쓰는 제품 화면이어야 한다.

### 상단 영역

- 앱 이름: Return Guardian
- 주요 버튼: 구매 등록
- 보조 버튼: 내보내기, 설정
- 로컬 저장 표시: "Local data" 또는 "이 기기에 저장됨"

### 대시보드 섹션

1. 오늘 해야 할 일
   - 반품 마감일, 환불 마감일, 커스텀 리마인더가 오늘인 항목
   - 이미 지났지만 아직 처리하지 않은 항목은 "지남" 영역으로 표시

2. 이번 주 만료
   - 오늘 이후 7일 이내 반품/환불 마감일이 있는 항목
   - 가까운 날짜 순 정렬

3. 보증 곧 만료
   - 기본 기준은 30일 이내 보증 만료
   - v1 이후 사용자가 기준일을 바꿀 수 있게 확장 가능

4. 최근 구매
   - 최근 등록 또는 구매일 기준 5개
   - 긴급 마감일이 없을 때도 앱이 비어 보이지 않게 한다.

5. 빈 상태
   - 사용자 데이터가 없으면 샘플 데이터와 구매 등록 버튼 표시
   - 샘플 데이터는 반드시 샘플임을 명확히 표시

### 카드 표시 항목

- 제품명
- 구매처
- 금액
- 구매일
- 마감 상태 배지: "오늘 반품 마감", "3일 남음", "보증 21일 남음", "만료됨"
- 영수증 첨부 여부와 첨부 파일 개수

## 4.2 등록 화면

등록 화면은 완벽한 입력보다 빠른 수동 등록을 우선해야 한다.

### 필수 입력

- 제품명
- 구매일
- 구매처
- 금액

### 선택 입력

- 반품 마감일
- 환불 마감일
- 보증 만료일
- 영수증 이미지/PDF
- 카테고리
- 메모
- 태그

### 검증 규칙

- 제품명은 비워둘 수 없다.
- 금액은 0 이상이어야 한다.
- 통화는 사용자 지역 또는 샘플 기준 `USD`를 기본값으로 둔다.
- 구매일은 유효한 날짜여야 한다.
- 반품 마감일이나 보증 만료일이 구매일보다 빠르면 경고한다.
- 첨부파일은 MVP에서 이미지 또는 PDF만 허용한다.

### 저장 동작

- purchase, receipt, attachment metadata, reminder를 가능한 한 하나의 앱 레벨 트랜잭션처럼 저장한다.
- 파일 저장에 실패하면 입력값을 보존하고 복구 가능한 오류를 보여준다.
- 저장 성공 후 구매 상세 화면으로 이동한다.

## 4.3 상세 화면

상세 화면은 하나의 구매에 대한 원본 관리 화면이다.

### 주요 내용

- 제품명, 구매처, 금액, 구매일
- 반품 마감 상태
- 환불 마감 상태
- 보증 만료 상태
- 영수증 미리보기
  - 이미지: 화면 내 미리보기
  - PDF: 파일명, 용량, 열기/다운로드 버튼
- 메모
- 리마인더 타임라인

### 주요 액션

- 구매 정보 수정
- 영수증 첨부/교체
- 이 구매 항목 JSON 내보내기
- 리마인더 완료 또는 숨김 처리
- 구매 항목 삭제

삭제는 반드시 확인 절차가 필요하다. 로컬 전용 앱에서는 사용자가 export하지 않은 데이터가 삭제 후 복구되지 않을 수 있기 때문이다.

## 4.4 만료 대시보드

MVP에서는 첫 화면 안에 포함해도 되지만, 계산 로직은 별도로 분리해야 한다. 나중에 독립 화면으로 확장하기 쉽기 때문이다.

### 그룹

- 지남: 오늘보다 이전 마감일이며 아직 처리하지 않은 항목
- 오늘: 마감일이 오늘인 항목
- 이번 주: 오늘 이후 7일 이내 마감
- 반품 가능: 반품 마감일이 있고 아직 지나지 않은 항목
- 보증 곧 만료: 보증 만료일이 30일 이내인 항목
- 마감일 없음: 반품/환불/보증 날짜가 없는 항목

### 정렬 기준

1. 지남
2. 오늘
3. 가까운 반품/환불 마감일
4. 가까운 보증 만료일
5. 최근 구매일

### 날짜 규칙

- 날짜 전용 필드는 로컬 날짜로 처리한다.
- 마감일은 해당 로컬 날짜의 끝까지 유효한 것으로 본다.
- 날짜 전용 값은 `YYYY-MM-DD`로 저장한다.
- `createdAt`, `updatedAt` 같은 이벤트 시각은 ISO 8601 문자열로 저장한다.

## 5. 데이터 모델

모든 사용자가 만든 레코드는 안정적인 UUID를 사용한다. 로컬 앱은 나중에 마이그레이션이 중요해지므로 schemaVersion을 명시한다.

```ts
type ISODate = string; // YYYY-MM-DD
type ISODateTime = string; // ISO 8601 timestamp
type CurrencyCode = string; // ISO 4217, e.g. USD, KRW

type PurchaseStatus = "active" | "archived" | "deleted";
type AttachmentKind = "receipt-image" | "receipt-pdf" | "manual" | "other";
type ReminderKind =
  | "return-deadline"
  | "refund-deadline"
  | "warranty-expiration"
  | "receipt-missing"
  | "custom";
type ReminderStatus = "active" | "dismissed" | "done";
type ExportFormat = "csv" | "json";

interface Purchase {
  id: string;
  schemaVersion: 1;
  productName: string;
  merchantName: string;
  purchaseDate: ISODate;
  amountCents: number;
  currency: CurrencyCode;
  returnDeadline?: ISODate;
  refundDeadline?: ISODate;
  warrantyExpiresOn?: ISODate;
  category?: string;
  tags: string[];
  notes?: string;
  receiptIds: string[];
  attachmentIds: string[];
  reminderIds: string[];
  status: PurchaseStatus;
  isSample: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Receipt {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  merchantName?: string;
  receiptDate?: ISODate;
  totalAmountCents?: number;
  currency?: CurrencyCode;
  attachmentId?: string;
  source: "manual-entry" | "file-attachment" | "sample";
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface Attachment {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  receiptId?: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string;
  previewBlobKey?: string;
  checksumSha256?: string;
  createdAt: ISODateTime;
}

interface Reminder {
  id: string;
  schemaVersion: 1;
  purchaseId: string;
  kind: ReminderKind;
  title: string;
  dueDate: ISODate;
  leadDays: number;
  status: ReminderStatus;
  dismissedAt?: ISODateTime;
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface ExportRecord {
  id: string;
  schemaVersion: 1;
  format: ExportFormat;
  appVersion: string;
  exportedAt: ISODateTime;
  purchaseCount: number;
  receiptCount: number;
  attachmentMetadataCount: number;
  reminderCount: number;
  includesAttachmentFiles: false;
  fileName: string;
}
```

### IndexedDB 저장소

- `purchases`: `id` 기준 저장
- `receipts`: `id` 기준 저장, `purchaseId` 인덱스
- `attachments`: `id` 기준 저장, `purchaseId` 인덱스
- `attachmentBlobs`: `blobKey` 기준 Blob 저장
- `reminders`: `id` 기준 저장, `purchaseId`, `dueDate`, `status` 인덱스
- `exports`: `id` 기준 저장
- `settings`: 설정명 기준 저장

## 6. 저장 방식 추천

### localStorage vs IndexedDB

| 기준 | localStorage | IndexedDB |
|---|---|---|
| 데이터 구조 | 문자열 key-value 중심 | 구조화된 객체, 인덱스, Blob 저장 가능 |
| 파일 첨부 | 부적합, base64 변환 필요 | Blob 저장 가능 |
| 용량 | 작고 브라우저별 차이 큼 | 상대적으로 큰 브라우저 관리 quota |
| 성능 | 동기식이라 UI를 막을 수 있음 | 비동기식 |
| 검색/조회 | 직접 파싱 후 필터링 필요 | 인덱스 기반 조회 가능 |
| 마이그레이션 | 수동 관리가 취약 | 버전 업그레이드 구조 가능 |
| MVP 난이도 | 텍스트만 있으면 단순 | 약간 복잡하지만 앱 요구사항에 적합 |

### 선택

MVP의 기본 저장소는 IndexedDB를 선택한다.

핵심 이유는 영수증 이미지/PDF 첨부 때문이다. `localStorage`에 파일을 저장하려면 base64 문자열로 바꿔야 하고, 용량 낭비와 UI blocking 문제가 생긴다. IndexedDB는 구매 레코드, 마감일 인덱스, 첨부 Blob 저장에 모두 적합하다.

### localStorage 사용 범위

`localStorage`는 비핵심 설정에만 사용한다.

- 마지막으로 선택한 대시보드 탭
- 테마 설정
- 샘플 데이터 삽입 여부

구매 기록이나 첨부 파일은 `localStorage`에 저장하지 않는다.

## 7. 샘플 데이터 구조

샘플 데이터는 대시보드의 핵심 상태를 모두 보여줘야 한다. 예: 반품 임박, 보증 임박, 영수증 있음, 영수증 없음, 이미 지난 항목.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-02T00:00:00.000Z",
  "purchases": [
    {
      "id": "sample-headphones",
      "productName": "Wireless Noise Canceling Headphones",
      "merchantName": "Best Buy",
      "purchaseDate": "2026-05-28",
      "amountCents": 24999,
      "currency": "USD",
      "returnDeadline": "2026-06-11",
      "warrantyExpiresOn": "2027-05-28",
      "category": "Electronics",
      "tags": ["audio", "sample"],
      "notes": "Check fit before return window closes.",
      "receiptIds": ["sample-receipt-headphones"],
      "attachmentIds": ["sample-attachment-headphones"],
      "reminderIds": ["sample-reminder-headphones-return"],
      "status": "active",
      "isSample": true
    },
    {
      "id": "sample-coffee-maker",
      "productName": "Compact Coffee Maker",
      "merchantName": "Target",
      "purchaseDate": "2025-06-20",
      "amountCents": 8999,
      "currency": "USD",
      "returnDeadline": "2025-07-20",
      "warrantyExpiresOn": "2026-06-20",
      "category": "Kitchen",
      "tags": ["appliance", "sample"],
      "notes": "Warranty expires soon.",
      "receiptIds": [],
      "attachmentIds": [],
      "reminderIds": ["sample-reminder-coffee-warranty"],
      "status": "active",
      "isSample": true
    }
  ],
  "receipts": [
    {
      "id": "sample-receipt-headphones",
      "purchaseId": "sample-headphones",
      "merchantName": "Best Buy",
      "receiptDate": "2026-05-28",
      "totalAmountCents": 24999,
      "currency": "USD",
      "attachmentId": "sample-attachment-headphones",
      "source": "sample"
    }
  ],
  "attachments": [
    {
      "id": "sample-attachment-headphones",
      "purchaseId": "sample-headphones",
      "receiptId": "sample-receipt-headphones",
      "kind": "receipt-pdf",
      "fileName": "sample-headphones-receipt.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 180000,
      "blobKey": "sample/blob/headphones-receipt"
    }
  ],
  "reminders": [
    {
      "id": "sample-reminder-headphones-return",
      "purchaseId": "sample-headphones",
      "kind": "return-deadline",
      "title": "Return window closes",
      "dueDate": "2026-06-11",
      "leadDays": 7,
      "status": "active"
    },
    {
      "id": "sample-reminder-coffee-warranty",
      "purchaseId": "sample-coffee-maker",
      "kind": "warranty-expiration",
      "title": "Warranty expires",
      "dueDate": "2026-06-20",
      "leadDays": 30,
      "status": "active"
    }
  ]
}
```

샘플 ID는 deterministic하게 유지하는 편이 좋다. 그래야 샘플 데이터 삭제/초기화를 안정적으로 구현할 수 있다.

## 8. CSV/JSON Export 포맷

## 8.1 CSV Export

CSV는 스프레드시트에서 바로 열 수 있어야 한다. 한 행은 하나의 purchase를 의미하고, 바이너리 첨부파일은 포함하지 않는다.

### 파일명

`return-guardian-purchases-YYYY-MM-DD.csv`

### 컬럼

```csv
id,product_name,merchant_name,purchase_date,amount,currency,return_deadline,refund_deadline,warranty_expires_on,category,tags,notes,receipt_count,attachment_count,next_deadline,next_deadline_type,status,created_at,updated_at
```

### 예시 행

```csv
sample-headphones,"Wireless Noise Canceling Headphones","Best Buy",2026-05-28,249.99,USD,2026-06-11,,2027-05-28,Electronics,"audio;sample","Check fit before return window closes.",1,1,2026-06-11,return-deadline,active,2026-06-02T00:00:00.000Z,2026-06-02T00:00:00.000Z
```

### 규칙

- UTF-8 인코딩
- 따옴표는 두 번 반복해 escape
- 쉼표, 따옴표, 줄바꿈이 포함된 필드는 따옴표로 감싸기
- 내부 모델은 cents 단위, CSV는 major unit 소수로 표시
- 날짜는 ISO 형식 사용

## 8.2 JSON Export

JSON은 MVP에서 바이너리 첨부파일을 제외한 구조화 데이터 백업 역할을 한다.

### 파일명

`return-guardian-export-YYYY-MM-DD.json`

### 구조

```json
{
  "app": "return-guardian",
  "schemaVersion": 1,
  "exportedAt": "2026-06-02T12:00:00.000Z",
  "includesAttachmentFiles": false,
  "purchases": [],
  "receipts": [],
  "attachments": [],
  "reminders": [],
  "exports": [
    {
      "id": "export-uuid",
      "schemaVersion": 1,
      "format": "json",
      "appVersion": "0.1.0",
      "exportedAt": "2026-06-02T12:00:00.000Z",
      "purchaseCount": 2,
      "receiptCount": 1,
      "attachmentMetadataCount": 1,
      "reminderCount": 2,
      "includesAttachmentFiles": false,
      "fileName": "return-guardian-export-2026-06-02.json"
    }
  ]
}
```

### 첨부파일 export 판단

MVP에서는 첨부파일 메타데이터만 export한다. 영수증 이미지/PDF까지 포함한 zip 백업은 유용하지만, 패키징, 용량, 브라우저 메모리 관리가 추가로 필요하다. 기본 CSV/JSON export가 안정화된 뒤 v1+에서 구현한다.

## 9. 접근성/반응형 기준

### 접근성

- WCAG 2.2 AA 수준을 목표로 한다.
- 대시보드, 등록, 수정, 상세, export, 삭제 확인은 키보드만으로 조작 가능해야 한다.
- 모든 인터랙션 요소에는 보이는 focus 상태가 있어야 한다.
- 모든 입력 필드는 명시적인 label을 가져야 한다.
- 오류 메시지는 `aria-describedby`로 해당 필드와 연결한다.
- 아이콘만 있는 버튼보다 명확한 텍스트 라벨을 우선한다.
- 마감 임박 상태는 색상만으로 표현하지 않는다. "오늘 마감", "만료됨" 같은 텍스트를 함께 표시한다.
- 영수증 이미지는 의미 있는 alt 또는 파일 라벨을 제공한다.
- PDF는 파일명, 크기, 열기/다운로드 액션을 제공한다.
- 모달은 focus trap과 닫은 뒤 focus 복귀가 필요하다.
- reduced motion 설정을 존중한다.

### 반응형 기준

- 작은 모바일: 360px 이상
- 일반 모바일: 390px 이상
- 태블릿: 768px 이상
- 데스크톱: 1024px 이상

### 레이아웃 기준

- 모바일 대시보드는 단일 컬럼
- 모바일에서는 구매 등록 버튼 접근성이 좋아야 한다.
- 태블릿/데스크톱에서는 Today, This week, Warranty soon을 컬럼형으로 배치 가능
- 카드 안의 제품명, 구매처, 마감일 텍스트가 겹치면 안 된다.
- 등록 폼은 모바일 1컬럼, 데스크톱 2컬럼
- 첨부파일 미리보기는 가로 스크롤을 강제하지 않아야 한다.
- 테이블은 모바일에서 카드형 목록으로 전환한다.

## 10. 테스트 시나리오

### 도메인 로직 테스트

- 반품 마감일이 오늘인 구매가 Today에 표시된다.
- 반품 마감일이 내일인 구매가 This week에 표시된다.
- 반품 마감일이 8일 뒤인 구매는 This week에 표시되지 않는다.
- 보증 만료일이 30일 이내인 구매가 Warranty soon에 표시된다.
- 보증 만료일이 31일 뒤인 구매는 Warranty soon에 표시되지 않는다.
- 처리하지 않은 지난 마감일은 Overdue에 표시된다.
- 날짜 비교가 timezone 때문에 하루 밀리지 않는다.
- amountCents가 CSV의 소수 금액으로 정확히 변환된다.

### 저장소 테스트

- 첨부파일 없이 구매 생성
- 이미지 첨부 구매 생성
- PDF 첨부 구매 생성
- 구매 수정 시 첨부파일 참조가 유지됨
- 구매 삭제 시 관련 receipt, reminder, attachment metadata, attachment Blob 삭제
- 샘플 데이터 1회 삽입
- 샘플 데이터 초기화/삭제
- schema version 1 이후 마이그레이션 시 기존 데이터 보존

### UI 테스트

- 대시보드에서 구매 등록 후 상세 화면으로 이동
- 필수값 누락 시 오류 표시 및 첫 오류 필드로 focus 이동
- 상세 화면에서 이미지/PDF 영수증 표시
- 마감일 추가 후 대시보드 그룹이 갱신됨
- CSV/JSON export 버튼이 파일 다운로드를 생성함
- 구매 데이터가 없으면 빈 상태 표시
- 샘플 데이터에는 샘플 표시가 붙음

### Export 테스트

- CSV에 기대 컬럼이 포함됨
- CSV가 쉼표, 따옴표, 줄바꿈, 한글을 정상 escape함
- JSON에 schemaVersion과 export metadata가 포함됨
- MVP JSON export에는 binary Blob이 포함되지 않음
- 구매 항목이 0개여도 export 가능

### 접근성 테스트

- 키보드만으로 등록, 수정, 상세, export, 삭제 가능
- form field와 deadline badge에 스크린리더 라벨 존재
- 색 대비 확인
- 모달 닫기 후 focus 복귀

### 반응형 테스트

- 360px 모바일에서 가로 overflow 없음
- 390px 모바일에서 카드 내용이 읽힘
- 768px 태블릿에서 대시보드 그룹이 잘리지 않음
- 1024px 데스크톱에서 폼과 대시보드 간격이 안정적임

## 11. 구현 순서

### Phase 1: Scaffold

- Vite React TypeScript 앱 생성
- lint, format, Vitest, Testing Library, Playwright 추가
- 기본 라우트와 app shell 구성
- README에 제품 포지셔닝 문단 추가
- MIT license 추가

완료 기준: 로컬 dev server에서 대시보드 route가 보이고 테스트 명령이 실행된다.

### Phase 2: 도메인 모델

- TypeScript 모델 정의
- 로컬 날짜 비교 유틸 작성
- 마감일 그룹핑 함수 작성
- 샘플 데이터 생성기 작성
- 날짜/마감일 로직 unit test 작성

완료 기준: 순수 함수만으로 샘플 구매가 Today, This week, Warranty soon으로 분류된다.

### Phase 3: 로컬 데이터베이스

- IndexedDB wrapper 추가
- purchases, receipts, attachments, attachmentBlobs, reminders, exports, settings store 생성
- CRUD repository 함수 작성
- 샘플 데이터 삽입/초기화 작성

완료 기준: 브라우저 새로고침 후에도 샘플 및 수동 등록 데이터가 유지된다.

### Phase 4: 대시보드 UI

- Today, This week, Warranty soon, Recent purchases, empty/sample state 구현
- deadline badge와 attachment count 표시
- 반응형 카드 레이아웃 구현

완료 기준: IndexedDB의 실제 데이터가 대시보드에 표시되고 360px, 768px, desktop에서 깨지지 않는다.

### Phase 5: 등록/수정 플로우

- Add Purchase form 구현
- validation 구현
- purchase, receipt, attachment metadata, reminder 저장
- Edit Purchase form 구현

완료 기준: 사용자가 구매 항목과 마감일을 수동 등록/수정할 수 있다.

### Phase 6: 첨부파일

- 이미지/PDF picker 추가
- Blob을 IndexedDB에 저장
- 이미지 미리보기와 PDF 열기/다운로드 구현
- 첨부파일 교체/삭제 구현

완료 기준: 영수증 이미지/PDF가 새로고침 후에도 유지되고 삭제할 수 있다.

### Phase 7: 상세 화면

- 구매 상세 route 구현
- 마감 상태, 영수증 미리보기, 메모, 리마인더 타임라인 표시
- 삭제 확인 구현

완료 기준: 대시보드 카드에서 상세 화면으로 이동해 모든 정보를 확인할 수 있다.

### Phase 8: Export

- CSV export 구현
- JSON export 구현
- export metadata 저장
- export 테스트 추가

완료 기준: 서버 없이 유효한 CSV/JSON 파일을 다운로드할 수 있다.

### Phase 9: 품질 점검

- 접근성 점검
- Playwright 핵심 플로우 테스트
- 반응형 뷰포트 확인
- 빈 상태와 샘플 데이터 초기화 확인

완료 기준: 핵심 플로우가 자동 테스트와 수동 화면 확인을 통과한다.

### Phase 10: 첫 릴리스

- schema version 1 고정
- release notes 작성
- 스크린샷 또는 짧은 GIF 추가
- GitHub topics 등록
- `v0.1.0` 릴리스 생성

완료 기준: README, 저장 방식, 실행 방법, 테스트 방법, MVP 범위가 명확하게 설명된다.

## 12. 라이선스 추천

추천 라이선스는 MIT.

이유는 Return Guardian이 개인 생산성 성격의 로컬 앱이고, 첫 OSS 프로젝트로 contributor와 사용자 모두에게 진입 장벽이 낮아야 하기 때문이다. MIT는 단순하고 익숙하며, 작은 오픈소스 앱에 적합하다.

Apache-2.0도 가능하다. 특허권 명시가 중요해지는 프로젝트라면 Apache-2.0이 더 적합할 수 있다. 하지만 첫 릴리스 기본값은 MIT가 더 간결하다.

## 13. GitHub Topics

추천 topics:

- `return-guardian`
- `local-first`
- `privacy-first`
- `receipts`
- `warranty-tracker`
- `returns`
- `purchase-tracker`
- `pwa-ready`
- `indexeddb`
- `react`
- `typescript`
- `vite`
- `offline-first`
- `personal-data`
- `productivity`

## 14. OpenAI Codex for OSS 신청 관점 준비 항목

심사자가 이 프로젝트의 문제, 범위, 기술적 타당성, 오픈소스 적합성을 빠르게 이해할 수 있게 준비해야 한다.

### 저장소 준비

- public GitHub repository
- 명확한 README
  - "Never miss a return window or warranty again."
  - "Local-first, privacy-friendly purchase memory for receipts, returns, and warranties."
- MIT license
- 대시보드, 구매 등록, 상세, export 화면 스크린샷 또는 GIF
- `docs/architecture.md`: local-first 저장 구조와 데이터 모델
- `docs/roadmap.md`: MVP와 v1+ 구분
- `docs/privacy.md`: 서버 업로드 없음, 로컬 저장 설명
- 샘플 데이터 포함
- 실제 영수증, API key, secret을 커밋하지 않음

### Issue/기여 준비

- Good first issue 후보
  - 빈 대시보드 상태 구현
  - CSV export 테스트 추가
  - 샘플 데이터 reset 구현
  - 삭제 확인 모달 keyboard focus 개선
- 추천 label
  - `good first issue`
  - `accessibility`
  - `local-first`
  - `export`
  - `pwa`
  - `tests`
- `CONTRIBUTING.md`에 local setup, test commands, privacy expectations 작성
- 외부 기여자를 받을 계획이면 `CODE_OF_CONDUCT.md` 추가

### 기술적 근거

- README에 실행/테스트 명령 포함
- IndexedDB 선택 이유 기록
- schema versioning 전략 기록
- 알려진 제한사항 명시
  - OCR 없음
  - calendar export 없음
  - MVP JSON export에는 binary file 없음
  - 브라우저 저장소는 사용자 또는 브라우저 정책에 의해 삭제될 수 있음

### OSS 프로젝트로 적합한 이유

- 일상적이고 이해하기 쉬운 문제
- MVP 범위가 작고 명확함
- 기본값이 privacy-friendly
- 초보 기여자가 접근할 수 있는 작업이 많음
- OCR, PWA, 암호화, calendar export 등 자연스러운 로드맵이 있음

## 15. MVP 수락 기준

- 사용자가 구매 내역을 수동 등록할 수 있다.
- 제품명, 구매일, 구매처, 금액, 반품 마감일, 보증 만료일을 관리할 수 있다.
- 영수증 이미지/PDF를 첨부할 수 있다.
- 대시보드에 오늘 해야 할 일, 이번 주 만료, 보증 곧 만료가 표시된다.
- 구매 상세 화면을 열 수 있다.
- CSV export가 가능하다.
- JSON export가 가능하다.
- 샘플 데이터가 포함되고 샘플임을 구분할 수 있다.
- 브라우저 새로고침 후에도 데이터가 유지된다.
- 서버 업로드가 발생하지 않는다.
- 모바일, 태블릿, 데스크톱에서 사용할 수 있다.
- 주요 플로우를 키보드로 조작할 수 있다.
- README, license, topics, OSS 준비 문서가 준비된다.

## 16. v1 이후 로드맵

1. OCR로 영수증 날짜, 구매처, 금액 추출
2. 반품/보증 마감일 `.ics` 캘린더 export
3. service worker와 manifest를 포함한 PWA 설치 지원
4. 로컬 암호화 저장 옵션
5. 제품 매뉴얼, 시리얼 번호, 수리 이력 연결
6. 영수증 파일까지 포함하는 zip 백업 export
7. 기존 JSON export에서 import
8. 리마인더 기준일 사용자 설정

