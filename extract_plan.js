const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const ROOT = "y:/LD PLAN";
const OUT = path.join(ROOT, 'data', 'master_plan.json');

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

const ALIAS_LOOKUP = {};
Object.entries(ALIAS).forEach(([field, aliases]) => {
  aliases.forEach(a => { ALIAS_LOOKUP[a.trim().toLowerCase()] = field; });
});

function canonicalize(header) {
  if (!header) return null;
  const h = String(header).trim().toLowerCase();
  return ALIAS_LOOKUP[h] || null;
}

function extractCarrier(flight) {
  if (!flight) return { carrier: '', flightNum: '' };
  const f = String(flight).trim();
  // Lấy đúng 2 ký tự đầu làm hãng (carrier), phần còn lại làm số hiệu chuyến bay
  const m = f.match(/^([A-Za-z0-9]{2})\s*(.*)$/);
  if (m) {
    return { carrier: m[1].toUpperCase(), flightNum: m[2].trim() };
  }
  return { carrier: '', flightNum: f };
}

function extractDest(rawDest, routing) {
  const src = rawDest || routing || '';
  const codes = String(src).toUpperCase().match(/\b([A-Z]{3})\b/g);
  if (codes && codes.length > 0) return codes[codes.length - 1];
  if (/^[A-Z]{3}$/i.test(src.trim())) return src.trim().toUpperCase();
  return '';
}

function parseWeight(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/,/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function cleanText(val) {
  return val ? String(val).trim().replace(/\s+/g, ' ') : '';
}

function findHeaderRow(data) {
  let headerRow = 0, maxFilled = 0;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const filled = data[i].filter(c => c !== '' && c != null).length;
    if (filled > maxFilled) { maxFilled = filled; headerRow = i; }
  }
  return { headerRow, maxFilled };
}

function mapRow(rawRow, colMap, sheetName, fileName) {
  const rec = {};
  Object.entries(colMap).forEach(([field, colIdx]) => {
    rec[field] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
  });

  const rawFlight = cleanText(rec.flight);
  const fInfo = extractCarrier(rawFlight);
  const carrier = fInfo.carrier;
  const flight = fInfo.flightNum;

  const dest = extractDest(cleanText(rec.dest), cleanText(rec.connection));
  let org = cleanText(rec.org);
  if (!org && rec.dest) {
    const codes = String(rec.dest).toUpperCase().match(/\b([A-Z]{3})\b/g);
    if (codes && codes.length >= 2) org = codes[0];
  }

  const gw  = parseWeight(rec.gw);
  const cw  = parseWeight(rec.cw) || gw; // Fallback to GW if no CW
  // Theo quy tắc Hàng không (Air Freight), user yêu cầu Thể tích (CBM) = CW * 0.006
  const cbm = cw * 0.006;
  const pcs = parseInt(String(rec.pcs).trim(), 10) || 0;

  const agent = cleanText(rec.agent);
  const awb = cleanText(rec.awb);
  const etd = cleanText(rec.etd);

  if (!awb && !agent && !dest && cw === 0) return null;
  if (awb && /awb|no\.|flight|dest/i.test(awb)) return null;

  return {
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
    fileName,
    company: sheetName // <--- Capture Company directly from sheetName!
  };
}

const xlsxFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$')).sort();
let allRecords = [];
let id = 1;

xlsxFiles.forEach(file => {
  const filePath = path.join(ROOT, file);
  console.log(`\n📄 ${file}`);
  let wb;
  try { wb = XLSX.readFile(filePath, { cellDates: false, raw: false }); } catch (e) { return; }

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    if (data.length < 2) return;
    const { headerRow, maxFilled } = findHeaderRow(data);
    if (maxFilled < 3) return;

    const headers = data[headerRow];
    const colMap = {};
    headers.forEach((h, idx) => {
      const field = canonicalize(h);
      if (field && !(field in colMap)) colMap[field] = idx;
    });

    const hasUsefulData = ['dest','flight','awb','agent'].some(f => f in colMap);
    if (!hasUsefulData) return;

    let sheetCount = 0;
    for (let r = headerRow + 1; r < data.length; r++) {
      const rawRow = data[r];
      if (!rawRow || rawRow.every(c => c === '' || c == null)) continue;
      const rec = mapRow(rawRow, colMap, sheetName, file);
      if (!rec) continue;
      rec.id = id++;
      allRecords.push(rec);
      sheetCount++;
    }
    console.log(`   └─ [${sheetName}]: ${sheetCount} records`);
  });
});

fs.writeFileSync(OUT, JSON.stringify(allRecords, null, 2), 'utf8');

const totalCw = allRecords.reduce((s,r) => s + r.cw, 0);
console.log(`\n✅ Tổng cộng ${allRecords.length} records, Tổng CW: ${Math.round(totalCw).toLocaleString()} kg`);
console.log(`📊 Saved → ${OUT}`);
