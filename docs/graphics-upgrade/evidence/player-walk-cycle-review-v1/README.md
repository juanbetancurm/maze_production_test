# Player walk-cycle review v1

This is a four-frame, 2×2 transparent walk-cycle candidate derived from the supplied overhead protagonist. The static idle pose remains the exact supplied `player-topdown-v2.png`; the cycle only changes the arms and shoulders subtly. The atlas is 1254×1254 pixels (627×627 per frame), displayed at the existing 72×68 world size and played at 8 fps. The current facing conversion remains unchanged.

The cycle is a visual state only. `MazeScene` still owns movement, the visible sprite is copied from the physics body's coordinates, and collision geometry remains measured from the static player art. The normal-mapped idle texture uses Light2D; the painted walk atlas uses Phaser's default WebGL pipeline, then restores Light2D when movement ends. Reduced motion keeps the static art during movement.

## Actual-scene validation

The focused Chrome run passed `level1-themed-inventory`, `player-topdown-motion`, `player-topdown-motion-canvas`, and `reduced-motion-policy`, with no browser errors. During WebGL movement, the trace reported texture `premium.player.walk`, animation `anglemaze.player.walk`, frame 1 of 4, unchanged logical angle, and zero player-sprite/body position delta. At rest, the static `player` texture, idle state, and Light2D pipeline were restored. A separate Canvas run also switched to the walk sheet and restored the static texture. Under reduced motion, a movement command was accepted while the player retained the static texture and no walk animation.

Evidence: [runtime trace](runtime-trace.json), [moving scene capture](scene-player-topdown-motion.png), [level 1 scene capture](scene-level1-desktop.png).

This browser run used headless Chrome with WebGL/SwiftShader. It validates state and alignment, not physical-GPU or mobile performance. The cycle is an implementation candidate and still needs the owner's visual review before being treated as final art.
