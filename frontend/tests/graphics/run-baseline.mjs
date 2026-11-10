import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from '../../node_modules/vite/dist/node/index.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(testDir, '../..');
const root = path.resolve(frontend, '..');
const output = process.env.ANGLEMAZE_EVIDENCE_DIR
  ? path.resolve(process.env.ANGLEMAZE_EVIDENCE_DIR)
  : path.join(root, 'docs/graphics-upgrade/evidence/baseline');
const selectedScenarios = process.env.ANGLEMAZE_SCENARIOS
  ? new Set(process.env.ANGLEMAZE_SCENARIOS.split(',').map((name) => name.trim()).filter(Boolean))
  : null;
const activeSampleDuration = Math.max(1000, Number(process.env.ANGLEMAZE_ACTIVE_SAMPLE_MS) || 60000);
const browserExecutable = process.env.ANGLEMAZE_BROWSER_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserNoSandbox = process.env.ANGLEMAZE_BROWSER_NO_SANDBOX === '1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const trace = { startedAt: new Date().toISOString(), host: { platform: os.platform(), release: os.release(), node: process.version }, scenarios: [], limitations: [] };
const apiRequests = [];
const premiumAssetRequests = [];
const fetchInterceptionErrors = [];
let staleFetchInterceptions = 0;
const teams = new Map();
let nextTeam = 1;
let chrome;
let vite;
let cdp;

function progress(level = 1) {
  return [1, 2].map((levelId) => ({ levelId, unlocked: levelId === level, completed: levelId < level, bestMoves: null, bestLivesRemaining: null }));
}
function fixtureTeam(id, level = 1) {
  return { id, course: 'Baseline fixture', members: [{ name: 'Synthetic Test Student' }], levelProgress: progress(level) };
}
teams.set('baseline-l1', fixtureTeam('baseline-l1', 1));
teams.set('baseline-l2', fixtureTeam('baseline-l2', 2));

const api = http.createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4178');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Content-Type', 'application/json');
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const bodyText = Buffer.concat(chunks).toString();
  let body;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch { response.writeHead(400).end('{}'); return; }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  apiRequests.push({ at: new Date().toISOString(), method: request.method, pathname, body });
  const send = (value, status = 200) => response.writeHead(status).end(JSON.stringify(value));
  if (request.method === 'POST' && pathname === '/api/teams') {
    const id = `synthetic-${nextTeam++}`;
    const team = { id, course: body.course, members: body.members.map((name) => ({ name })), levelProgress: progress(1) };
    teams.set(id, team); send(team, 201); return;
  }
  if (pathname.startsWith('/api/teams/')) { send(teams.get(pathname.split('/').at(-1)) ?? { error: 'No synthetic team' }); return; }
  if (pathname.startsWith('/api/progress/leaderboard/')) { send({ winners: [] }); return; }
  if (request.method === 'POST' && pathname === '/api/progress/complete-level') {
    const team = teams.get(body.teamId);
    if (!team) { send({ error: 'No synthetic team' }, 404); return; }
    team.levelProgress = team.levelProgress.map((entry) => entry.levelId === body.level ?
      { ...entry, unlocked: false, completed: true, bestMoves: body.moves, bestLivesRemaining: body.livesRemaining } :
      entry.levelId === body.level + 1 ? { ...entry, unlocked: true } : entry);
    send({ progress: team.levelProgress }); return;
  }
  if (pathname.startsWith('/api/progress/')) { send(teams.get(pathname.split('/').at(-1))?.levelProgress ?? []); return; }
  send({ error: 'No fixture route' }, 404);
});

class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) { const entry = this.pending.get(message.id); if (!entry) return; this.pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
      else for (const handler of this.handlers.get(message.method) ?? []) handler(message.params);
    });
  }
  on(name, handler) { const list = this.handlers.get(name) ?? []; list.push(handler); this.handlers.set(name, list); }
  send(method, params = {}, timeout = 30000) {
    return new Promise((resolve, reject) => { const id = ++this.seq; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, timeout); this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async evaluate(expression, timeout = 30000) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
}

async function waitURL(url) {
  for (let i = 0; i < 100; i += 1) { try { const result = await fetch(url); if (result.ok) return result; } catch {} await sleep(100); }
  throw new Error(`Timeout waiting for ${url}`);
}
async function findFreePort() {
  const probe = http.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function navigate(url) { await cdp.send('Page.navigate', { url }); await sleep(600); }
async function fixture(level, fallback = false, renderer = 'webgl') {
  await cdp.send('Network.setBlockedURLs', { urls: fallback ? ['*://127.0.0.1:4178/assets/checkpoint.png'] : [] });
  const rendererQuery = renderer === 'canvas' ? '&renderer=canvas' : '';
  await navigate(`http://127.0.0.1:4178/tests/graphics/baseline.html?level=${level}${rendererQuery}`);
  for (let i = 0; i < 100; i += 1) {
    if (await cdp.evaluate('Boolean(window.anglemazeBaseline)')) break;
    await sleep(100);
  }
  return cdp.evaluate('window.anglemazeBaseline.ready()');
}
async function waitForIdleScene(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (state.playerBody && !state.moving && !state.resetting && !state.won) return state;
    await sleep(50);
  }
  throw new Error('Scene did not return to idle before the hazard probe timeout');
}
async function waitForReactGameReady(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await cdp.evaluate(`document.querySelector('[data-game-ready="true"]') !== null`);
    if (ready) return;
    await sleep(100);
  }
  throw new Error('React game route did not report the first rendered Phaser frame');
}
async function shot(name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(data, 'base64'));
}
async function scenario(name, action) {
  if (selectedScenarios && !selectedScenarios.has(name)) return null;
  console.log(`SCENARIO ${name}`);
  const result = await action();
  trace.scenarios.push({ name, result });
  await fs.writeFile(path.join(output, 'runtime-trace.json'), JSON.stringify(trace, null, 2));
  return result;
}

