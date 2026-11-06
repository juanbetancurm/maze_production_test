# Player turn and wall impact feedback

Implemented two cosmetic responses on the player sprite: a brief horizontal squash at turn start and a squash/recovery on wall impact. Both return to the authored sprite dimensions and stop when reduced motion is enabled. Walking cancels turn feedback before starting its own scale animation. Neither effect reads or writes the Arcade body, facing math, move count, collision response, or lives.

This work is superseded by the combined [player motion polish review](../player-motion-polish/README.md), which also covers movement-settle feedback and the latest browser trace.
