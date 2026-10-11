# 작업: 초현실주의 개념 영상(surrealism-film) 만들기 — 르네상스 개념 영상과 같은 수준으로

너는 이 저장소(순수 HTML/CSS/JS, 빌드 도구·외부 라이브러리 없음)의 졸업 전시용 인터랙티브 웹을 다루는 시니어 크리에이티브 개발자다.
르네상스(`renaissance.html`)와 낭만주의(`romanticism.html`)에는 "대표작 → 클릭 → 개념 설명 영상(캔버스 애니메이션 + 직접 조작 + 실제 작품 비교)"이 있는데, **초현실주의에는 개념 영상이 없다.** 르네상스 영상과 같은 구조·완성도로 초현실주의 개념 영상을 만들고 허브에 연결하라.

## 0. 비용 규칙 (반드시 지킬 것)
- 아래 "읽을 파일"만 읽는다. 저장소 전체 탐색, 큰 파일 통독 금지(`style.css` 4천 줄, `script.js` 1.7천 줄은 지정 범위만).
- 다른 사조 파일과 공용 모듈(`concept-finale.*`, `artwork-intro.*`, `concept-compare.*`, `movement-frame.css`, `home-button.css`)은 **수정하지 말고 그대로 재사용**한다(아래 명시된 한 줄 추가 제외).
- 설계 → 한 번에 구현 → 검증 1회 → 발견된 문제만 수정. 불필요한 리팩터링·주석 장황화 금지. 주변 코드의 주석 밀도와 스타일(짧은 영어 주석, 압축된 JS)을 따른다.

## 1. 읽을 파일
- 템플릿(전부 읽기): `renaissance.html`, `renaissance.js`, `renaissance-model.js`, `renaissance.css`
- 공용 모듈(전부 읽기, 수정 금지): `artwork-intro.js`, `artwork-intro.css`, `concept-compare.js`, `movement-frame.css`, `home-button.css`
- 부분만: `concept-compare.css`(앞 20줄), `art-audio.js`(palettes 객체), `index.html` 80–140줄, `script.js` 768–1000줄, `surreal-memory.js` 1–25줄, `style.css`에서 `.surreal-finale-frame` 검색 결과만

## 2. 만들 것
새 파일: `surrealism-film.html`, `surrealism-film.js`, `surrealism-film.css`, (도형·기하 헬퍼가 길어지면) `surrealism-scene.js`
수정: `index.html`, `script.js`, `style.css`(끝에 블록 추가), `surreal-memory.js`(번호 2곳), `art-audio.js`(팔레트 1줄)

### 페이지 구조 — `renaissance.html`과 동일한 골격
- `<body class="visual-experience artwork-intro">`, `<main id="atelier">` 그리드(마스트헤드 / `#stage` 캔버스 / 하단 `footer.film-footer`).
- 홈: `<button class="home-icon" id="goHome" aria-label="메인으로" title="메인으로">`(집 SVG는 renaissance.html 것 그대로), 허브 iframe 안에서는 숨김(`window.parent !== window`).
- 마스트헤드: `header.masthead.mf-head.mf-flow` → eyebrow `초현실주의 / 01`, `h1#sceneTitle.mf-title`, `#sceneStatus.sr-only`.
- 첫 화면(대표작): `section#paintingIntro`(`data-reveal="#stage" data-focus=".48 .74"`), 이미지 `morning.png`(마그리트 「빛의 제국」, 1120×1450), 캡션 `빛의 제국 <span>르네 마그리트 · 1956</span><small class="painting-invitation">그림을 클릭해 들어가기</small>`. `artwork-intro.js`가 확대 전환을 처리하고, 영상은 `artwork-intro:enter`(처음으로 되감고 정지) / `artwork-intro:entered`(재생 시작) 이벤트만 듣는다. renaissance.js의 처리 방식을 그대로 따른다.
- 비교 패널: `figure.art-compare` + `concept-compare.js`(르네상스와 같은 마크업·클래스).
- 푸터: 재생/일시정지, 다시 재생, 시간, 챕터 버튼 01–05, 오른쪽 끝 다음 링크 `꿈의 방으로 ↗`.
- 스크립트 순서: `concept-compare.js` → (`surrealism-scene.js`) → `surrealism-film.js` → `artwork-intro.js`. `art-audio.js?v=4`는 head에서 defer로 로드하고, 캔버스 id는 `filmScene`으로 한다(BGM이 `film-playing` 클래스로 켜짐).
- 모든 로컬 CSS/JS 링크에 `?v=1` 같은 버전 쿼리를 붙인다.

