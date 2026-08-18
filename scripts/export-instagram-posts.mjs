import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { socialDesigns } from '../social/designs.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const outputRoot = path.join(repositoryRoot, 'exports', 'instagram');
const packageDirectory = path.join(outputRoot, 'una-voce-first-3-posts');
const zipPath = path.join(outputRoot, 'una-voce-first-3-posts.zip');
const port = 4187;
const baseUrl = `http://127.0.0.1:${port}`;
const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = chromeCandidates.find(existsSync);
const vitePath = path.join(repositoryRoot, 'node_modules', '.bin', 'vite');

if (!chromePath) {
  throw new Error('Google Chrome or Chromium is required to export social artwork.');
}

if (!existsSync(vitePath)) {
  throw new Error('Vite is not installed. Run npm install before exporting social artwork.');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pngDimensions(buffer) {
  const signature = buffer.subarray(1, 4).toString('ascii');
  if (signature !== 'PNG') throw new Error('Chrome did not produce a PNG image.');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function waitForServer(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function captureSlide({ exportUrl, outputPath, profilePath, filename }) {
  await rm(outputPath, { force: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--disable-gpu',
    '--disable-sync',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--no-default-browser-check',
    '--no-first-run',
    '--force-device-scale-factor=1',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=2500',
    '--window-size=1080,1350',
    `--user-data-dir=${profilePath}`,
    `--screenshot=${outputPath}`,
    exportUrl,
  ], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  });

  let previousSize = -1;
  let stableReads = 0;
  let image;
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < 20000) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        image = await readFile(outputPath);
        const dimensions = pngDimensions(image);

        if (dimensions.width !== 1080 || dimensions.height !== 1350) {
          throw new Error(`${filename} is ${dimensions.width} × ${dimensions.height}, expected 1080 × 1350.`);
        }

        stableReads = image.length === previousSize ? stableReads + 1 : 0;
        previousSize = image.length;
        if (stableReads >= 2) return image;
      } catch (error) {
        if (error.code !== 'ENOENT' && !String(error.message).includes('Chrome did not produce a PNG')) {
          throw error;
        }
      }

      if (chrome.exitCode !== null && !image) {
        throw new Error(`Chrome exited before exporting ${filename}.`);
      }
    }

    throw new Error(`Timed out exporting ${filename}.`);
  } finally {
    if (chrome.exitCode === null) chrome.kill('SIGTERM');
  }
}

await mkdir(packageDirectory, { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'una-voce-social-export-'));
const server = spawn(vitePath, ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: repositoryRoot,
  stdio: 'ignore',
});

try {
  await waitForServer(`${baseUrl}/social/export.html`);

  const selectedDesigns = socialDesigns.slice(0, 3);
  const exportedFiles = [];
  const captionSections = [];

  for (const design of selectedDesigns) {
    const postSlug = slugify(design.title);
    const captionFilename = `post-${design.number}-${postSlug}-caption.txt`;
    await writeFile(path.join(packageDirectory, captionFilename), `${design.caption.trim()}\n`, 'utf8');
    exportedFiles.push(captionFilename);
    captionSections.push(`POST ${design.number}: ${design.title}\n\n${design.caption.trim()}`);

    for (const [slideIndex] of design.slides.entries()) {
      const slideNumber = String(slideIndex + 1).padStart(2, '0');
      const filename = `post-${design.number}-${postSlug}-slide-${slideNumber}.png`;
      const outputPath = path.join(packageDirectory, filename);
      const profilePath = path.join(temporaryDirectory, `chrome-${design.number}-${slideNumber}`);
      const exportUrl = `${baseUrl}/social/export.html?design=${encodeURIComponent(design.id)}&slide=${slideIndex + 1}`;
      await captureSlide({ exportUrl, outputPath, profilePath, filename });
      exportedFiles.push(filename);
    }
  }

  await writeFile(
    path.join(packageDirectory, 'captions.txt'),
    `${captionSections.join('\n\n========================================\n\n')}\n`,
    'utf8',
  );
  exportedFiles.push('captions.txt');

  const manifest = {
    collection: 'Una Voce first three Instagram posts',
    format: '1080 × 1350 PNG',
    posts: selectedDesigns.map((design) => ({
      number: design.number,
      id: design.id,
      title: design.title,
      slides: design.slides.length,
    })),
    files: exportedFiles.sort(),
  };
  await writeFile(
    path.join(packageDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  await rm(zipPath, { force: true });
  const zipResult = spawnSync('zip', [
    '-X',
    '-q',
    '-r',
    zipPath,
    path.basename(packageDirectory),
  ], {
    cwd: outputRoot,
    encoding: 'utf8',
  });

  if (zipResult.status !== 0) {
    throw new Error(`Could not create ZIP package: ${zipResult.stderr || zipResult.stdout}`);
  }

  console.log(`Exported ${selectedDesigns.length} posts and ${selectedDesigns.reduce((sum, design) => sum + design.slides.length, 0)} slides.`);
  console.log(packageDirectory);
  console.log(zipPath);
} finally {
  server.kill('SIGTERM');
  await rm(temporaryDirectory, { recursive: true, force: true });
}
