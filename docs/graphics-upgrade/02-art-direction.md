# Art direction — a crafted mathematical adventure

Purpose: make the first static upgraded scene look like a coherent finished game, before adding elaborate effects. Audience: students navigating with numbers, teachers checking mathematical clarity, and artists/engineers producing the upgrade. Read with the [asset audit](01-current-state-audit.md) and [implementation contracts](03-technical-architecture.md).

## Visual thesis

A sunlit, hand-painted meadow maze built from warm carved timber and dark stone, explored by AngleMaze's memorial protagonist. Amber geometric machinery marks the destination. Strong silhouettes, convincing material edges and restrained depth make the scene readable; soft broad grass shapes provide richness without visual irritation. UI panels resemble carefully made field instruments, with precise numeric readouts and clear controls.

Use Clash of Clans and Kingdom Rush only as quality benchmarks: immediate silhouette recognition, authored animation poses, consistent materials, legible environments and responsive feedback. Do not copy their characters, UI compositions, textures or effects. The supplied AngleMaze references govern identity. The small example scene supplies material and composition cues, not geometry to transplant into existing levels.

The Phase 1 change must be visible with animation paused: terrain, wall joins, hero presentation, golems, exit, checkpoint markers, shadows and UI must feel authored together. Swapping a zombie image while retaining the old framing, scale distortion and wall stamps does not pass.

## Color, lighting and visual hierarchy

Proposed tokens (starting values, validate actual contrast):

| Role | Starting color / treatment |
|---|---|
| Meadow base | #668A43; broad soft variations toward #7E9B50, sparse deep leaf accents |
| Timber | #B97635 midtone, #E4AD5D restrained edge light, #68432C shaded end grain |
| Stone / golem | #817D70 with #B0AA92 facets and sparse muted moss |
| Instrument surface / UI ink | #162A35 and #F5EAD3; warm off-white reading surface alternative |
| Primary action | #246B8C with off-white label; amber reserved for objective and selection accents |
| Objective / active bearing | #F5BB48; shape and text reinforce color |
| Error | #B8443E plus impact/label; success #2F7B57 plus check symbol |

Use one soft upper-left light for environment props; shadow projects lower-right. Character art uses diffuse near-overhead light so small residual rotation does not swing a strong painted highlight unrealistically. Ground shadows remain fixed in screen orientation. Outlines darken the material, avoiding thick pure-black outlines on every blade of grass.

Hierarchy: hero and bearing are primary; route boundaries and exit are next; enemies/checkpoints are distinct supporting landmarks; foliage is quiet context. Preserve all four even in grayscale. Reserve high local contrast for actors, wall contact edges and degree markings. No animated grass field, full-scene bloom, chromatic aberration or drifting camera during measurement.

Grass should use broad color masses, varied tuft sizes and low-contrast grain. Remove evenly repeated bright flowers from the base tile: place a few as stable separate accents. The supplied crop's hard repeat seams and regular flower repetition are visible in [the diagnostic](evidence/grass-reference-repeat.png). Reduce both before production acceptance. Compare calmness against current `grass.png`, which was deliberately softened in the latest baseline commit.

## Perspective and scale

Keep a consistent high top-down camera. Show shallow wall height through a bevel/fascia and contact shadow; do not introduce isometric coordinates or perspective projection. All actors share the same camera elevation and ground-plane scale. Full-body portrait art belongs in registration/menu or a character panel, not pasted directly onto the maze.

Maintain logical ground anchors separately from each drawing's silhouette. Initial hero canvas footprint stays within the current 64×64 visual envelope and ground anchor remains the 20×20 body's center. Golem silhouette fits within the current 100×100 envelope; exit base retains a 64×64 themed footprint. Preserve aspect ratio with transparent padding and pivot metadata, rather than stretching non-square files. These are initial constraints; refine silhouette scale against both existing levels without resizing bodies.

Wall ground-contact contours must make the existing 8-unit straight bodies and stepped diagonal footprints understandable. A broad bevel/shadow can imply height, but cannot look like an additional solid obstacle. Resolve this with the wall renderer's contact edge and selective occlusion treatment, not wider colliders. See architecture for joins.

## Memorial protagonist

Preserve the current black cap, its brim and proportions, orange shirt, recognizable skin/face, dark blue shorts, blue wrist bands, brown boot/backpack where the approved model includes them, and metallic prosthetic leg. The existing top-down file is the same image supplied in this task. Enhance its finish and animation while preserving identity; do not substitute an armored fantasy avatar.

The additional local Hero Design Sheet provides frontal/directional reference and visible limb anatomy. Its front view shows the prosthesis on the viewer's left, back view on the viewer's right. Confirm the authoritative anatomical side with the owner at the model-sheet gate. Never horizontally flip sprites: that swaps the prosthesis and other asymmetric features. Preserve the source's shirt graphic pending owner decisions, rather than independently replacing personal identity details.

Create one approved turnaround with front/back/left/right and a high top-down pose before animation. The top-down projection may partially hide the leg; do not enlarge it unnaturally to make every frame display it. Where visible, the metal segments and side remain consistent. No exaggerated injury animation; collision feedback is a brief startled/settling response. Victory is a warm, recognizable celebration.

