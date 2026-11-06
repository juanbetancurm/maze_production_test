# Historical player atlas integration check — not approved for runtime

The owner later rejected this generated character art. The supplied `player.png` is the runtime source; this trace is retained only as a record of earlier movement testing.

Focused local test on 2026-11-03 used the real `MazeScene` in headless Chrome 156 with a v2 atlas candidate. It completed without browser errors; the character art was later rejected by the owner.

The sprite starts on frame 0, uses `premium.player.walk.loop` on the 150-world-unit forward command, and had advanced to frame 1 while moving. Its visible position exactly matched the authoritative body at the sampled movement frame (`x=130`, `y=60`); it completed at `x=210`, `y=60`, then stopped on neutral frame 0. The image was not used as a physics body and did not change the movement distance or collision inventory.

This check exposed that `MazeScene.update()` previously copied the sprite position before Arcade's body post-update. A five-unit one-frame lag appeared during 300 px/s movement. `MazeScene` now syncs the sprite and Protractor in a scene `POST_UPDATE` listener registered after Arcade Physics, while retaining the normal `update()` sync for idle frames. The listener is removed at shutdown. No velocity, timer, coordinates or collision rules changed.

`runtime-trace.json` records the before/moving/idle state. `scene-player-walk-atlas-motion.png` shows the visible animation. This is a focused movement check; see the latest integrated suite evidence for broader regression coverage after the atlas integration.
