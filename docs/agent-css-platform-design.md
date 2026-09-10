# AI CSS 플랫폼 — 기술 계약과 검증 설계

상태: 제품 요구사항에 대응하는 설계와 첫 로컬 평가기 구현 계약.
제품 범위는 `agent-css-platform-product.md`를 따른다. practice/transfer 평가와
list/prepare/check/report 및 reflect/pair/measure/compare/demo를 구현했다.
경험 전달·비용 스냅샷·비교 보고서의 상세 계약은 `agent-learning-loop.md`를 따른다.
자동 커리큘럼과 실제 모델 실행은 포함하지 않는다.

## 시스템 경계

정적 배포물에는 HTML/CSS 안내·보고서, Markdown 사용법과 JSON 과제·예제 데이터만 둔다. 기존 웹사이트의
Kinetic Editorial 방향과 영어 UI를 유지한다. 로컬 Node 실행 도구는 저장소에서
사용하며 정적 배포 디렉터리에 JS 실행 파일을 복사하지 않는다.
도구가 정적 배포물을 실행 서버로 바꾸거나 사용자 계정을 생성하지 않는다.

에이전트는 로컬 실행 도구를 호출한다. 도구는 별도 임시 프로필의 Chromium에서
과제 HTML과 제출 CSS를 검사한다. 브라우저 제어·관측 코드는 검사 도구에 속하며
과제나 배포된 웹페이지에 script, 이벤트 핸들러를 삽입하지 않는다.
개인 브라우저 프로필, 인증 세션, 쿠키를 사용하지 않는다. 외부 네트워크 요청은
검사 실행에서 차단하며 다운로드·외부 리소스에 의존하는 제출물을 허용하지 않는다.

## 구성 제안

- `public/learn/`: 정적 안내, 카탈로그, 버전 있는 과제 데이터와 HTML/CSS starter.
- `scripts/agent-css/`: 과제 계약 검사, 준비, Chromium 평가, 결과 기록 도구.
- `tests/agent-css/`: 정상/오류 제출물과 계약·브라우저 회귀 검사.
- 사용자가 지정한 로컬 작업 폴더: CSS 제출물과 실행/회고 기록. 정적 배포 제외.
- 기존 `src/state.css`와 게임 검증은 그대로 유지한다.

첫 과제/실행 도구/검사는 위 public/scripts/tests 경로에 구현했다.
사용자 작업 폴더는 prepare 시 새로 만든다. 보호 경로·package.json·배포 설정은 변경하지 않는다.

## 도메인과 데이터 계약

관계형 저장소가 없으므로 ERD는 사용하지 않는다.

| 개념 | 최소 필드와 규칙 |
|---|---|
| Catalog | schemaVersion, tasks. 중복 ID·잘못된 상대 경로를 거부한다. |
| Task | id, version, track, mode(practice/transfer), objective, assets, allowedEdits, evaluatorVersion, checks. 버전과 콘텐츠 지문으로 식별한다. |
| Workspace | taskId/version/hash, 고정 입력 지문, submission.css. 준비 시 기존 작업을 덮어쓰지 않는다. |
| Attempt | 고유 id, taskHash, submissionHash, evaluatorVersion, browserVersion, 입력 기록, 종료 상태, 케이스 결과. |
| Feedback | caseId, inputState, expected, observed, errorCode. 정답 CSS는 제공하지 않는다. |
| Reflection | attemptId, 에이전트가 기록한 실패 원인·규칙·다음 적용 계획. 자기 보고이며 검증 근거가 아니다. |
| EvaluationRun | 문제 묶음/version, 모델 정보(없으면 unknown), 한도, 노출 조건, 첫 제출 ID, 후속 제출 ID. |

콘텐츠 지문은 동일 입력 재현을 돕는다. 로컬 사용자가 기록과 도구를 함께 바꿀 수
있으므로 서명된 증명이나 정답 은닉이라고 표현하지 않는다.

### 첫 트랙의 checks 계약 — A3/A7

첫 평가기 `relay-visibility-v1`은 checkbox 입력, Boolean 조건, 고정 DOM 출력의
표시/숨김, 네이티브 reset만 지원한다. radio·회전 각도·픽셀 이미지·레이아웃 평가는
다른 평가기 버전의 범위이며 미지원 계약을 조용히 해석하지 않는다.
과제의 checks는 다음과 같은 데이터이며 실행 가능한 JS나 셸 코드는 허용하지 않는다.

