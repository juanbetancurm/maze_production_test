import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const premiumRoot = path.join(frontendRoot, 'dist', 'assets', 'premium');
const distRoot = path.join(frontendRoot, 'dist');
const sourceArchiveRoot = path.join(frontendRoot, '..', 'docs', 'graphics-upgrade', 'source-assets');
const maxPremiumBytes = 8_000_000;
const expectedAssets = new Map([
  ['characters/golem-static-v2.png', 1_100_000],
  ['characters/player-normal.png', 1_050_000],
  ['characters/player-topdown-v2.png', 1_050_000],
  ['characters/player-walk-cycle-v2-2x.png', 150_000],
  ['environment/grass-reference-v4.jpg', 500_000],
  ['environment/grass-reference-v4-normal.png', 2_500_000],
  ['environment/wall-join-v1.png', 10_000],
  ['environment/walls-reference-kit.png', 950_000],
  ['objects/checkpoint-active-v3.webp', 120_000],
  ['objects/checkpoint-claimed-v3.webp', 120_000],
  ['objects/exit-base-v1.png', 30_000],
]);

async function listFiles(directory, base = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute, base));
    else if (entry.isFile()) files.push(path.relative(base, absolute).split(path.sep).join('/'));
  }
  return files;
}

function readPngDimensions(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Walk atlas is not a valid PNG with an IHDR header');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

try {
  const manifestPath = path.join(frontendRoot, 'src', 'game', 'visuals', 'assetManifest.js');
  const manifest = await fs.readFile(manifestPath, 'utf8');
  const manifestAssets = [...new Set(
    [...manifest.matchAll(/\/assets\/premium\/([^'"\s]+)/g)].map(([, asset]) => asset),
  )].sort();
  const expectedManifestAssets = [...expectedAssets.keys()].sort();
  if (JSON.stringify(manifestAssets) !== JSON.stringify(expectedManifestAssets)) {
    throw new Error(`Asset manifest mismatch. Manifest: ${manifestAssets.join(', ')}. Budget: ${expectedManifestAssets.join(', ')}.`);
  }

  const actualFiles = await listFiles(premiumRoot);
  const missing = [...expectedAssets.keys()].filter(asset => !actualFiles.includes(asset));
  const unexpected = actualFiles.filter(asset => !expectedAssets.has(asset));
  if (missing.length || unexpected.length) {
    throw new Error(`Premium asset inventory mismatch. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`);
  }

  const archivedImageNames = new Set((await listFiles(sourceArchiveRoot))
    .filter(asset => /\.(?:png|jpe?g|webp)$/i.test(asset))
    .map(asset => path.posix.basename(asset)));
  const distFiles = await listFiles(distRoot);
  const archivedAssetsInBuild = distFiles.filter(asset => archivedImageNames.has(path.posix.basename(asset)));
  if (archivedAssetsInBuild.length) {
    throw new Error(`Archived candidate art found in dist: ${archivedAssetsInBuild.join(', ')}.`);
  }

  let totalBytes = 0;
  for (const [asset, maxBytes] of expectedAssets) {
    const stats = await fs.stat(path.join(premiumRoot, asset));
    totalBytes += stats.size;
    if (stats.size > maxBytes) {
      throw new Error(`${asset} is ${stats.size} bytes; its per-asset limit is ${maxBytes}.`);
    }
  }

  const atlasPath = path.join(premiumRoot, 'characters', 'player-walk-cycle-v2-2x.png');
  const atlasSize = readPngDimensions(await fs.readFile(atlasPath));
  if (atlasSize.width !== 384 || atlasSize.height !== 384) {
    throw new Error(`Expected 384 × 384 walk atlas, received ${atlasSize.width} × ${atlasSize.height}.`);
  }
  if (totalBytes > maxPremiumBytes) {
    throw new Error(`Premium assets total ${totalBytes} bytes; the build budget is ${maxPremiumBytes}.`);
  }

  console.log(`Premium asset gate passed: ${totalBytes.toLocaleString()} / ${maxPremiumBytes.toLocaleString()} bytes across ${actualFiles.length} assets; walk atlas ${atlasSize.width} × ${atlasSize.height}.`);
} catch (error) {
  console.error(`Premium asset gate failed: ${error.message}`);
  process.exitCode = 1;
}