### 시각 톤
「빛의 제국」에서 가져온 팔레트: 낮 하늘 #8fb4dc, 구름 크림 #f3eadb, 밤 잉크 #0d1220, 가로등 금빛 #f2c46b, 본문 #efe6d4. 세리프 제목은 'Nanum Myeongjo'(movement-frame.css가 처리). 장면은 렌더링이 아니라 **르네상스 영상처럼 선과 면의 도식**(얇은 금색/크림 선, 반투명 면, 라벨 칩)으로 명료하게 그린다.

## 3. 스토리보드 — 5챕터, 각 장마다 "보이는 변화 1개 + 직접 조작 1개"
타임라인 단위 0–50, 재생 속도는 르네상스처럼 SPEED 상수 사용(약 1.3). `renaissance-model.js`처럼 `state(t, manual)`가 모든 수치를 내는 순수 함수(`surrealism-scene.js` 또는 js 상단)로 두고, 렌더는 state만 그린다. 챕터 경계에서 값이 튀지 않게 smooth 보간한다.

| # | 시간 | 제목(`#sceneTitle`) | 보이는 변화 | 직접 조작 | 힌트(캡션) |
|---|---|---|---|---|---|
| 1 | 0–10 | 현실 아래에는 꿈이 흐른다 | 창이 있는 방(선 도식)이 수면 같은 가로선 위에 떠 있다. 선 아래로 같은 방이 거꾸로 비치는데, 비친 물건들이 바뀌어 있다(시계가 녹아내림, 열쇠가 새가 됨). 라벨: 위 `의식 — 보이는 현실`, 아래 `무의식 — 꿈`. 마지막에 카메라가 선 아래로 가라앉는다. | 경계선을 위아래로 드래그해 의식/무의식의 비율 바꾸기 | 경계선을 위아래로 움직여 보세요 |
| 2 | 10–20 | 익숙한 물건을 낯선 자리에 — 데페이즈망 | 방 안의 평범한 사과가 점점 커져 방을 가득 채운다. 크기와 자리만 바뀌었는데 공간이 낯설어진다. 라벨: `같은 사과`, `다른 크기`. | 사과를 드래그(가로 = 크기, 위치 이동) | 사과를 끌어 크기를 바꿔 보세요 |
| 3 | 20–30 | 함께 있을 수 없는 것이 함께 있다 | 화면 위는 낮 하늘(구름), 아래는 가로등이 켜진 밤 거리. 둘을 나누는 지평선이 움직이며 낮과 밤이 한 화면에 공존한다. 허브의 '낮과 밤이 공존하는 방'과 이어지는 장이다. | 지평선(또는 해·달)을 드래그해 낮과 밤의 경계 옮기기 | 지평선을 끌어 낮과 밤을 섞어 보세요 |
| 4 | 30–40 | 우연이 그림을 그린다 — 자동기술과 '우아한 시체' | ① 펜 끝이 멈추지 않고 저절로 선을 그리는 자동기술 궤적. ② 세 칸으로 접힌 종이에 머리·몸통·다리를 서로 보지 않고 그려 이어 붙이듯, 세 띠가 슬롯처럼 돌다 멈추며 낯선 존재가 된다. 이미지: `s1.png`–`s6.png`(머리), `s7.png`–`s12.png`(몸통), `s13.png`–`s18.png`(다리) — 허브의 '우아한 시체 놀이'와 같은 가로형 PNG이고, 연결점이 가로 중앙에 있다(`surreal-image-prompts.md` 참고). 실제 크기는 로드 후 naturalWidth/Height로 맞춘다. | 클릭(또는 스페이스가 아닌 Enter)으로 세 띠 다시 돌리기 | 눌러서 우연을 다시 불러 보세요 |
| 5 | 40–50 | 꿈을 사진처럼 정확하게 그리다 | 앞 장들의 도식이 하나의 장면으로 모이고, 선 위에 명암이 입혀지며 실제 「빛의 제국」(`morning.png`)으로 바뀐다(르네상스가 마지막에 「아테네 학당」으로 바뀌는 것과 같은 역할). 안내 라벨: `낮의 하늘`, `밤의 거리`, `켜진 가로등`. 마지막에 잠시 멈춘다. | 없음(감상) | 불가능한 장면을 가장 사실적으로 |