```json
{
  "form": "#exercise",
  "controls": [
    {"name": "A", "selector": "#input-a", "type": "checkbox", "defaultChecked": false},
    {"name": "B", "selector": "#input-b", "type": "checkbox", "defaultChecked": false}
  ],
  "outputs": [
    {"selector": "#lamp-on", "when": {"op": "AND", "args": [{"input": "A"}, {"input": "B"}]},
     "observable": "rendered-or-display-none"}
  ],
  "cases": "all-boolean-combinations",
  "reset": {"selector": "#reset", "expectedChecked": {"A": false, "B": false}},
  "observation": {"viewport": {"width": 800, "height": 600}, "stableSamples": 3, "intervalMs": 100, "timeoutMs": 2000}
}
```

control 이름은 중복할 수 없으며 초기 트랙 상한은 5개다. 각 선택자는 과제 내부에서
정확히 하나의 고정 요소와 일치해야 한다. 입력은 지정 form에 속해야 하며
원본 checked/defaultChecked가 선언한 기본값과 일치해야 한다.
`when`은 등록된 input 참조와 AND/OR/XOR(2개 인수), NOT(1개 인수)만 허용하는
유한 AST다. 알 수 없는 참조·연산·인수 수·과도한 중첩은 invalid-task다.
평가기 자체가 2^n개 상태를 생성하고 기대값을 계산하므로 제출물이나 과제 작성자가
일부 쉬운 입력 조합만 선택할 수 없다. 데이터만 바꾸는 새 Relay 과제로 A7을 검증한다.

on은 출력과 모든 조상의 display가 none이 아니고 visibility가 visible이며
누적 opacity가 1이고 고정 viewport 안에 양의 면적이 있는 상태로 정의한다.
off는 지정 출력 자체의 display가 none인 상태다. 투명도·색상·화면 밖 이동으로
숨기는 제출물은 이 트랙의 off로 인정하지 않는다. 이 기준은 시각적 정답 전체나
가림/접근성 전체를 증명하지 않으며 출력 내용과 과제 chrome은 고정한다.
입력과 reset 버튼은 표시되고 enabled이며 클릭 중심의 hit target이 자신 또는
연결 label이어야 한다. 실제 조작 후 checked 변경도 확인한다.

관측은 위 설정으로 세 번 연속 일치해야 하며 한도를 넘으면
failed/unstable-observation으로 기록한다. CSS animation/transition은 이 트랙에서
허용하지 않고 발견하면 invalid-submission으로 거부한다. 브라우저 응답 자체가
없는 경우는 environment-error다. 초기 기본 상태와 각 조합의 검사 후 실제 reset
버튼을 활성화해 expectedChecked와 해당 Boolean 출력이 복원되는지도 검사한다.
reset으로 복원되지 않는 입력·출력은 독립 reset 실패로 보고한다.

## 실행과 실패 경계

구현한 명령은 `node scripts/agent-css/main.mjs`의 list, prepare TASK NEW_DIRECTORY,
check DIRECTORY, report DIRECTORY다. check는 작업 폴더의 submission.css를 읽으며 임의의 셸 명령을
과제 데이터에 넣어 실행시키는 확장 기능은 두지 않는다.

1. 버전/파일 경로/허용 수정/고정 파일 지문을 검사한다. 작업 폴더 밖 경로와
   심볼릭 링크, 잘못된 메타데이터는 명시적으로 거부한다.
2. 제출물 바이트를 복사하고 지문을 기록한다. 검사 중 원본 수정은 현재 시도에 반영하지 않는다.
3. 독립 실행 폴더·브라우저 프로필을 만든다. 개인 Chrome 세션에 연결하지 않는다.
4. checks 계약에 따라 각 입력 상태를 네이티브 폼 조작으로 설정하고 실제 계산 스타일 및 조작 가능성을 확인한다.
   에이전트 CSS 선택자를 재해석해 승패를 판정하지 않는다.
5. 검사기 소유의 Boolean 기대값과 비교한다. HTML은 고정, 상태 설정 성공을 검사하며
   입력을 숨기거나 덮어서 성공 화면만 보이게 하는 제출물도 실패시킨다.
   각 조합 뒤 reset 버튼을 실제 활성화해 입력 기본값과 기본 출력의 복원을 확인한다.
6. JSON 결과와 선택적 회고를 시도별로 저장한다. 단일 작업 폴더는 한 실행만 쓰며
   충돌은 거부한다. 다른 작업 폴더 실행은 독립적이다.
7. 결과는 임시 파일 후 원자적 이름 변경으로 게시한다. 시간 초과 시 프로세스를 종료하고
   종료 확인 후 프로필을 정리한다. 종료 미확인과 불완전 기록을 성공으로 취급하지 않는다.

