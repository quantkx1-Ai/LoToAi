/**
 * Script đóng gói toàn bộ tài nguyên Web vào thư mục www/ chuẩn Capacitor (Android & iOS)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const WWW = path.join(ROOT, 'www');
const WWW_JS = path.join(WWW, 'js');
const WWW_ICONS = path.join(WWW, 'icons');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfExists(srcPath, destPath) {
  if (fs.existsSync(srcPath)) {
    ensureDir(path.dirname(destPath));
    fs.copyFileSync(srcPath, destPath);
    console.log('✓ Đã đóng gói:', path.relative(ROOT, destPath));
    return true;
  }
  return false;
}

ensureDir(WWW);
ensureDir(WWW_JS);
ensureDir(WWW_ICONS);

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="256" cy="210" r="110" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="10"/>
  <text x="256" y="238" font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="#ffffff" text-anchor="middle">68</text>
  <rect x="96" y="360" width="320" height="64" rx="32" fill="#2563eb"/>
  <text x="256" y="403" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">LOTO AI PRO</text>
</svg>`;

fs.writeFileSync(path.join(WWW_ICONS, 'icon-512.svg'), iconSvg, 'utf8');
fs.writeFileSync(path.join(WWW, 'icon-512.svg'), iconSvg, 'utf8');
fs.writeFileSync(path.join(ROOT, 'icon-512.svg'), iconSvg, 'utf8');

['index.html', 'privacy-policy.html', 'manifest.json', 'sw.js', 'monetization.js'].forEach(file => {
  copyIfExists(path.join(ROOT, file), path.join(WWW, file));
});

// Canonical engine.js at root -> sync to js/engine.js, www/engine.js, www/js/engine.js
const engRoot = path.join(ROOT, 'engine.js');
if (fs.existsSync(engRoot)) {
  copyIfExists(engRoot, path.join(ROOT, 'js', 'engine.js'));
  copyIfExists(engRoot, path.join(WWW, 'engine.js'));
  copyIfExists(engRoot, path.join(WWW_JS, 'engine.js'));
}

console.log('🎉 Đóng gói thư mục www/ hoàn tất!');
