# Historical integrated graphics regression — generated player atlas rejected

This run predates the owner's rejection of the generated player atlas and is not visual approval for current runtime art.

Completed 2026-11-03 with local fixtures, headless Chrome 156 and the production React/Phaser scene. The trace records **16 passing scenarios**, no browser errors, no failure and zero API writes.

Coverage includes both-level inventories and movement/turn commands; the then-used player atlas plus idle/walk transition; wall collision and respawn; four Level 2 hazards; checkpoint and exit overlap; 20 scene restarts; reduced-motion behavior; a 60-second frame observation; legacy fallback; React desktop/phone layouts; and Protractor toggle, turn and restart preference.

The earlier player idle pulse stopped while walking, on collision and victory, and under reduced motion. Arcade Physics remained authoritative. This is a desktop headless WebGL run; Canvas fallback and physical phones remain untested. See the focused [idle transition evidence](../player-idle-review/README.md) for the historical state assertions.
