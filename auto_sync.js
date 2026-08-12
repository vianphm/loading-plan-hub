/**
 * AUTO SYNC - Loading Plan Hub
 * Tự động: phát hiện Excel mới → extract JSON → git commit → push → Vercel auto-deploy
 */

const chokidar = require('chokidar');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const LOG_FILE = path.join(ROOT, 'auto_sync.log');

function log(msg) {
  const line = `[${new Date().toLocaleString('vi-VN')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: e.message };
  }
}

async function extractAndSync(changedFile) {
  log(`📂 Phát hiện thay đổi: ${path.basename(changedFile)}`);

  // 1. Chạy extraction script
  log('⚙️  Đang extract dữ liệu từ tất cả file Excel...');
  const extractScript = path.join(ROOT, 'extract_plan.js');
  
  if (!fs.existsSync(extractScript)) {
    // Fallback: dùng PowerShell script nếu có
    const psScript = path.join(ROOT, 'extract_all.ps1');
    if (fs.existsSync(psScript)) {
      const r = run(`powershell -ExecutionPolicy Bypass -File "${psScript}"`);
      if (!r.ok) { log('❌ Extract lỗi: ' + r.out); return; }
    } else {
      log('⚠️  Không tìm thấy extract script, bỏ qua extraction.');
    }
  } else {
    const r = run(`node "${extractScript}"`);
    if (!r.ok) { log('❌ Extract lỗi: ' + r.out); return; }
  }
  log('✅ Extract thành công!');

  // 2. Git add + commit + push
  log('📤 Đang commit và push lên GitHub...');
  
  const timestamp = new Date().toLocaleString('vi-VN');
  const filename = path.basename(changedFile);
  
  // Add chỉ các file quan trọng (không add Excel)
  run('git add data/master_plan.json index.html style.css app.js vercel.json package.json analyze.js server.js');
  
  const commitMsg = `data: Cập nhật từ ${filename} - ${timestamp}`;
  const commitResult = run(`git commit -m "${commitMsg}"`);
  
  if (!commitResult.ok && commitResult.out.includes('nothing to commit')) {
    log('ℹ️  Không có thay đổi mới để commit.');
    return;
  }
  
  if (!commitResult.ok) {
    log('❌ Commit lỗi: ' + commitResult.out);
    return;
  }
  
  log('✅ Committed: ' + commitMsg);
  
  const pushResult = run('git push origin master');
  if (!pushResult.ok) {
    log('❌ Push lỗi: ' + pushResult.out);
    return;
  }
  
  log('🚀 Đã push thành công! Vercel sẽ tự động deploy trong ~30 giây.');
  log('🌐 URL: https://loading-plan-hub.vercel.app');
}

// Debounce để tránh trigger nhiều lần
let debounceTimer = null;
function debounced(file) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => extractAndSync(file), 3000);
}

// Theo dõi file Excel
const watcher = chokidar.watch(path.join(ROOT, '*.xlsx'), {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 }
});

watcher
  .on('add', (f) => { log(`➕ File mới: ${path.basename(f)}`); debounced(f); })
  .on('change', (f) => { log(`✏️  File thay đổi: ${path.basename(f)}`); debounced(f); });

log('👁️  Auto Sync đang chạy... Đang theo dõi thư mục LD PLAN');
log('📁 Thư mục: ' + ROOT);
log('📌 Mọi thay đổi Excel sẽ tự động sync lên Vercel!');
log('─'.repeat(60));
