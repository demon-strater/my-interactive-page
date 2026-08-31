# Hand Interaction Specification

이 프로젝트의 손 입력은 `perception → gesture → target/intent → action → feedback` 순서로 처리한다.

## Interaction grammar

| Context | Target | Commit | Manipulation | Release/result |
|---|---|---|---|---|
| Home carousel | 현재 전면 카드 또는 120ms 안정된 카드 | pinch enter | 열린 손 좌우 이동으로 탐색 | pinch release로 카드 진입 |
| Button/link | 56px magnetism + 120ms hover | pinch enter | 14px 미만 유지 | pinch release로 click |
| Canvas/object | canvas hover 120ms | pinch enter | 14px 이상 이동 | pointer release, click 억제 |
| Scroll effect | 지원 작품/canvas hover | pinch enter | pinch를 유지하며 수직 이동 | release 후 손을 복귀하고 재시작 |
| Back | 미술사조 내부라는 context | fist candidate | 700ms 유지 | 홈으로 복귀 |

## Thresholds

- Hand range enter/exit: normalized visible size `0.16 / 0.13`
- Palm winding minimum: `0.008`
- Palm calibration: 펼친 손바닥 `12 frames`
- Pinch enter/exit ratio: `0.38 / 0.55`
- Drag threshold: `14px`
- Hover dwell: `120ms`
- Target magnetism: `56px`
- Tracking-loss grace: `180ms`
- Fist/back hold: `700ms`

핀치는 enter보다 exit 기준을 크게 둬 경계에서 상태가 반복 전환되지 않게 한다. 클릭은 pinch enter가 아니라 release에서 실행하며, hold 중 14px 이상 이동했다면 drag로 분류해 click을 억제한다.

## Feedback states

- 기본 원: 추적 중
- 브론즈 외곽 고리: target 안정화 완료
- 작은 브론즈 원: committed/pinched
- 각진 작은 커서: dragging
- 점선 점멸: tracking uncertain, 180ms 동안 interaction 보존
- 카메라 status: calibration, range, palm direction, commit, drag, back progress

## Safety and recovery

- 순간 tracking loss에는 즉시 release하지 않고 180ms 유예한다.
- 장기 loss, 거리 이탈, 손등 감지 시 active pointer를 `cancelled` 처리한다.
- 손바닥/손등 판별은 카메라 시작 시 펼친 손바닥으로 보정한다.
- 마우스, 터치, 휠 입력은 계속 사용할 수 있으며 손 입력만 강제하지 않는다.