try {
  await fs.mkdir(output, { recursive: true });
  trace.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  trace.trackedDiffBefore = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  await new Promise((resolve) => api.listen(4179, '127.0.0.1', resolve));
  process.env.VITE_API_BASE_URL = 'http://127.0.0.1:4179/api';
  vite = await createViteServer({ root: frontend, configFile: path.join(frontend, 'vite.config.js'), server: { host: '127.0.0.1', port: 4178, strictPort: true } });
  await vite.listen();
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'anglemaze-g00-'));
  trace.browserProfile = 'Temporary isolated profile (not an existing user profile)';
  trace.browserSandbox = browserNoSandbox ? 'disabled for isolated local fixture' : 'default';
  const debugPort = await findFreePort();
  trace.debugPort = debugPort;
  chrome = spawn(browserExecutable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions',
    ...(browserNoSandbox ? ['--no-sandbox'] : []),
    '--enable-unsafe-swiftshader', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  chrome.on('error', (error) => console.error(error));
  const debugUrl = `http://127.0.0.1:${debugPort}`;
  const version = await (await waitURL(`${debugUrl}/json/version`)).json();
  trace.browser = version;
  const targets = await (await fetch(`${debugUrl}/json/list`)).json();
  trace.browserTargets = targets.map(({ id, type, title, url }) => ({ id, type, title, url }));
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error(`Chrome exposed no page target: ${JSON.stringify(trace.browserTargets)}`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  cdp = new CDP(ws);
  trace.externalRequestsBlocked = [];
  trace.browserErrors = [];
  cdp.on('Runtime.exceptionThrown', (event) => trace.browserErrors.push(event.exceptionDetails.exception?.description ?? event.exceptionDetails.text));
  cdp.on('Network.requestWillBeSent', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/assets/premium/')) premiumAssetRequests.push(url.pathname);
  });
  cdp.on('Fetch.requestPaused', async (event) => {
    const url = new URL(event.request.url);
    const allowed = ['data:', 'blob:', 'about:'].includes(url.protocol) || ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (!allowed) trace.externalRequestsBlocked.push(event.request.url);
    try {
      await cdp.send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', allowed
        ? { requestId: event.requestId }
        : { requestId: event.requestId, errorReason: 'BlockedByClient' });
    } catch (error) {
      if (error.message.includes('Invalid InterceptionId')) {
        staleFetchInterceptions += 1;
        return;
      }
      fetchInterceptionErrors.push(error.message);
    }
  });
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await scenario('level1-themed-inventory', async () => {
    const state = await fixture(1);
    await shot('scene-level1-desktop');
    const diagonalWallTexture = state.visuals.wallKitTextureSources
      .find(({ key }) => key.endsWith('.diagonal.horizontal'));
    if (state.playerTexture !== 'player' || !state.playerTopDown ||
      state.visuals.grassTexture !== 'premium.grass' || state.visuals.wallTexture !== 'premium.wall.kit' ||
      state.visuals.pixelArt !== false || state.visuals.premiumTextureFilter !== 0 || !state.visuals.playerShadow ||
      state.visuals.wallSegmentCount <= 0 || state.visuals.wallModuleCount < state.visuals.wallSegmentCount ||
      !state.visuals.wallJoinTextureLoaded || state.visuals.wallJunctionCount <= 0 ||
      !state.visuals.wallJunctions.some(({ degree }) => degree >= 3) || !diagonalWallTexture ||
      diagonalWallTexture.width < diagonalWallTexture.height * 2.8 ||
      state.visuals.wallRasterWidth < 1600 ||
      state.visuals.golemCount !== 0) {
      throw new Error(`Premium sampling/shadow inventory mismatch: ${JSON.stringify(state.visuals)}`);
    }
    return { state, inventory: await cdp.evaluate('anglemazeBaseline.collisionInventory()') };
  });
  await scenario('player-topdown-motion', async () => {
    await fixture(1);
    const before = await cdp.evaluate('anglemazeBaseline.snapshot()');
    const accepted = await cdp.evaluate("anglemazeBaseline.scene().goForward(150, () => { const player = anglemazeBaseline.scene().playerSprite; window.__playerSettleStarted = Boolean(player._settleTween); window.__playerSettleShadowStarted = Boolean(player._settleShadowTween); setTimeout(() => { window.__playerSettleShadowSample = { scaleX: player._contactShadow.scaleX, scaleY: player._contactShadow.scaleY, alpha: player._contactShadow.alpha } }, 35) })");
    await sleep(220);
    const moving = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await shot('scene-player-topdown-motion');
    const idle = await waitForIdleScene();
    const settleShadowSample = await cdp.evaluate('window.__playerSettleShadowSample ?? null');
    if (!settleShadowSample || settleShadowSample.scaleX <= before.playerContactShadow.scaleX * 1.02 ||
        settleShadowSample.scaleY <= before.playerContactShadow.scaleY * 1.01) {
      throw new Error(`Expected the contact shadow to spread during landing: ${JSON.stringify(settleShadowSample)}`);
    }
    await shot('scene-player-contact-shadow-settle');
    if (!accepted || !before.playerIdle || moving.playerIdle || before.playerTexture !== 'player' ||
      !before.playerTopDown || !moving.playerTopDown || !moving.playerWalkingCue ||
      moving.playerTexture !== 'premium.player.walk' ||
      moving.playerAnimation !== 'anglemaze.player.walk' || !moving.playerAnimationPlaying ||
      moving.visuals.playerWalkFrameCount !== 4 ||
      moving.visuals.playerWalkSourceSize?.width !== 384 ||
      moving.visuals.playerWalkSourceSize?.height !== 384 ||
      !premiumAssetRequests.includes('/assets/premium/characters/player-walk-cycle-v2-2x.png') ||
      before.angle !== moving.angle || Math.abs(moving.playerFacingAngle - (90 - moving.angle)) > 0.01) {
      throw new Error(`Expected the approved overhead player walk cycle without changing the logical facing: ${JSON.stringify({
        accepted, before: { angle: before.angle, playerFacingAngle: before.playerFacingAngle, texture: before.playerTexture },
        moving: { angle: moving.angle, playerFacingAngle: moving.playerFacingAngle, texture: moving.playerTexture,
          animation: moving.playerAnimation, playing: moving.playerAnimationPlaying,
          frameCount: moving.visuals.playerWalkFrameCount, sourceSize: moving.visuals.playerWalkSourceSize,
          requestedOptimizedAtlas: premiumAssetRequests.includes('/assets/premium/characters/player-walk-cycle-v2-2x.png') },
      })}`);
    }
    if (Math.hypot(moving.spriteX - moving.x, moving.spriteY - moving.y) > 0.5) {
      throw new Error('Animated player sprite diverged from the authoritative physics body');
    }
    if (idle.playerTexture !== 'player' || idle.playerAnimationPlaying || !idle.playerIdle || idle.playerWalkingCue ||
      (before.playerPipeline === 'Light2D' && idle.playerPipeline !== 'Light2D')) {
      throw new Error(`Expected the overhead sprite to return to its idle pose at rest: ${JSON.stringify(idle)}`);
    }
    const settleStarted = await cdp.evaluate('Boolean(window.__playerSettleStarted)');
    if (!settleStarted) throw new Error('Expected the movement-complete callback to observe the settle animation starting');
    const settleShadowStarted = await cdp.evaluate('Boolean(window.__playerSettleShadowStarted)');
    if (!settleShadowStarted) throw new Error('Expected the grounded contact-shadow landing response to start with the player settle');
    await sleep(220);
    const settled = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (settled.playerSettle || settled.playerSettleShadow || !settled.playerIdle ||
        Math.abs(settled.playerContactShadow.scaleX - before.playerContactShadow.scaleX) > 1e-5 ||
        Math.abs(settled.playerContactShadow.scaleY - before.playerContactShadow.scaleY) > 1e-5 ||
        Math.abs(settled.playerContactShadow.alpha - before.playerContactShadow.alpha) > 1e-5) {
      throw new Error(`The movement settle did not restore the grounded contact shadow: ${JSON.stringify(settled.playerContactShadow)}`);
    }
    return { accepted, before, moving, idle, settleShadowSample, settled, settleStarted, settleShadowStarted };
  });
  await scenario('player-settle-reduced-motion-interrupt', async () => {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await fixture(1);
    const baseline = await cdp.evaluate('anglemazeBaseline.snapshot()');
    const accepted = await cdp.evaluate('anglemazeBaseline.scene().goForward(150, () => {})');
    const settling = await waitForIdleScene();
    if (!accepted || !settling.playerSettleShadow) {
      throw new Error(`Expected a landing-shadow tween before changing motion preference: ${JSON.stringify(settling)}`);
    }

    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await sleep(35);
    const reduced = await cdp.evaluate('anglemazeBaseline.snapshot()');
    const shadowRestored = reduced.playerContactShadow.scaleX === baseline.playerContactShadow.scaleX &&
      reduced.playerContactShadow.scaleY === baseline.playerContactShadow.scaleY &&
      reduced.playerContactShadow.alpha === baseline.playerContactShadow.alpha;
    if (!reduced.reducedMotion || reduced.playerSettle || reduced.playerSettleShadow || !shadowRestored ||
        reduced.moving || reduced.x !== settling.x || reduced.y !== settling.y) {
      throw new Error(`Reduced motion did not safely cancel the visual settle: ${JSON.stringify({ baseline, settling, reduced })}`);
    }
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await fixture(1);
    return { accepted, settleShadowWasActive: settling.playerSettleShadow,
      reducedMotionApplied: reduced.reducedMotion, shadowRestored, physicsPositionPreserved: true };
  });
  await scenario('player-topdown-motion-canvas', async () => {
    const before = await fixture(1, false, 'canvas');
    const accepted = await cdp.evaluate('anglemazeBaseline.scene().goForward(150, () => {})');
    await sleep(150);
    const moving = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await shot('scene-player-topdown-motion-canvas');
    const idle = await waitForIdleScene();
    if (!accepted || before.visuals.light2DEnabled || moving.visuals.light2DEnabled ||
      moving.playerTexture !== 'premium.player.walk' || moving.playerAnimation !== 'anglemaze.player.walk' ||
      !moving.playerAnimationPlaying || idle.playerTexture !== 'player' || idle.playerAnimationPlaying ||
      Math.hypot(moving.spriteX - moving.x, moving.spriteY - moving.y) > 0.5) {
      throw new Error(`Expected the walk cycle to work on Canvas and restore the static sprite: ${JSON.stringify({
        before: { rendererLighting: before.visuals.light2DEnabled, texture: before.playerTexture },
        moving: { texture: moving.playerTexture, animation: moving.playerAnimation,
          playing: moving.playerAnimationPlaying, delta: Math.hypot(moving.spriteX - moving.x, moving.spriteY - moving.y) },
        idle: { texture: idle.playerTexture, playing: idle.playerAnimationPlaying },
      })}`);
    }
    return { accepted, before: { texture: before.playerTexture, lighting: before.visuals.light2DEnabled },
      moving: { texture: moving.playerTexture, frame: moving.playerFrame, playing: moving.playerAnimationPlaying },
      idle: { texture: idle.playerTexture, playing: idle.playerAnimationPlaying } };
  });
  await scenario('player-turn-feedback', async () => {
    await fixture(1);
    const before = await cdp.evaluate('anglemazeBaseline.snapshot()');
    const facing = await cdp.evaluate('anglemazeBaseline.scene().turnLeft(45)');
    const turning = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await sleep(220);
    const settled = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (facing !== 45 || !turning.playerTurnFeedback || settled.playerTurnFeedback || settled.angle !== 45 ||
      Math.abs(settled.playerBody.width - before.playerBody.width) > 0.01) {
      throw new Error(`Turn feedback did not settle without changing facing/body: ${JSON.stringify({ before, turning, settled })}`);
    }
    return { before, turning, settled };
  });
  await scenario('level1-command-traces', async () => {
    await fixture(1);
    const result = [];
    for (const distance of [10, 50, 100, 12.5]) {
      await cdp.evaluate('anglemazeBaseline.restart(1)');
      result.push(await cdp.evaluate(`anglemazeBaseline.command('forward',${distance})`));
    }
    for (const [kind, degrees] of [['left',30],['right',450],['left',360],['left',12.5]]) result.push(await cdp.evaluate(`anglemazeBaseline.command('${kind}',${degrees})`));
    await shot('scene-level1-arbitrary-angle');
    return result;
  });
  await scenario('level1-wall-hit-and-respawn', async () => {
    await cdp.evaluate('anglemazeBaseline.restart(1)');
    const result = await cdp.evaluate(`(() => {
      anglemazeBaseline.place(30,60,180);
      const scene = anglemazeBaseline.scene();
      const started = scene.goForward(30);
      const startTime = performance.now();
      let frames = 0;
      while (frames < 30 && !scene.isResetting) {
        scene.sys.step(startTime + frames * (1000 / 60), 1000 / 60);
        frames += 1;
      }
      return { started, frames, after: anglemazeBaseline.snapshot() };
    })()`);
    if (!result.started || !result.after.playerImpact || result.after.lastCollisionCause !== 'wall') {
      throw new Error(`Expected a brief impact and a wall-specific collision cause: ${JSON.stringify(result.after)}`);
    }
    await shot('scene-level1-wall-impact'); await sleep(1200);
    return { result, afterRespawn: await cdp.evaluate('anglemazeBaseline.snapshot()') };
  });
  await scenario('level2-themed-inventory', async () => {
    const requestStart = premiumAssetRequests.length;
    const state = await fixture(2);
    const checkpointAssetRequests = premiumAssetRequests.slice(requestStart);
    await shot('scene-level2-desktop');
    const grassAssetPath = '/assets/premium/environment/grass-reference-v4.jpg';
    const grassNormalPath = '/assets/premium/environment/grass-reference-v4-normal.png';
    if (!checkpointAssetRequests.includes(grassAssetPath) || !checkpointAssetRequests.includes(grassNormalPath) ||
        checkpointAssetRequests.includes('/assets/premium/environment/grass-reference-v4.png')) {
      throw new Error(`Expected runtime grass to use its optimized JPEG and aligned normal map: ${JSON.stringify({ requests: checkpointAssetRequests, visuals: state.visuals })}`);
    }
    const activePath = '/assets/premium/objects/checkpoint-active-v3.webp';
    const claimedPath = '/assets/premium/objects/checkpoint-claimed-v3.webp';
    const diagonalWallTexture = state.visuals.wallKitTextureSources
      .find(({ key }) => key.endsWith('.diagonal.horizontal'));
    if (state.visuals.golemCount !== 4 || state.visuals.golemShadowCount !== 4 ||
        !state.visuals.golemEyeGlowTextureLoaded || state.visuals.golemEyeGlowCount !== 4 ||
        state.visuals.golemHitboxCount !== 4 ||
        state.visuals.golemCollisionShapeCount !== 4 ||
        state.visuals.wallSegmentCount <= 0 || state.visuals.wallModuleCount < state.visuals.wallSegmentCount ||
        !state.visuals.wallJoinTextureLoaded || state.visuals.wallJunctionCount <= 0 ||
        !state.visuals.wallJunctions.some(({ degree }) => degree >= 3) || !diagonalWallTexture ||
        diagonalWallTexture.width < diagonalWallTexture.height * 2.8 ||
        state.visuals.wallRasterWidth < 1600 ||
        state.visuals.checkpointStateTextures.length !== 2 ||
        state.visuals.checkpointStates.length !== 4 ||
        state.visuals.checkpointTextureInfo.length !== 2 ||
        state.visuals.checkpointTextureInfo.some(({ width, height, alphaCorner }) =>
          width < 400 || height < 500 || alphaCorner !== 0) ||
        !checkpointAssetRequests.includes(activePath) || !checkpointAssetRequests.includes(claimedPath) ||
        checkpointAssetRequests.includes('/assets/premium/objects/checkpoint-badges-v2.png')) {
      throw new Error(`Expected high-resolution transparent checkpoint badges, consistent walls, and four solid golems: ${JSON.stringify(state.visuals)}`);
    }
    const afterRestart = await cdp.evaluate('anglemazeBaseline.restart(2)');
    if (afterRestart.visuals.checkpointStateTextures.length !== 2 ||
        afterRestart.visuals.checkpointTextureInfo.some(({ width, height, alphaCorner }) =>
          width < 400 || height < 500 || alphaCorner !== 0)) {
      throw new Error(`Checkpoint WebP textures should survive restart with their dimensions and transparency intact: ${JSON.stringify(afterRestart.visuals.checkpointTextureInfo)}`);
    }
    return { state, afterRestart, checkpointAssetRequests,
      inventory: await cdp.evaluate('anglemazeBaseline.collisionInventory()') };
  });
  await scenario('level-specific-golem-assets', async () => {
    const requestStart = premiumAssetRequests.length;
    const level1 = await fixture(1);
    const level1Requests = premiumAssetRequests.slice(requestStart);
    if (level1.visuals.golemTextureLoaded || level1.visuals.golemEyeGlowTextureLoaded ||
        level1.visuals.golemCount !== 0) {
      throw new Error(`Level 1 should not load or create unused golem visuals: ${JSON.stringify(level1.visuals)}`);
    }
    const golemPath = '/assets/premium/characters/golem-static-v2.png';
    if (level1Requests.includes(golemPath)) {
      throw new Error(`Level 1 downloaded the Level 2-only golem PNG: ${JSON.stringify(level1Requests)}`);
    }

    const level2 = await cdp.evaluate('anglemazeBaseline.restart(2)');
    const level2RequestedGolem = premiumAssetRequests.slice(requestStart).includes(golemPath);
    if (!level2.visuals.golemTextureLoaded || !level2.visuals.golemEyeGlowTextureLoaded ||
        level2.visuals.golemCount !== 4 || level2.visuals.golemHitboxCount !== 4 || !level2RequestedGolem) {
      throw new Error(`Level 2 should load its four golem visuals and preserve collision bodies: ${JSON.stringify(level2.visuals)}`);
    }

    const returnedToLevel1 = await cdp.evaluate('anglemazeBaseline.restart(1)');
    if (returnedToLevel1.visuals.golemTextureLoaded || returnedToLevel1.visuals.golemEyeGlowTextureLoaded ||
        returnedToLevel1.visuals.golemCount !== 0 || returnedToLevel1.visuals.golemHitboxCount !== 0) {
      throw new Error(`Returning to Level 1 should release golem-only visual textures and keep its empty enemy set: ${JSON.stringify(returnedToLevel1.visuals)}`);
    }
    return {
      level1: {
        golemTextureLoaded: level1.visuals.golemTextureLoaded,
        eyeGlowTextureLoaded: level1.visuals.golemEyeGlowTextureLoaded,
        golemAssetRequested: level1Requests.includes(golemPath),
      },
      level2: {
        golemTextureLoaded: level2.visuals.golemTextureLoaded,
        eyeGlowTextureLoaded: level2.visuals.golemEyeGlowTextureLoaded,
        golemAssetRequested: level2RequestedGolem,
        golemCount: level2.visuals.golemCount,
        collisionBodies: level2.visuals.golemHitboxCount,
      },
      returnedToLevel1: {
        golemTextureLoaded: returnedToLevel1.visuals.golemTextureLoaded,
        eyeGlowTextureLoaded: returnedToLevel1.visuals.golemEyeGlowTextureLoaded,
        golemCount: returnedToLevel1.visuals.golemCount,
        collisionBodies: returnedToLevel1.visuals.golemHitboxCount,
      },
    };
  });
  await scenario('level2-golem-weighted-idle', async () => {
    await fixture(2);
    const sample = () => cdp.evaluate(`(() => {
      const s = anglemazeBaseline.scene();
      const golems = s.children.list
        .filter(object => object.texture?.key === 'premium.golem.static')
        .map(({ x, y, scaleX, scaleY, rotation }) => ({ x, y, scaleX, scaleY, rotation }));
      const eyeGlows = s.children.list
        .filter(object => object.texture?.key === 'premium.golem.eye-glow')
        .map(({ x, y, rotation, alpha }) => ({ x, y, rotation, alpha }));
      const contactShadows = s.children.list
        .filter(object => object.type === 'Ellipse' && object.depth === 3.7)
        .map(({ x, y, scaleX, scaleY, alpha }) => ({ x, y, scaleX, scaleY, alpha }));
      return {
        golems,
        eyeGlows,
        contactShadows,
        anchors: s.golemView.renderOrder,
        collisionAnchors: s.golemCollisionShapes.map(({ x, y }) => ({ x, y })),
        player: { x: s.player.x, y: s.player.y },
      };
    })()`);
    const grounded = await sample();
    await sleep(850);
    const lifted = await sample();
    const maxBodyLift = Math.max(...grounded.golems.map((golem, index) =>
      Math.abs(golem.y - lifted.golems[index].y)));
    const maxShadowAlphaChange = Math.max(...grounded.contactShadows.map((shadow, index) =>
      Math.abs(shadow.alpha - lifted.contactShadows[index].alpha)));
    const maxEyeGlowAlphaChange = Math.max(...grounded.eyeGlows.map((glow, index) =>
      Math.abs(glow.alpha - lifted.eyeGlows[index].alpha)));
    const eyeGlowsFollowActors = grounded.eyeGlows.length === grounded.golems.length &&
      grounded.eyeGlows.every((glow, index) => glow.x === grounded.golems[index].x &&
        glow.y === grounded.golems[index].y && glow.rotation === grounded.golems[index].rotation) &&
      lifted.eyeGlows.every((glow, index) => glow.x === lifted.golems[index].x &&
        glow.y === lifted.golems[index].y && glow.rotation === lifted.golems[index].rotation);
    if (grounded.golems.length !== 4 || maxBodyLift < 0.1 || maxShadowAlphaChange < 0.001 ||
        grounded.eyeGlows.length !== 4 || maxEyeGlowAlphaChange < 0.01 || !eyeGlowsFollowActors ||
        JSON.stringify(grounded.anchors) !== JSON.stringify(lifted.anchors) ||
        JSON.stringify(grounded.collisionAnchors) !== JSON.stringify(lifted.collisionAnchors) ||
        grounded.player.x !== lifted.player.x || grounded.player.y !== lifted.player.y) {
      throw new Error(`Expected visible weighted idle, eye glow, and stable gameplay anchors: ${JSON.stringify({
        maxBodyLift, maxShadowAlphaChange, maxEyeGlowAlphaChange, eyeGlowsFollowActors, grounded, lifted,
      })}`);
    }
    await shot('scene-level2-golem-eye-glow');
    return { maxBodyLift, maxShadowAlphaChange, maxEyeGlowAlphaChange,
      eyeGlowsFollowActors, anchorsRemainFixed: true, playerRemainsFixed: true };
  });
  await scenario('level2-golem-eye-glow-canvas', async () => {
    const state = await fixture(2, false, 'canvas');
    const readGlows = () => cdp.evaluate(`(() => anglemazeBaseline.scene().children.list
      .filter(object => object.texture?.key === 'premium.golem.eye-glow')
      .map(({ x, y, rotation, alpha, visible }) => ({ x, y, rotation, alpha, visible })))()`);
    const moving = await readGlows();
    await cdp.evaluate('anglemazeBaseline.scene().golemView.setReducedMotion(true)');
    await sleep(50); // allow the reduced-motion facing snap to reach the stationary player
    const reducedStart = await readGlows();
    await sleep(300);
    const reducedEnd = await readGlows();
    await shot('scene-level2-golem-eye-glow-canvas');
    if (state.renderer !== 'Canvas' || !state.visuals.golemEyeGlowTextureLoaded || moving.length !== 4 ||
        moving.some(glow => !glow.visible) ||
        JSON.stringify(reducedStart) !== JSON.stringify(reducedEnd)) {
      throw new Error(`Expected four visible Canvas eye overlays and a static reduced-motion pose: ${JSON.stringify({
        renderer: state.renderer, moving, reducedStart, reducedEnd,
      })}`);
    }
    await cdp.evaluate('anglemazeBaseline.scene().golemView.setReducedMotion(false)');
    return { renderer: state.renderer, glowCount: moving.length,
      reducedMotionPoseRemainedStatic: true };
  });
  await scenario('level2-actor-depth-sorting', async () => {
    const upper = await fixture(2);
    await shot('scene-level2-actor-depth-sorting');
    const upperLayers = [{ y: upper.y, depth: upper.playerDepth }, ...upper.golemRenderOrder]
      .sort((a, b) => a.y - b.y);
    const upperSorted = upperLayers.every((actor, index) => index === 0 || actor.depth >= upperLayers[index - 1].depth);

    await cdp.evaluate('anglemazeBaseline.place(600,500,270)');
    await sleep(100);
    const lower = await cdp.evaluate('anglemazeBaseline.snapshot()');
    const lowerLayers = [{ y: lower.y, depth: lower.playerDepth }, ...lower.golemRenderOrder]
      .sort((a, b) => a.y - b.y);
    const lowerSorted = lowerLayers.every((actor, index) => index === 0 || actor.depth >= lowerLayers[index - 1].depth);
    if (!upperSorted || !lowerSorted || lower.playerDepth <= Math.max(...lower.golemRenderOrder.map(({ depth }) => depth)) ||
      lower.lives !== 5 || lower.resetting) {
      throw new Error(`Expected actor draw order to follow screen Y without changing actor positions: ${JSON.stringify({
        upper: { player: { y: upper.y, depth: upper.playerDepth }, golems: upper.golemRenderOrder },
        lower: { player: { y: lower.y, depth: lower.playerDepth }, golems: lower.golemRenderOrder },
      })}`);
    }
    return { upperLayers, lowerLayers, playerMovedInFront: true };
  });
  await scenario('level2-golem-hitbox-footprint', async () => {
    await fixture(2);
    const geometry = await cdp.evaluate('anglemazeBaseline.verifyGolemFootprint()');
    if (!geometry.samples.every(sample => sample.pass) ||
        !geometry.rotations.every(rotation => rotation.detected) || !geometry.swept) {
      throw new Error(`Measured alpha-hull boundary probes failed: ${JSON.stringify(geometry)}`);
    }
    const tracking = await cdp.evaluate('anglemazeBaseline.verifyGolemTracking(770,550)');
    if (!tracking.movedSmoothly || !tracking.errors.every(error => error < 0.15)) {
      throw new Error(`Golem visual tracking did not ease toward the player: ${JSON.stringify(tracking)}`);
    }
    return { geometry, tracking };
  });
  await scenario('level2-golem-solid-collision', async () => {
    await fixture(2);
    const start = await cdp.evaluate('anglemazeBaseline.place(120,220,270)');
    const approach = await cdp.evaluate(`(() => {
      const scene = anglemazeBaseline.scene();
      const started = scene.goForward(80);
      const startTime = performance.now();
      let frames = 0;
      while (frames < 30 && !scene.isResetting) {
        scene.sys.step(startTime + frames * (1000 / 60), 1000 / 60);
        frames += 1;
      }
      return { started, frames, after: anglemazeBaseline.snapshot() };
    })()`);
    const after = approach.after;
    if (!start || !approach.started || after.lives !== 4 || after.lastCollisionCause !== 'golem') {
      throw new Error(`Expected a solid golem hitbox to stop the player and apply one existing life-loss response: ${JSON.stringify({ start, approach, after })}`);
    }
    return { start, approach, after };
  });
  await scenario('level2-enemy-stub-inventory', async () => {
    await fixture(2);
    const inventory = await cdp.evaluate('anglemazeBaseline.collisionInventory()');
    const results = inventory.enemyHazards.map(({ source, bodies }) => {
      const golem = inventory.golemHitboxes.find((entry) =>
        Math.abs(entry.x - source.x1) < 2 && Math.abs(entry.y - source.y1) < 2);
      const stub = bodies.find((body) =>
        Math.hypot(body.cx - source.x1, body.cy - source.y1) < 0.1 &&
        body.width === 8 && body.height === 8);
      return {
        source: { x: source.x1, y: source.y1 },
        golemCenter: golem ? { x: golem.x, y: golem.y } : null,
        matchingWallBody: stub ? { x: stub.cx, y: stub.cy, width: stub.width, height: stub.height } : null,
        pass: Boolean(golem && stub),
      };
    });
    if (results.length !== 4 || results.some((result) => !result.pass)) {
      throw new Error(`Level 2 enemy stubs no longer match the current golem layout: ${JSON.stringify(results)}`);
    }
    // These tiny legacy wall stubs sit beneath golems. Do not try to approach
    // them from an arbitrary fixture point: a nearby segment can overlap the
    // player's Arcade body before a move begins. Physical golem contact is
    // exercised separately from the clear corridor in level2-golem-solid-collision.
    return results;
  });
  await scenario('level2-checkpoint-overlap', async () => {
    await fixture(2);
    await cdp.evaluate('anglemazeBaseline.restart(2)');
    await cdp.evaluate('anglemazeBaseline.place(645,525,90)'); await sleep(250);
    await cdp.evaluate('anglemazeBaseline.place(700,560,90)'); await sleep(1600);
    await shot('scene-level2-checkpoint');
    const state = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (!state.checkpoint || !state.checkpointGlow?.active || !state.checkpointGlow.pulseActive ||
        state.checkpointGlow.position.x !== state.checkpoint.x ||
        state.checkpointGlow.position.y !== state.checkpoint.y) {
      throw new Error(`The active checkpoint should receive a matching display-only halo: ${JSON.stringify({
        checkpoint: state.checkpoint, glow: state.checkpointGlow,
      })}`);
    }
    return { state, events: await cdp.evaluate('anglemazeBaseline.events.slice(-8)') };
  });
  await scenario('level2-checkpoint-glow-canvas-reduced-motion', async () => {
    const initial = await fixture(2, false, 'canvas');
    await cdp.evaluate('anglemazeBaseline.place(645,525,90)');
    await sleep(250);
    await cdp.evaluate('anglemazeBaseline.place(700,560,90)');
    await sleep(1600);
    const active = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await shot('scene-level2-checkpoint-glow-canvas');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await sleep(50);
    const reducedStart = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await sleep(400);
    const reducedEnd = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await sleep(50);
    const resumed = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (initial.renderer !== 'Canvas' || !active.checkpointGlow?.pulseActive ||
        !reducedStart.reducedMotion || reducedStart.checkpointGlow.pulseActive ||
        reducedStart.checkpointGlow.alpha !== reducedEnd.checkpointGlow.alpha ||
        reducedStart.checkpointGlow.position.x !== reducedEnd.checkpointGlow.position.x ||
        reducedStart.checkpointGlow.position.y !== reducedEnd.checkpointGlow.position.y ||
        resumed.reducedMotion || !resumed.checkpointGlow.pulseActive) {
      throw new Error(`The checkpoint halo should work on Canvas and pause under reduced motion: ${JSON.stringify({
        initial: initial.renderer, active: active.checkpointGlow, reducedStart: reducedStart.checkpointGlow,
        reducedEnd: reducedEnd.checkpointGlow, reduced: reducedStart.reducedMotion,
        resumed: resumed.checkpointGlow,
      })}`);
    }
    return { renderer: initial.renderer, haloPosition: active.checkpointGlow.position,
      reducedMotionStatic: true, pulseResumed: resumed.checkpointGlow.pulseActive };
  });
  await scenario('protractor-fade-reduced-motion', async () => {
    const initial = await fixture(1);
    const setVisible = (visible) => cdp.evaluate(`anglemazeBaseline.scene().protractorView.setVisible(${visible})`);
    await setVisible(true);
    const opening = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await sleep(55);
    const openingMid = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await sleep(115);
    const shown = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await shot('scene-protractor-fade-visible');

    await setVisible(false);
    await sleep(45);
    const closingMid = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await setVisible(true);
    await sleep(150);
    const reopened = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await setVisible(false);
    await sleep(150);
    const hidden = await cdp.evaluate('anglemazeBaseline.snapshot()');

    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await sleep(60);
    const reduced = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await setVisible(true);
    const reducedShown = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await setVisible(false);
    const reducedHidden = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await sleep(60);

    const unchangedGameplay = initial.x === hidden.x && initial.y === hidden.y &&
      initial.angle === hidden.angle && initial.lives === hidden.lives;
    if (!opening.protractor?.rootVisible || opening.protractor.alpha !== 0 ||
        !openingMid.protractor?.transitionActive || !(openingMid.protractor.alpha > 0 && openingMid.protractor.alpha < 1) ||
        !shown.protractor.rootVisible || shown.protractor.alpha !== 1 || shown.protractor.transitionActive ||
        !closingMid.protractor.rootVisible || !(closingMid.protractor.alpha > 0 && closingMid.protractor.alpha < 1) ||
        !reopened.protractor.rootVisible || reopened.protractor.alpha !== 1 ||
        hidden.protractor.rootVisible || hidden.protractor.alpha !== 0 ||
        !reduced.reducedMotion || reducedShown.protractor.alpha !== 1 || reducedShown.protractor.transitionActive ||
        reducedHidden.protractor.rootVisible || reducedHidden.protractor.alpha !== 0 ||
        !unchangedGameplay || shown.protractor.x !== shown.x || shown.protractor.y !== shown.y) {
      throw new Error(`Protractor visibility should fade, reverse cleanly, and become immediate for reduced motion: ${JSON.stringify({
        opening: opening.protractor, openingMid: openingMid.protractor, shown: shown.protractor,
        closingMid: closingMid.protractor, reopened: reopened.protractor, hidden: hidden.protractor,
        reduced: reduced.reducedMotion, reducedShown: reducedShown.protractor, reducedHidden: reducedHidden.protractor,
        unchangedGameplay,
      })}`);
    }
    return { renderer: initial.renderer, opening: opening.protractor, openingMid: openingMid.protractor,
      shown: shown.protractor, closingMid: closingMid.protractor, reopened: reopened.protractor,
      hidden: hidden.protractor, reducedMotionImmediate: true, unchangedGameplay };
  });
  await scenario('level1-victory-overlap', async () => {
    await cdp.evaluate('anglemazeBaseline.restart(1)');
    await cdp.evaluate('anglemazeBaseline.place(690,540,0)');
    const result = await cdp.evaluate("anglemazeBaseline.command('forward',100)");
    await shot('scene-level1-victory'); await sleep(500);
    const exitActivated = await cdp.evaluate('anglemazeBaseline.scene().exitVisual?.isActivated ?? false');
    if (!exitActivated) throw new Error('Winning on the exit did not activate its visual feedback');
    return { result, exitActivated, stateAfterTimer: await cdp.evaluate('anglemazeBaseline.snapshot()'), events: await cdp.evaluate('anglemazeBaseline.events.slice(-8)') };
  });
  await scenario('exit-proximity-feedback', async () => {
    await fixture(1);
    const levels = await cdp.evaluate(`(() => {
      const view = anglemazeBaseline.scene().exitVisual;
      view.updateProximity(740, 540);
      const near = view.proximityAlpha;
      view.updateProximity(600, 540);
      const far = view.proximityAlpha;
      return { near, far };
    })()`);
    if (!(levels.near > 0.12) || levels.far !== 0) {
      throw new Error(`Expected quiet amber feedback only near the exit: ${JSON.stringify(levels)}`);
    }
    return levels;
  });
  await scenario('exit-activation-burst', async () => {
    await fixture(1);
    const normalStart = await cdp.evaluate('anglemazeBaseline.scene().children.list.length');
    await cdp.evaluate('anglemazeBaseline.scene().exitVisual.activate()');
    const normalDuring = await cdp.evaluate('anglemazeBaseline.scene().children.list.length');
    await sleep(180);
    const effectState = await cdp.evaluate(`anglemazeBaseline.scene().children.list
      .filter(object => ['Circle', 'Star'].includes(object.type) && object.depth >= 2.35)
      .map(({ type, x, y, scaleX, scaleY, alpha, depth, fillColor, fillAlpha, visible }) =>
        ({ type, x, y, scaleX, scaleY, alpha, depth, fillColor, fillAlpha, visible }))`);
    await shot('scene-exit-activation-burst');
    await sleep(650);
    const normalAfter = await cdp.evaluate('anglemazeBaseline.scene().children.list.length');
    const normalActivated = await cdp.evaluate('anglemazeBaseline.scene().exitVisual.isActivated');
    const visibleSparkles = effectState.filter(({ type }) => type === 'Star');
    if (normalDuring - normalStart !== 9 || visibleSparkles.length !== 8 ||
        visibleSparkles.some(({ alpha, scaleX, visible }) => !visible || alpha < 0.45 || scaleX < 0.7) ||
        normalAfter !== normalStart ||
        !normalActivated) {
      throw new Error(`Expected a bounded nine-object exit burst to clean itself up: ${JSON.stringify({
        normalStart, normalDuring, normalAfter, visibleSparkles,
      })}`);
    }

    await fixture(1);
    await cdp.evaluate('anglemazeBaseline.scene().exitVisual.setReducedMotion(true)');
    const reducedStart = await cdp.evaluate('anglemazeBaseline.scene().children.list.length');
    await cdp.evaluate('anglemazeBaseline.scene().exitVisual.activate()');
    const reducedAfter = await cdp.evaluate('anglemazeBaseline.scene().children.list.length');
    const reducedActivated = await cdp.evaluate('anglemazeBaseline.scene().exitVisual.isActivated');
    if (reducedAfter !== reducedStart || !reducedActivated) {
      throw new Error(`Reduced motion should activate the exit without moving particles: ${JSON.stringify({
        reducedStart, reducedAfter,
      })}`);
    }
    return { normalObjectsAdded: normalDuring - normalStart, effectsAtCapture: effectState,
      normalObjectsAfterCleanup: normalAfter,
      reducedMotionObjectsAdded: reducedAfter - reducedStart };
  });
  await scenario('twenty-restarts', async () => {
    await fixture(2);
    const counts = [];
    for (let i = 0; i < 20; i += 1) { await cdp.evaluate('anglemazeBaseline.restart(2)'); await sleep(250); counts.push(await cdp.evaluate('anglemazeBaseline.resources()')); }
    const stableCounts = counts.map(({ displayObjects, staticBodies, dynamicBodies, textures, sceneListeners }) => ({
      displayObjects, staticBodies, dynamicBodies, textures, sceneListeners,
    }));
    const baseline = JSON.stringify(stableCounts[0]);
    if (stableCounts.some((countsAtRestart) => JSON.stringify(countsAtRestart) !== baseline)) {
      throw new Error(`Display objects, physics bodies, textures, or listeners grew across 20 restarts: ${JSON.stringify(stableCounts)}`);
    }
    return { restarts: counts.length, stableCounts, resourcesStable: true };
  });
  await scenario('reduced-motion-policy', async () => {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const reducedState = await fixture(2);
    const reducedMoveAccepted = await cdp.evaluate('anglemazeBaseline.scene().goForward(20, () => {})');
    const reducedMoving = await cdp.evaluate('anglemazeBaseline.snapshot()');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await sleep(150);
    const normalState = await cdp.evaluate('anglemazeBaseline.snapshot()');
    if (!reducedState.reducedMotion || normalState.reducedMotion || !reducedMoveAccepted ||
      reducedMoving.playerTexture !== 'player' || reducedMoving.playerAnimationPlaying || reducedMoving.playerWalkingCue) {
      throw new Error('The scene did not follow the reduced-motion media preference');
    }
    if (normalState.resources.activeTweens <= reducedState.resources.activeTweens) {
      throw new Error('Expected decorative scene tweens to stop under reduced motion and resume without it');
    }
    return {
      reduced: { enabled: reducedState.reducedMotion, activeTweens: reducedState.resources.activeTweens,
        movementAccepted: reducedMoveAccepted, playerTexture: reducedMoving.playerTexture,
        playerAnimationPlaying: reducedMoving.playerAnimationPlaying },
      normal: { enabled: normalState.reducedMotion, activeTweens: normalState.resources.activeTweens },
    };
  });
  await scenario('level2-60second-frame-observation', async () => {
    await fixture(2);
    return cdp.evaluate('anglemazeBaseline.frameSample(60000)', 70000);
  });
  await scenario('level2-active-movement-frame-observation', async () => {
    await fixture(2);
    const sample = await cdp.evaluate(`anglemazeBaseline.activeFrameSample(${activeSampleDuration})`, activeSampleDuration + 10000);
    if (sample.rejectedReason || sample.moves < 2 || sample.turns < 1 || sample.lives !== 5 || sample.lastCollisionCause) {
      throw new Error(`Active Level 2 route did not complete cleanly: ${JSON.stringify(sample)}`);
    }
    return sample;
  });
  await scenario('level1-fallback-inventory', async () => { const state = await fixture(1,true); await shot('scene-level1-fallback'); return { state, inventory: await cdp.evaluate('anglemazeBaseline.collisionInventory()') }; });
  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await scenario('react-registration-instructions', async () => {
    await navigate('http://127.0.0.1:4178/'); await shot('react-instructions-desktop');
    const result = await cdp.evaluate(`(() => ({ url: location.href,
      text: document.body.innerText.slice(0,2500),
      gameModules: performance.getEntriesByType('resource').map(({ name }) => name)
        .filter((name) => /phaser|MazeScene|\\/game\\/config\\.js/i.test(name)) }))()`);
    if (result.gameModules.length) {
      throw new Error(`Game renderer loaded before entering a level: ${JSON.stringify(result.gameModules)}`);
    }
    return result;
  });
  await scenario('react-level1-desktop', async () => {
    await cdp.evaluate("localStorage.setItem('anglemaze:teamId','baseline-l1');localStorage.setItem('anglemaze:instructionsSeen','true')");
    await navigate('http://127.0.0.1:4178/game/1'); await waitForReactGameReady(); await shot('react-level1-desktop');
    const result = await cdp.evaluate(`(() => ({ url: location.href,
      canvasCount: document.querySelectorAll('canvas').length, text: document.body.innerText,
      gameReady: document.querySelector('[data-game-ready="true"]') !== null,
      layout: (() => {
        const rect = (element) => {
          if (!element) return null;
          const { x, y, width, height, top, right, bottom, left } = element.getBoundingClientRect();
          return { x, y, width, height, top, right, bottom, left };
        };
        const shell = document.querySelector('.maze-canvas-shell');
        const wrapper = shell?.firstElementChild;
        const container = document.querySelector('#game-container');
        const canvas = container?.querySelector('canvas');
        const css = (element) => {
          if (!element) return null;
          const style = getComputedStyle(element);
          return { width: style.width, height: style.height, marginTop: style.marginTop,
            marginBottom: style.marginBottom, position: style.position, transform: style.transform };
        };
        return { shell: rect(shell), wrapper: rect(wrapper), container: rect(container), canvas: rect(canvas),
          wrapperCss: css(wrapper), containerCss: css(container), canvasCss: css(canvas) };
      })(),
      gameModules: performance.getEntriesByType('resource').map(({ name }) => name)
        .filter((name) => /phaser|MazeScene|\\/game\\/config\\.js/i.test(name)) }))()`);
    if (result.canvasCount !== 1 || !result.gameModules.length || !result.gameReady) {
      throw new Error(`Game route did not load the deferred Phaser modules: ${JSON.stringify(result)}`);
    }
    return result;
  });
  await scenario('react-level2-phone', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('http://127.0.0.1:4178/');
    await cdp.evaluate("localStorage.setItem('anglemaze:teamId','baseline-l2')");
    await navigate('http://127.0.0.1:4178/game/2'); await waitForReactGameReady(); await shot('react-level2-phone');
    return cdp.evaluate(`(() => {
      const rect = (element) => {
        if (!element) return null;
        const { x, y, width, height, top, right, bottom, left } = element.getBoundingClientRect();
        return { x, y, width, height, top, right, bottom, left };
      };
      const shell = document.querySelector('.maze-canvas-shell');
      const wrapper = shell?.firstElementChild;
      const container = document.querySelector('#game-container');
      const canvas = container?.querySelector('canvas');
      const css = (element) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        return { width: style.width, height: style.height, marginTop: style.marginTop,
          marginLeft: style.marginLeft, position: style.position, transform: style.transform };
      };
      return { url: location.href, canvasCount: document.querySelectorAll('canvas').length,
        text: document.body.innerText, viewport: { width: innerWidth, height: innerHeight },
        layout: { shell: rect(shell), wrapper: rect(wrapper), container: rect(container),
          canvas: rect(canvas), canvasBitmap: canvas ? { width: canvas.width, height: canvas.height } : null,
          wrapperCss: css(wrapper), containerCss: css(container), canvasCss: css(canvas) } };
    })()`);
  });
  await scenario('react-responsive-viewports', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('http://127.0.0.1:4178/');
    await cdp.evaluate("localStorage.setItem('anglemaze:teamId','baseline-l2')");
    await navigate('http://127.0.0.1:4178/game/2');
    await waitForReactGameReady();
    const viewports = [
      { name: 'desktop-short-1352x557', width: 1352, height: 557, mobile: false },
      { name: 'desktop-1315x755', width: 1315, height: 755, mobile: false },
      { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false },
      { name: 'phone-360x800', width: 360, height: 800, mobile: true },
      { name: 'tablet-768x1024', width: 768, height: 1024, mobile: false },
      { name: 'phone-landscape-844x390', width: 844, height: 390, mobile: true },
    ];
    const results = [];
    for (const viewport of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      await cdp.evaluate('window.dispatchEvent(new Event("resize"))');
      await sleep(600);
      const layout = await cdp.evaluate(`(() => {
        const canvas = document.querySelector('#game-container canvas');
        const rect = canvas?.getBoundingClientRect();
        const controls = document.querySelector('.maze-game-controls');
        const controlsRect = controls?.getBoundingClientRect();
        const shellRect = document.querySelector('.maze-canvas-shell')?.getBoundingClientRect();
        const wrapper = document.querySelector('.maze-canvas-shell')?.firstElementChild;
        const wrapperRect = wrapper?.getBoundingClientRect();
        const activeHearts = document.querySelector('.maze-game-lives-active');
        const lostHearts = document.querySelector('.maze-game-lives-lost');
        return {
          viewport: { width: innerWidth, height: innerHeight },
          canvasCount: document.querySelectorAll('#game-container canvas').length,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          canvas: rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null,
          controls: controlsRect ? { left: controlsRect.left, right: controlsRect.right,
            top: controlsRect.top, width: controlsRect.width, height: controlsRect.height } : null,
          shell: shellRect ? { left: shellRect.left, right: shellRect.right, top: shellRect.top,
            bottom: shellRect.bottom, width: shellRect.width, height: shellRect.height } : null,
          wrapper: wrapperRect ? { left: wrapperRect.left, right: wrapperRect.right,
            width: wrapperRect.width, height: wrapperRect.height,
            cssWidth: getComputedStyle(wrapper).width, transform: getComputedStyle(wrapper).transform } : null,
          activeHeartsColor: activeHearts ? getComputedStyle(activeHearts).color : null,
          lostHeartsColor: lostHearts ? getComputedStyle(lostHearts).color : null,
          ready: document.querySelector('[data-game-ready="true"]') !== null,
        };
      })()`);
      const pass = layout.canvasCount === 1 && layout.ready && layout.canvas?.width > 0 &&
        layout.canvas.left >= -1 && layout.canvas.right <= viewport.width + 1 &&
          layout.documentWidth <= viewport.width + 1 &&
          (viewport.name !== 'desktop-short-1352x557' ||
            (layout.canvas.width >= 1000 && layout.controls?.width <= 280 &&
              layout.shell.bottom <= layout.documentHeight + 1 &&
              layout.canvas.width / (layout.canvas.width + layout.controls.width +
                Math.max(0, layout.controls.left - layout.shell.right)) >= 0.75)) &&
          (viewport.name !== 'desktop-1315x755' ||
            (layout.canvas.width >= 900 && layout.controls?.width <= 280 &&
              layout.shell.bottom <= layout.documentHeight + 1 &&
              layout.canvas.width / (layout.canvas.width + layout.controls.width +
                Math.max(0, layout.controls.left - layout.shell.right)) >= 0.75)) &&
          (!viewport.name.startsWith('desktop-') || layout.shell.bottom <= layout.documentHeight + 1) &&
          (Math.abs(layout.canvas.width - layout.shell.width) < 2 &&
            Math.abs(layout.canvas.height - (layout.shell.height - 2)) < 2) &&
          (!viewport.name.startsWith('desktop-') || layout.activeHeartsColor === 'rgb(197, 31, 53)') &&
          (!viewport.name.startsWith('tablet-') || layout.controls?.top >= layout.shell?.bottom - 1) &&
          (viewport.name !== 'phone-landscape-844x390' ||
            (layout.canvas.width >= 400 && layout.canvas.height >= 300));
      results.push({ ...viewport, ...layout, pass });
      await shot(`react-${viewport.name}`);
      if (!pass) throw new Error(`Game layout overflowed or lost its canvas at ${viewport.name}: ${JSON.stringify(layout)}`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(250);
    return results;
  });
  await scenario('react-resized-desktop-controls', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1315, height: 755, deviceScaleFactor: 1, mobile: false,
    });
    await navigate('http://127.0.0.1:4178/');
    await cdp.evaluate("localStorage.setItem('anglemaze:teamId','baseline-l2')");
    await navigate('http://127.0.0.1:4178/game/2');
    await waitForReactGameReady();
    const readStatus = () => cdp.evaluate(`(() => {
      const text = document.querySelector('.maze-game-status')?.innerText ?? '';
      return {
        position: text.match(/Position\\s+([^\\n]+)/)?.[1]?.trim(),
        facing: text.match(/Facing\\s+([^\\n]+)/)?.[1]?.trim(),
        moves: text.match(/Moves\\s+([^\\n]+)/)?.[1]?.trim(),
        canvas: (() => {
          const rect = document.querySelector('#game-container canvas')?.getBoundingClientRect();
          return rect ? { width: rect.width, height: rect.height } : null;
        })(),
      };
    })()`);
    const before = await readStatus();
    await cdp.evaluate("document.querySelector('.maze-btn-forward')?.click()");
    const deadline = Date.now() + 3000;
    let moved = await readStatus();
    while (Date.now() < deadline && (moved.position === before.position || moved.moves !== '1')) {
      await sleep(60);
      moved = await readStatus();
    }
    await cdp.evaluate("document.querySelectorAll('.maze-btn-turn')[1]?.click()");
    const turned = await readStatus();
    await shot('react-desktop-resized-controls-used');
    if (before.position !== '(740, 60)' || moved.position !== '(690, 60)' || moved.moves !== '1' ||
        !turned.facing.startsWith('90°') || turned.moves !== '2' || moved.canvas.width < 900) {
      throw new Error(`Movement or rotation changed after desktop canvas scaling: ${JSON.stringify({ before, moved, turned })}`);
    }
    return { before, moved, turned, movementAndRotationPreserved: true };
  });
  await scenario('react-protractor-resize-alignment', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1315, height: 755, deviceScaleFactor: 1, mobile: false,
    });
    await navigate('http://127.0.0.1:4178/');
    await cdp.evaluate("localStorage.setItem('anglemaze:teamId','baseline-l2')");
    await navigate('http://127.0.0.1:4178/game/2');
    await waitForReactGameReady();
    await cdp.evaluate("document.querySelector('.maze-protractor-toggle')?.click()");
    await sleep(250);
    const readLayout = () => cdp.evaluate(`(() => {
      const canvas = document.querySelector('#game-container canvas')?.getBoundingClientRect();
      const shell = document.querySelector('.maze-canvas-shell')?.getBoundingClientRect();
      return {
        pressed: document.querySelector('.maze-protractor-toggle')?.getAttribute('aria-pressed'),
        canvas: canvas ? { left: canvas.left, right: canvas.right, width: canvas.width, height: canvas.height } : null,
        shell: shell ? { left: shell.left, right: shell.right, width: shell.width, height: shell.height } : null,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
      };
    })()`);
    const desktop = await readLayout();
    await shot('react-desktop-protractor-on');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 768, height: 1024, deviceScaleFactor: 1, mobile: false,
    });
    await cdp.evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(600);
    const tablet = await readLayout();
    await shot('react-tablet-protractor-after-resize');
    if (desktop.pressed !== 'true' || tablet.pressed !== 'true' ||
        tablet.canvas.width < 700 || tablet.documentWidth > tablet.viewportWidth + 1 ||
        Math.abs(tablet.canvas.width - tablet.shell.width) >= 2) {
      throw new Error(`Protractor did not remain aligned during responsive scaling: ${JSON.stringify({ desktop, tablet })}`);
    }
    await cdp.evaluate("document.querySelector('.maze-protractor-toggle')?.click()");
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await cdp.evaluate('window.dispatchEvent(new Event("resize"))');
    await sleep(300);
    return { desktop, tablet, protractorRemainedEnabled: true };
  });
  await scenario('react-phone-protractor-toggle', async () => {
    const read = () => cdp.evaluate(`(() => {
      const button = document.querySelector('.maze-protractor-toggle');
      return { label: button?.textContent.trim(), pressed: button?.getAttribute('aria-pressed'),
        position: document.querySelector('.maze-game-status')?.innerText.match(/Position\\s+([^\\n]+)/)?.[1],
        facing: document.querySelector('.maze-game-status')?.innerText.match(/Facing\\s+([^\\n]+)/)?.[1],
        moves: document.querySelector('.maze-game-status')?.innerText.match(/Moves\\s+([^\\n]+)/)?.[1] };
    })()`);
    const before = await read();
    await cdp.evaluate("document.querySelector('.maze-protractor-toggle')?.click()");
    await sleep(250);
    const enabled = await read();
    await shot('react-level2-phone-protractor-on');
    if (before.pressed !== 'false' || enabled.pressed !== 'true') {
      throw new Error('Protractor button did not toggle its accessible pressed state');
    }
    if (before.position !== enabled.position || before.facing !== enabled.facing || before.moves !== enabled.moves) {
      throw new Error('Protractor toggle changed gameplay position, bearing, or move count');
    }
    await cdp.evaluate(`Array.from(document.querySelectorAll('.maze-mobile-chip'))
      .find((button) => button.textContent.trim() === '+45')?.click()`);
    await cdp.evaluate("document.querySelector('.maze-mobile-action-btn-left')?.click()");
    await sleep(200);
    const afterTurn = await read();
    await shot('react-level2-phone-protractor-turn-45');
    if (!afterTurn.facing?.startsWith('225°') || afterTurn.moves !== '1') {
      throw new Error(`Expected left 45° from 180° to face 225° and count one turn; received ${afterTurn.facing}, ${afterTurn.moves}`);
    }
    await cdp.evaluate("document.querySelector('.maze-btn-reset')?.click()");
    await sleep(500);
    const afterRestart = await read();
    await shot('react-level2-phone-protractor-restart');
    if (afterRestart.pressed !== 'true' || afterRestart.position !== '(740, 60)' ||
      !afterRestart.facing?.startsWith('180°') || afterRestart.moves !== '0') {
      throw new Error('Scene restart did not restore the level state while retaining the Protractor preference');
    }
    await cdp.evaluate("document.querySelector('.maze-protractor-toggle')?.click()");
    await sleep(100);
    const disabled = await read();
    if (disabled.pressed !== 'false' || disabled.position !== afterRestart.position ||
      disabled.facing !== afterRestart.facing || disabled.moves !== afterRestart.moves) {
      throw new Error(`Hiding the Protractor changed its accessible state or gameplay values: ${JSON.stringify({ afterTurn, afterRestart, disabled })}`);
    }
    return { before, enabled, afterTurn, afterRestart, disabled, canvasCount: await cdp.evaluate('document.querySelectorAll("canvas").length') };
  });
  if (fetchInterceptionErrors.length) {
    throw new Error(`Unexpected Fetch interception errors: ${JSON.stringify(fetchInterceptionErrors)}`);
  }
  trace.staleFetchInterceptions = staleFetchInterceptions;
  trace.limitations.push('Headless browser frame observation is not a real mobile/GPU performance benchmark.', 'Fixture placement is used to isolate hazards/checkpoint/exit; these are not recorded full-maze solutions.', 'The isolated scene does not own React move counters or persistence; React observations are reported separately.', 'Real-device coverage remains unmeasured in this run.');
  trace.finishedAt = new Date().toISOString();
} catch (error) {
  trace.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  trace.apiRequests = apiRequests;
  trace.premiumAssetRequests = premiumAssetRequests;
  trace.fetchInterceptionErrors = fetchInterceptionErrors;
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'runtime-trace.json'), JSON.stringify(trace, null, 2));
  if (cdp) { try { await cdp.send('Browser.close', {}, 3000); } catch {} cdp.ws.close(); }
  if (chrome && !chrome.killed) chrome.kill();
  if (vite) await vite.close();
  api.close();
  console.log(`Evidence: ${output}`);
}