## Stone golem and exit

Golem: compact shoulders, uneven stone facets, moss accents and small amber eyes; substantial mass conveyed by a slow compression/settle, not constant bouncing. Remove zombie colors and Minecraft block forms. Normalize all directional poses to one center and size. Initial golems stay stationary over their existing tiny wall-segment hazards. Their drawings do not receive new physics bodies; existing wall collision/life-loss behavior stays intact. The poster's patrol description is a concept, not implemented AI. Avoid chase/attack cues that imply new behavior, and keep the existing hazard footprint legible.

Exit: dark slate plate with warm amber rim, upward chevrons and readable EXIT label from `ExitNew.png`. Integrate its materials with the timber/stone world. Use a calm steady core plus a small halo, with motion reserved for gentle illumination and victory activation. Keep label and trigger distinguishable from checkpoint markers. Extract the plate from its presentation panel; do not ship the blue title card or baked white rectangle.

Checkpoints need their own small grounded beacon/check symbol with three readable states: unvisited, passed, active. Use shape/outline plus color. Keep their 30×30 triggers and positions unchanged.

## UI direction

Continue using real DOM controls. Give the maze the largest visual area; command controls are a compact, consistent instrument panel. Retain explicit Forward, Turn Left, Turn Right, quantity units, lives, elapsed time, moves, restart and navigation. Place distance and angle controls next to their result context. A new style must not hide the educational numbers.

Use the existing system font stack initially, with tabular numerals and 16px base input/body text. At most one future display font if approved and bundled with its license. Use a 4/8/12/16/24 spacing scale, 8–12px control radii, restrained bevels, visible focus ring, minimum 44×44 CSS-pixel touch targets. A button should have clear rest/hover/focus/pressed/disabled states; hover is not the only feedback. Dark and light themes share semantic tokens.

Desktop: maze beside a compact command panel; short status strip. Phone: maze above large movement/turn buttons and the existing quantity pad. Do not paint essential labels into art. Maintain registration, instructions, menu, completion/replay and admin readability while updating shared CSS; avoid unintended global selector changes. Canvas feedback type should match the UI's tone instead of default monospace win/error slabs.

## Production-ready asset specification

All paths below are **proposed**, not present yet. Authoring masters should be kept outside the shipped `public/` directory, with an agreed archive location and provenance; runtime exports belong under `frontend/public/assets/premium/`. Retain current assets as a baseline until the visual gate passes.

| Export group | Proposed runtime specification | Preparation needed |
|---|---|---|
| Grass | Standalone opaque 512×512 PNG, tiled at a deliberate world scale; optional second compatible variation | Reconstruct edges in both axes, remove panel/text, low-frequency variation, 3×3 and half-offset QA; do not distort rectangular source into a square |
| Wall kit | Repeating 128×32 strip, start/end caps and join/post pieces on transparent frames | Redraw grain to repeat along length; remove rivets from repeating interior; consistent top-down lighting; cap variants for short segments |
| Player static | 128×128 transparent padded frame, ground pivot metadata; same identity | Clean edges, consistent scale; no cosmetic identity replacement |
| Player animation | 128×128 logical frame cells; 8 bearing sets × (4 idle + 8 walk + 3 impact + 6 victory) as a budget, packed into ≤2048×2048 pages | Author every anatomical side; preserve pivots; validate directional consistency; extra frame sets may be deferred after primary cycle |
| Golem | 192×192 cells, 4–8 directional idle sets, initially 4 frames each | Extract only as reference; redraw silhouettes and coherent stone segmentation; no fake patrol loop |
| Exit | 128×128 padded base plus separate transparent emissive ring/highlight | Rebuild crisp chevrons/text, remove presentation frame, isolate glow from base alpha |
| Props / checkpoint | 64–128px frames, transparent; explicit footprint/decorative classification | Extract/repaint with matched light, clean alpha, normalize size/pivot |
| UI symbols | Small original SVGs or coherent DOM/CSS icons | One line/shape language; avoid dependence on platform emoji rendering |

PNG is the initial runtime format for sprites/alpha and terrain, JSON for atlas frame metadata, SVG for DOM icons. WebP variants are optional after actual decode/alpha testing. Do not add a runtime conversion library. Repeating grass/wood textures stay standalone; atlases hold actors, props and effects. Use 2px edge extrusion plus 2px packing gaps and preserve source-size/trim offsets. Transparent padding must not move the ground pivot. Keep a manifest with key, file, source hash, pixel dimensions, display scale, pivot, animation frames, source/provenance, license and approval status.

## Art acceptance gate

Review a complete Level 1 and Level 2 scene at 800×600, phone scale and grayscale, with all animation frozen. Player, traversable corridors, four golems, exit, checkpoints and bearing remain readable. No presentation labels/backgrounds, alpha fringes or visible texture seams; no uniform scale distortion; no decorative obstacle suggests a false collision. Compare full-body and in-game protagonist together for owner approval. Reject an isolated asset upgrade if it clashes with the rest of the scene.

Final budgets and runtime tests are defined once in [quality gates](05-implementation-roadmap.md); this document sets artistic intent, not measured performance.