챕터 설명(`#sceneStatus` / 캡션용, 그대로 써도 된다):
1. 프로이트는 꿈을 무의식으로 가는 길이라 했다. 1924년 브르통의 「초현실주의 선언」은 그 꿈의 세계를 그림으로 끌어올렸다.
2. 물건은 그대로인데 자리와 크기만 바꿔도 세계가 낯설어진다. 마그리트는 이 방법으로 익숙한 것을 처음 보는 것처럼 만들었다.
3. 낮의 하늘 아래 밤의 거리. 현실에서는 함께 있을 수 없는 두 시간이 한 화면에 나란히 놓인다.
4. 생각보다 손이 먼저 움직이는 자동기술, 서로 보지 않고 이어 그리는 '우아한 시체' 놀이. 초현실주의자들은 우연 속에서 무의식을 찾았다.
5. 초현실주의의 꿈은 흐릿하지 않다. 불가능한 장면을 사진처럼 정확하게 그려서, 우리는 그 꿈을 믿게 된다.

### 실제 작품 비교 패널 (concept-compare, 르네상스처럼 장 경계에서 멈춤 + 마우스를 올리면 대기)
반드시 저장소에 있는 이미지만 쓴다(달리·마그리트 등은 저작권 보호 중이므로 새 이미지를 내려받지 말 것).
- 1장 끝: `보이는 풍경 vs 마음속 풍경` — `romanticism-wanderer.jpg`(안개 바다 위의 방랑자 · 카스파르 다비드 프리드리히 · 1818, 태그 `눈으로 본 자연`) vs `gallery/surrealism-tanguy-indefinite-divisibility.jpg`(무한한 가분성 · 이브 탕기 · 1942, 태그 `무의식이 지은 풍경`)
- 3장 끝: `한 화면 속 두 시간` — `morning.png` 한 장. 위쪽 하늘에 `낮`, 아래 거리에 `밤`이라는 spot-label을 붙이고(renaissance/romanticism의 `.spot`/`.spot-label` 방식), 아래에 compare-note `하늘은 정오, 거리는 한밤중.`

## 4. 허브 연결 (초현실주의 방은 iframe이 아니라 허브 DOM 안에 있다)
현재 흐름: 허브 SURREALISM 카드 → `.impressionism-site`(낮과 밤의 방, 당김줄, 음악) → `우아한 시체 놀이 →`(surreal-memory.js) / 홈 → `.surreal-finale-frame`(대표작 갤러리) → 홈 → 메인.
목표 흐름: 카드 → **영상 iframe(대표작 첫 화면 → 개념 영상)** → `꿈의 방으로 ↗` → 기존 방(음악 시작) → 기존 흐름 그대로.