시도 상태는 passed, failed, invalid-submission, invalid-task, environment-error, interrupted를 구분한다.
준비/파일 무결성/잠금 오류는 command-error이며 검사 시도로 오인하지 않는다.
실행은 60초, 개별 브라우저 요청은 4초, CSS는 32KiB, 작업 폴더당 시도는 1,000회로 제한한다.
v1은 CSS escape도 거부한다. CSSOM에 선언이 하나도 없는 비어 있지 않은 제출물은
invalid-css다. 그 밖의 구문 오류는 브라우저 오류 복구가 적용되며 완전한 문법 lint는 아니다.
고정 클릭 순서에서 focus를 checked 대신 사용한 오답이 통과하는 재현을 확인했다.
이를 막기 위해 첫 Boolean 트랙의 제출 CSS는 focus/focus-visible/focus-within,
hover/active/target/target-within/visited/link/any-link/user-valid/user-invalid 선택자를
거부한다. 원문 검사와 CSSOM 선택자 검사에 적용한다. 고정 HTML의 포커스 스타일은 유지한다.
이는 상호작용 상태 스타일 전반을 평가하는 트랙이 아니라는 명시적 제한이다.
결과는 최대 65개 상태/초기화 케이스이며 출력 수는 8개, 입력 수는 5개 이하로 제한한다.
노출 데이터는 과제와 제출물에 한정하고 자격 증명·전체 대화는 기록하지 않는다.

## 연습과 전이 평가

연습은 상태별 상세 피드백을 제공한다. 평가는 첫 제출을 별도 기록하고 이후 보고서에서 최신 제출과 구분한다.
각 check는 즉시 상세 피드백을 제공한다. 평가 기록에는 이미 본 문제, 답안 열람, 재시도 여부를 표시한다.
완전한 비밀 평가를 보장하지 않는다. 정적 배포와 로컬 검사 도구는 공개 자산이다.

새 입력 이름·DOM 구조·조건 조합을 사용해 기존 풀이 복사와 조건 구현을 구분한다.
가능하면 연습 전·후의 대응 묶음 순서를 교차하고 동일 실행 한도를 적용한다.
문제 묶음 결과와 에이전트 자기 보고를 분리한다. 모델 정보·사용량이 없으면 unknown이다.

## 집중 검증과 구현 순서

1. Chromium 평가 최소 검증: AND 한 과제의 정답과 always-on, 부분 조건, 뒤에서
   덮어쓴 cascade, 숨긴 입력, 외부 URL, 잘못된 CSS, 브라우저 부재·종료를 구분한다.
   reset 정답, 가려진 reset 버튼, 잘못 선언한 기본값, reset 후 stale 출력,
   비안정 관측과 미지원 animation을 별도 재현해 A3를 검증한다.
   제어 API를 실제로 실행하기 전 지원된다고 보고하지 않는다.
2. 공통 계약: 버전 불일치, 지문 변경, 경로 탈출, 심볼릭 링크, 중복 ID,
   기존 폴더 덮어쓰기, 동시 기록, 중단 시 불완전 결과를 재현한다.
3. 첫 플랫폼 구간: 카탈로그→준비→실패→수정→성공→기록→새 문제의 첫 제출.
   잘못된 상태가 정확히 피드백에 남는지 확인한다.
4. 확장: 새 Relay 과제를 데이터만 추가해 같은 절차로 수행한다.
5. 정적 생산물: 새 안내/데이터가 포함되고 JS/WASM·외부 런타임 자원이 없는지,
   내부 링크와 320px/키보드 안내 접근이 유지되는지 검사한다.
6. `node scripts/verify.mjs`와 독립 구현 검토 후 현재 범위의 결과를 기록한다.

과제 데이터 계약은 배포와 로컬 도구가 공유하는 통합 경계다. 과제/검사 의미를
바꾸면 버전을 올리고 이전 결과를 새 버전 결과로 재해석하지 않는다.
첫 구현에서 파일 저장만 쓰며 DB·계정·배포 설정·새 패키지 도입은 포함하지 않는다.

## 브라우저 제어 근거

로컬 도구는 Chrome DevTools Protocol의
[Target](https://chromedevtools.github.io/devtools-protocol/tot/Target/) 세션과
[Input](https://chromedevtools.github.io/devtools-protocol/tot/Input/) 입력 전달을 사용한다.
동작 근거는 실제 회귀 검사로 남기며, API 문서만으로 지원 환경이나 정답을 인증하지 않는다.
