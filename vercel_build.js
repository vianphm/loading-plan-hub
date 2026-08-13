const fs = require('fs');
const path = require('path');

// Extract Vercel commit SHA or use timestamp
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
let version = commitSha ? commitSha.substring(0, 7) : Date.now().toString();

const versionData = {
    ts: Date.now(),
    version: version,
    buildTime: new Date().toISOString()
};

const versionPath = path.join(__dirname, 'data', 'version.json');
if (fs.existsSync(path.dirname(versionPath))) {
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 4));
    console.log(`[Vercel Build] Successfully updated version.json to version: ${version}`);
} else {
    console.log("[Vercel Build] Warning: data directory not found");
}

const htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/app\.js(\?v=[^"']*)?/g, `app.js?v=${version}`);
    html = html.replace(/style\.css(\?v=[^"']*)?/g, `style.css?v=${version}`);
    fs.writeFileSync(htmlPath, html);
    console.log(`[Vercel Build] Successfully injected cache buster into index.html: ?v=${version}`);
}
