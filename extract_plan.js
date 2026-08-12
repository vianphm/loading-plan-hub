/**
 * extract_plan.js
 * Smart Air Freight Data Extractor - handles all sheet layouts automatically
 * Fields: awb, flight, carrier, etd, org, dest, agent, pcs, gw, cw, cbm,
 *         coload, commodity, connection, cot, time_dep, note, sheetName, fileName
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

// ── COLUMN ALIAS MAP ─────────────────────────────────────────────────────────
// Maps various header spellings → canonical field name
const ALIAS = {
  awb:       ['awb no.','awb no','awb','mawb','awbno','air waybill','no awb'],
  flight:    ['flight','flt','flt/carrier','flight no','flightno'],
  etd:       ['etd','etd ','date','date fly','ngay bay','etd date'],
  time_dep:  ['time dep','time departure','dep time','time_dep','dep'],
  cot:       ['cot','cut off','cutoff','cut-off time'],
  dest:      ['dest','destination','final dest','final destination','routing','route','des'],
  org:       ['org','origin','port of loading','pol'],
  agent:     ['agent','customer','cust','agent dba','debtor','forwarder','shipper','agent '],
  pcs:       ['pcs','pieces','piece','qty','quantity','pcs '],
  gw:        ['gw','gross weight','gw (kg)','gross weight (kg)','gwt','wt','weight','grosswt'],
  cw:        ['cw','chargeable weight','charge weight','charge weight (kg)','cw (kg)','cwt','cw '],
  cbm:       ['cbm','volume','vol','cbm ','volume (m3)','m3'],
  coload:    ['coload','co-load','co load','coloader','handling agent'],
  commodity: ['commodity','cmod','commoditydesc','cargo desc','description','goods'],
  connection:['2nd leg','connection flight','connection','connecting','2nd leg/transit'],
  note:      ['note','notes','remark','remarks','ghi chu','ghi chú'],
  stt:       ['no','no.','stt','seq','#','priority'],
};

// Build reverse lookup: lowercase alias → canonical
const ALIAS_LOOKUP = {};
Object.entries(ALIAS).forEach(([field, aliases]) => {
  aliases.forEach(a => { ALIAS_LOOKUP[a.trim().toLowerCase()] = field; });
});

function canonicalize(header) {
  if (!header) return null;
  const h = String(header).trim().toLowerCase();
  return ALIAS_LOOKUP[h] || null;
}

// Extract carrier code from flight string: "VJ932" → "VJ", "ET609" → "ET"
function extractCarrier(flight) {
  if (!flight) return '';
  const m = String(flight).trim().match(/^([A-Z0-9]{2,3})\s*\d/i);
  return m ? m[1].toUpperCase() : '';
}

// Extract first valid IATA code from routing string: "HAN-BKK-LHR" → "LHR" (final dest)
function extractDest(rawDest, routing) {
  const src = rawDest || routing || '';
  // Try to find all IATA codes (3 uppercase letters)
  const codes = String(src).toUpperCase().match(/\b([A-Z]{3})\b/g);
  if (codes && codes.length > 0) {
    // Return last code = final destination
    return codes[codes.length - 1];
  }
  // Fallback: if rawDest is exactly 3 alpha chars
  if (/^[A-Z]{3}$/i.test(src.trim())) return src.trim().toUpperCase();
  return '';
}

// Parse weight value: "1,234.5 kg" → 1234.5
function parseWeight(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/,/g, ""); const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// Clean text value
function cleanText(val) {
  return val ? String(val).trim().replace(/\s+/g, ' ') : '';
}

// Find header row: row with most non-empty cells in first 15 rows
function findHeaderRow(data) {
  let headerRow = 0, maxFilled = 0;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const filled = data[i].filter(c => c !== '' && c != null).length;
    if (filled > maxFilled) { maxFilled = filled; headerRow = i; }
  }
  return { company: sheetName, headerRow, maxFilled };
}

// Map a raw data row to canonical fields using the detected column map
function mapRow(rawRow, colMap, sheetName, fileName) {
  const rec = {};
  Object.entries(colMap).forEach(([field, colIdx]) => {
    rec[field] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
  });

  // Carrier: extract from flight
  const flight = cleanText(rec.flight);
  const carrier = extractCarrier(flight);

  // Destination: handle ROUTING vs DEST
  const dest = extractDest(
    cleanText(rec.dest),
    cleanText(rec.connection) // fallback
  );

  // If dest looks like a full routing "HAN-BKK", extract origin too
  let org = cleanText(rec.org);
  if (!org && rec.dest) {
    const codes = String(rec.dest).toUpperCase().match(/\b([A-Z]{3})\b/g);
    if (codes && codes.length >= 2) org = codes[0]; // First code = origin
  }

  // Weights
  const gw  = parseWeight(rec.gw);
  const cw  = parseWeight(rec.cw) || gw; // Fallback to GW if no CW
  const cbm = parseWeight(rec.cbm);
  const pcs = parseInt(String(rec.pcs || '0').replace(/[^0-9]/g, ''), 10) || 0;

  // Agent/Customer
  const agent = cleanText(rec.agent);

  // AWB: normalize format
  const awb = cleanText(rec.awb);

  // ETD date
  const etd = cleanText(rec.etd);

  // Skip rows with no meaningful data
  if (!awb && !agent && !dest && cw === 0) return null; rec.company = sheetName;
  // Skip header-like rows that leaked through
  if (awb && /awb|no\.|flight|dest/i.test(awb)) return null;

  return { company: sheetName,
    awb, flight, carrier,
    etd, time_dep: cleanText(rec.time_dep),
    cot: cleanText(rec.cot),
    org, dest,
    agent,
    pcs, gw, cw, cbm,
    coload:    cleanText(rec.coload),
    commodity: cleanText(rec.commodity),
    connection:cleanText(rec.connection),
    note:      cleanText(rec.note),
    sheetName,
    fileName
  };
}

// ── MAIN EXTRACTION ──────────────────────────────────────────────────────────
const ROOT   = __dirname;
const OUT    = path.join(ROOT, 'data', 'master_plan.json');
const xlsxFiles = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
  .sort();

if (xlsxFiles.length === 0) {
  console.error('❌ Không tìm thấy file .xlsx nào!');
  process.exit(1);
}

console.log(`📂 Tìm thấy ${xlsxFiles.length} file Excel`);

let allRecords = [];
let id = 1;

xlsxFiles.forEach(file => {
  const filePath = path.join(ROOT, file);
  console.log(`\n  📄 ${file}`);

  let wb;
  try {
    wb = XLSX.readFile(filePath, { cellDates: false, raw: false });
  } catch (e) {
    console.log(`     ⚠️  Không đọc được: ${e.message}`);
    return;
  }

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    if (data.length < 2) return;

    const { headerRow, maxFilled } = findHeaderRow(data);
    if (maxFilled < 3) return; // Too few columns - skip

    const headers = data[headerRow];

    // Build column map: canonical field → column index
    const colMap = {};
    headers.forEach((h, idx) => {
      const field = canonicalize(h);
      if (field && !(field in colMap)) colMap[field] = idx;
    });

    // Need at least one of: dest, flight, awb, or agent
    const hasUsefulData = ['dest','flight','awb','agent'].some(f => f in colMap);
    if (!hasUsefulData) return;

    let sheetCount = 0;
    for (let r = headerRow + 1; r < data.length; r++) {
      const rawRow = data[r];
      if (!rawRow || rawRow.every(c => c === '' || c == null)) continue;

      const rec = mapRow(rawRow, colMap, sheetName, file);
      if (!rec) continue;

      // Assign sequential ID
      rec.id = id++;
      allRecords.push(rec);
      sheetCount++;
    }
    console.log(`     Sheet "${sheetName}": ${sheetCount} records`);
  });
});

// Save output
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(allRecords, null, 2), 'utf8');

console.log(`\n✅ Tổng cộng ${allRecords.length} records`);
console.log(`📊 Saved → ${OUT}`);

// Quick stats
const validDest   = allRecords.filter(r => /^[A-Z]{3}$/.test(r.dest));
const validAgent  = allRecords.filter(r => r.agent && /[A-Za-z]/.test(r.agent));
const totalCw     = allRecords.reduce((s,r) => s + r.cw, 0);
const carriers    = [...new Set(allRecords.map(r=>r.carrier).filter(Boolean))];

console.log(`   Valid DEST: ${validDest.length} | Valid Agent: ${validAgent.length}`);
console.log(`   Total CW: ${Math.round(totalCw).toLocaleString()} kg`);
console.log(`   Carriers: ${carriers.join(', ')}`);
console.log(`   Top Agents:`, Object.entries(
  allRecords.filter(r=>r.agent && /[A-Za-z]/.test(r.agent))
    .reduce((m,r)=>{ const a=r.agent.toUpperCase(); m[a]=(m[a]||0)+r.cw; return m; }, {})
).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([a,c])=>`${a}(${Math.round(c)}kg)`).join(', '));
