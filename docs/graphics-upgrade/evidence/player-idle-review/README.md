# Historical player idle and interruption checks — atlas rejected

The runtime traces below describe an earlier generated atlas. The owner rejected that character art; it has been removed from runtime. Use the supplied `assets/player.png` and current checks for present behavior.

Focused local browser run on 2026-11-03 used headless Chrome 156 and the real Phaser scene. Five selected scenarios passed with no browser errors or API writes: player walk/idle transition, wall impact and respawn, victory, 20 scene restarts, and reduced-motion policy.

At rest the earlier candidate sprite owned an idle pulse. Starting travel stopped that pulse and advanced the four-frame atlas; movement completion returned the atlas to frame zero and resumed idle. These animation assertions do not apply to the current supplied sprite. The trace remains historical evidence for physics independence and restart cleanup.

The pulse changes only the visual sprite's vertical scale by 1.2%. It never changes the invisible physics body, movement velocity, endpoint timer, collision shape or move count. Reduced-motion mode removes the pulse.
