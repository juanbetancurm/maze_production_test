# Viewport Fit and Vector Math Overlay Validation

Validated 2026-11-10 in the local React game route with Chrome 157.0.8103.39 and Node 24.18.0. The harness used its in-memory API and synthetic team state with the repository's real Phaser scene; it did not connect to production services.

## Implementation verified

- Phaser's logical playfield remains 800×600 (4:3). The SVG layer shares the exact displayed bounds of the game canvas and ignores pointer input.
- The level title, player coordinates, Protractor dial, labels, ticks, directional needle, and turn arc are browser-rendered SVG, so they remain sharp at DPR 1 and 2.
- Phaser remains authoritative for player position, facing, turning, and Protractor fade state. The Protractor center matched the player at `(740, 60)` in the edge-position test. The 0° tick points right; 90° points up.
- Desktop scale is limited by both available row width and `viewport height − 62px`. Short desktop windows compact the existing controls to keep the board and controls inside the viewport.
- When the player and Protractor are at the upper-right, the coordinate badge moves to the upper-left. The dial uses fewer labels only when it shrinks near maze edges.

## Desktop and laptop results

All six desktop/laptop cases kept the complete board and controls within the viewport and preserved the canvas aspect ratio.

| Viewport | Displayed board | Board bottom | Document height |
|---|---:|---:|---:|
| 1352×557 | 660×495 | 538px | 557px |
| 1280×720 | 877×658 | 716px | 720px |
| 1366×768 | 941×706 | 764px | 768px |
| 1315×755 | 924×693 | 751px | 755px |
| 1440×900 | 1112×834 | 892px | 900px |
| 1920×1080, DPR 2 | 1200×900 | 958px | 1080px |

Tablet and phone keep the whole board visible before the controls, which remain vertically scrollable: 768×1024 displays a 721×541 board; 360×800 displays 328×246; 844×390 displays 413×310. None of these cases introduced horizontal overflow.

## Validation

- Full browser regression: 37 scenarios passed, including movement, turns, wall collisions and respawn, golem collision, checkpoints, victory, restart, reduced motion, React route recovery, Protractor fade, resize alignment, and responsive layouts.
- Responsive matrix: 9 viewports passed; 0 failing cases.
- Browser errors: 0. Request interception errors: 0.
- `npm run lint`: passed.
- `npm run build`: passed, including 21 unit tests and the premium asset size gate.

## Screenshots

[Short desktop](react-desktop-short-1352x557.png) · [Compact laptop](react-compact-laptop-1280x720.png) · [Laptop with Protractor](react-laptop-1366x768.png) · [DPR 2 desktop](react-desktop-dpr2-1920x1080.png) · [Tablet](react-tablet-768x1024.png) · [Phone](react-phone-360x800.png)
