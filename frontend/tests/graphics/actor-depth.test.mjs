import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actorDepthForY,
  PLAYER_CONTACT_SHADOW_DEPTH,
  PLAYER_GROUND_SHADOW_DEPTH,
} from '../../src/game/visuals/ActorDepth.js';

test('screen-lower characters render in front of screen-upper characters', () => {
  const actors = [60, 295, 220, 97, 190]
    .map((y) => ({ y, depth: actorDepthForY(y) }))
    .sort((a, b) => a.y - b.y);

  for (let index = 1; index < actors.length; index += 1) {
    assert.ok(actors[index].depth > actors[index - 1].depth);
  }
});

test('actor shadows remain below the shared character draw layer', () => {
  assert.ok(PLAYER_GROUND_SHADOW_DEPTH < actorDepthForY(0));
  assert.ok(PLAYER_CONTACT_SHADOW_DEPTH < actorDepthForY(0));
});

test('depth clamps to the fixed playfield and handles invalid input safely', () => {
  assert.equal(actorDepthForY(-10), actorDepthForY(0));
  assert.equal(actorDepthForY(900), actorDepthForY(600));
  assert.equal(actorDepthForY(Number.NaN), actorDepthForY(0));
});