- `index.html`: `.surreal-finale-frame` 바로 앞에 `<iframe class="surreal-film-frame" title="초현실주의 — 꿈을 그리는 법" hidden></iframe>`를 둔다. 방 eyebrow `초현실주의 / 01`은 `/ 02`로 바꾼다.
- `surreal-memory.js`: `초현실주의 / 02` → `/ 03`, `초현실주의 · 02 / 우아한 시체` → `· 03`.
- `style.css` 끝: `.surreal-film-frame`을 `.surreal-finale-frame`과 같은 방식(absolute, inset 0, border 0, z-index는 finale보다 1 낮게)으로 두고 `[hidden]`일 때 숨긴다. `body.showing-surreal-film`일 때 `.pull-chain`, `.memory-enter`를 숨긴다.
- `script.js`:
  - 초현실주의(`interaction.site === 'impressionism'`)가 열릴 때(revealInteraction) 영상 프레임 `src = 'surrealism-film.html?v=1'`, `hidden = false`, body에 `showing-surreal-film`을 추가한다.
  - 열림 직후 방 음악을 켜는 부분(openInteraction 4단계의 `isMusicPlaying = true; updateScenes();`)은 영상이 떠 있는 동안 건너뛴다.
  - `window.addEventListener('message')`에서 `event.source === surrealFilmFrame.contentWindow && event.data?.type === 'surrealism:enter-room'`이면 프레임을 숨기고 src를 `about:blank`로, 클래스를 제거한 뒤 그때 `isMusicPlaying = true; updateScenes();`을 실행한다. **file://에서는 origin이 'null'이므로 origin 검사 대신 event.source로 확인한다.**
  - `showFinale` / `closeInteraction`에서 영상 프레임을 숨기고 `about:blank`로 비운다(다시 열면 첫 화면부터).
- 영상 페이지: `꿈의 방으로 ↗`를 누르면, 프레임 안이면 `parent.postMessage({ type: 'surrealism:enter-room' }, '*')`, 단독으로 열렸으면 `index.html`로 이동한다. 마지막 장이 끝나면 이 링크를 강조한다(르네상스 `.film-ended`처럼).
- `art-audio.js` 팔레트에 `'surrealism-film': [45, 52, 59, 60, 64, 71]`을 추가한다.

## 5. 반드시 지킬 제약
- **file://로 열어도 동작해야 한다**(사용자는 index.html을 파일로 연다): fetch/XHR 금지, 캔버스 `getImageData`/`toDataURL` 금지(그리기만 허용), iframe 간 통신은 위 메시지 방식만 쓴다.
- 오른쪽 위는 허브의 홈·소리 정사각형(각 40px) 자리다. 마스트헤드는 `mf-head`의 오른쪽 여백을 지키고, 캔버스 라벨이나 버튼이 그 자리나 서로를 가리지 않게 한다. 모든 버튼·텍스트는 서로 겹치지 않는다(1920×1080, 1440×900, 390×844).
- `prefers-reduced-motion`: 자동재생 없이 각 장의 핵심 프레임을 보여준다(renaissance.js의 landing 처리처럼).
- Space 재생/정지(첫 화면에서는 무시), 좌우 방향키는 직접 조작 대상에 포커스가 있을 때만, 탭이 숨으면 정지, `#stage`에 ResizeObserver를 건다.
- UI 문구는 전부 한국어로 쓴다. 이미지는 저장소에 있는 것만 쓴다.

## 6. 완료 기준 (직접 확인 후 보고)
1. `surrealism-film.html`을 단독으로 열면: 「빛의 제국」 첫 화면 → 클릭 시 확대되며 영상 시작 → 5장이 순서대로 재생되고, 장마다 조작이 동작하며, 비교 패널 두 번 멈춤 → 「빛의 제국」으로 마무리 → 링크 강조.
2. 허브(index.html, file://)에서 SURREALISM 카드: 영상 첫 화면 → 영상 → `꿈의 방으로` → 방이 보이고 음악 재생 → `우아한 시체 놀이`(eyebrow 03) → 홈 → 갤러리 → 홈 → 메인. 다시 열면 영상 첫 화면부터.
3. 콘솔 오류 0. 위 세 크기에서 겹침 없음.
4. 검증은 헤드리스 Edge 스크린샷으로 장마다 1장씩만 찍는다. 예:
   `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --window-size=1440,900 --virtual-time-budget=8000 --screenshot=out.png "file:///C:/Users/user/Documents/GitHub/my-interactive-page/surrealism-film.html"`
5. 마지막 보고는 바꾼 파일 목록과, 확인한 것/확인하지 못한 것만 짧게 적는다. 커밋은 하지 않는다.
