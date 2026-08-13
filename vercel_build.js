const fs = require('fs');
const path = require('path');

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
const shortSha = commitSha.substring(0, 7);

const versionPath = path.join(__dirname, 'data', 'version.json');
let patchVersion = 1;
let majorMinor = 'v1.1';

if (fs.existsSync(versionPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    if (prev.version) {
      const cleanVer = String(prev.version).replace(/^v/, '');
      const parts = cleanVer.split('.');
      if (parts.length >= 2) {
        majorMinor = `v${parts[0]}.${parts[1]}`;
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum) && lastNum < 10000) {
          patchVersion = lastNum + 1;
        }
      }
    }
  } catch (e) {
    console.error('Error reading previous version.json:', e);
  }
}

const displayVersion = `${majorMinor}.${patchVersion}`;

const versionData = {
  ts: Date.now(),
  version: displayVersion,
  commit: shortSha,
  buildTime: new Date().toISOString()
};

if (fs.existsSync(path.dirname(versionPath))) {
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  console.log(`[Vercel Build] Updated version.json: ${displayVersion} (Commit: ${shortSha})`);
}

const htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/app\.js(\?v=[^"']*)?/g, `app.js?v=${displayVersion}`);
  html = html.replace(/style\.css(\?v=[^"']*)?/g, `style.css?v=${displayVersion}`);
  fs.writeFileSync(htmlPath, html);
  console.log(`[Vercel Build] Injected cache buster into index.html: ?v=${displayVersion}`);
}
