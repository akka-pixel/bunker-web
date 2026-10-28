import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STATIC_DIR = path.join(ROOT_DIR, 'static');
const PUBLIC_STATIC_DIR = path.join(PUBLIC_DIR, 'static');

// 1. Compute deterministic UI version hash from all UI shell files
const uiFiles = [
  path.join(PUBLIC_DIR, 'index.html'),
  path.join(PUBLIC_DIR, 'calendar.html'),
  path.join(PUBLIC_DIR, 'feedback.html'),
  path.join(STATIC_DIR, 'app.js'),
  path.join(STATIC_DIR, 'style.css'),
  path.join(STATIC_DIR, 'calendar.js'),
  path.join(STATIC_DIR, 'calendar.css'),
  path.join(STATIC_DIR, 'legal.js'),
  path.join(STATIC_DIR, 'manifest.json'),
];

const hash = crypto.createHash('sha256');
for (const filePath of uiFiles) {
  if (fs.existsSync(filePath)) {
    hash.update(fs.readFileSync(filePath));
  }
}
const uiVersion = `bunker-ui-${hash.digest('hex').slice(0, 10)}`;

// 2. Stamp UI_VERSION into static/sw.js so Service Worker rolls out new UI automatically
const swPath = path.join(STATIC_DIR, 'sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf-8');
  const updatedSw = swContent.replace(
    /const UI_VERSION = ['"][^'"]+['"];/,
    `const UI_VERSION = '${uiVersion}';`
  );
  fs.writeFileSync(swPath, updatedSw, 'utf-8');
}

// 3. Write ui-version.json for zero-function-invocation Edge CDN UI version checks
const versionPayload = JSON.stringify({ version: uiVersion });
fs.writeFileSync(path.join(STATIC_DIR, 'ui-version.json'), versionPayload, 'utf-8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'ui-version.json'), versionPayload, 'utf-8');

// 4. Mirror static/* into public/static/* and root static files into public/*
//    so Vercel Edge CDN serves 100% of static files directly with 0 Serverless Function invocations
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirSync(STATIC_DIR, PUBLIC_STATIC_DIR);

const rootMirroredFiles = [
  'sw.js',
  'manifest.json',
  'favicon.ico',
  'favicon.png',
  'favicon.svg',
  'apple-touch-icon.png',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
];
for (const fileName of rootMirroredFiles) {
  const srcFile = path.join(STATIC_DIR, fileName);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(PUBLIC_DIR, fileName));
  }
}

// 5. Verify syntax of server.js and static/app.js
execSync('node --check server.js', { cwd: ROOT_DIR, stdio: 'inherit' });
execSync('node --check static/app.js', { cwd: ROOT_DIR, stdio: 'inherit' });
execSync('node --check static/sw.js', { cwd: ROOT_DIR, stdio: 'inherit' });

console.log(`[Build] UI Version stamped: ${uiVersion}`);
