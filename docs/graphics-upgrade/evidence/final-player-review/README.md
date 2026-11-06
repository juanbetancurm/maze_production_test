# Historical integrated scene review — generated player atlas rejected

The player art in this run was later rejected by the owner. This report does not describe the current runtime sprite.

Completed 2026-11-03 on local fixtures in headless Chrome 156 using the production React/Phaser scene. The full trace contains **16 passing scenarios**, no failure or browser errors, and zero API writes.

Coverage includes both-level themed inventories and command traces; animated walk frame advancement and neutral-frame reset; wall impact/respawn; four Level 2 enemy hazards; checkpoint and exit overlap; 20 scene restarts; reduced-motion policy; a 60-second frame observation; legacy fallback; React desktop and phone screens; and Protractor toggle, signed turn and restart preference.

The atlas scenario sampled body `(130,60)` and sprite `(130,60)` while moving, ending at `(210,60)` on neutral frame 0. Arcade Physics still owns travel and collision. This browser pass was recorded before the final frame display-size adjustment to 72×96; the later focused [phone-scale run](../player-scale-check/README.md) covers that display adjustment plus movement and Protractor interactions.

Renderer was WebGL in headless Chrome. Canvas fallback, physical devices, sustained active-use performance, and the complete accessibility matrix remain unmeasured.
