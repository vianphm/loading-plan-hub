const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const ROOT = "y:/LD PLAN";
const OUT = path.join(ROOT, 'data', 'master_plan.json');

const ALIAS = {
  awb:       ['awb no.','awb no','awb','mawb','awbno','air waybill','no awb'],
  // "flight" and "connecting flight" are both a real flight number for that block's
  // shipments (some consolidator blocks label it "CONNECTING FLIGHT" for transshipment
  // cargo) - both feed the same field so it gets parsed instead of left blank.
  flight:    ['flight','flt','flt/carrier','flight no','flightno','connecting flight'],
  etd:       ['etd','etd ','date','date fly','ngay bay','etd date'],
  time_dep:  ['time dep','time departure','dep time','time_dep','dep'],
  cot:       ['cot','cut off','cutoff','cut-off time'],
  // NOTE: 'routing'/'route' used to be aliased into "dest" itself - some blocks have BOTH
  // a ROUTING column and a separate DEST column, and whichever appeared first in the header
  // row silently won the "dest" slot (often ROUTING, which is blank far more often than DEST
  // is), leaving the real destination code unread. They're routed to "connection" instead,
  // which mapRow() already uses as a fallback source for extractDest()'s 3-letter-code regex.
  dest:      ['dest','destination','final dest','final destination','des'],
  org:       ['org','origin','port of loading','pol'],
  agent:     ['agent','customer','cust','agent dba','debtor','forwarder','shipper','agent '],
  pcs:       ['pcs','pieces','piece','qty','quantity','pcs '],
  gw:        ['gw','gross weight','gw (kg)','gross weight (kg)','gwt','wt','weight','grosswt'],
  cw:        ['cw','chargeable weight','charge weight','charge weight (kg)','cw (kg)','cwt','cw '],
  cbm:       ['cbm','volume','vol','cbm ','volume (m3)','m3'],
  coload:    ['coload','co-load','co load','coloader','handling agent'],
  commodity: ['commodity','cmod','commoditydesc','cargo desc','description','goods'],
  connection:['2nd leg','connection flight','connection','connecting','2nd leg/transit','routing','route'],
  note:      ['note','notes','remark','remarks','ghi chu','ghi chú'],
  stt:       ['no','no.','stt','seq','#','priority'],
};

const ALIAS_LOOKUP = {};
Object.entries(ALIAS).forEach(([field, aliases]) => {
  aliases.forEach(a => { ALIAS_LOOKUP[a.trim().toLowerCase()] = field; });
});

function canonicalize(header) {
  if (!header) return null;
  // Trailing "." / ":" varies by sheet ("FLIGHT NO." vs the aliased "flight no") and would
  // otherwise silently miss a real header - strip it before matching instead of enumerating
  // every punctuation variant of every alias by hand.
  const h = String(header).trim().toLowerCase().replace(/[.:]+$/, '');
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

/** Excel merged cells (e.g. one DEST/FLT/ETD cell spanning several AWB sub-rows of the same
 * shipment) only carry their value in the merge's top-left cell - sheet_to_json's header:1
 * array leaves every other covered cell blank. Without this, most sub-rows of a multi-AWB
 * batch lose their DEST/FLT/ETD entirely (confirmed live: ~700 of 2272 records had a blank
 * dest, concentrated in sheets that merge these columns most, e.g. FREEHAND-FDR). Propagates
 * each merge's anchor value down/right to every cell the merge covers, so row-by-row parsing
 * downstream sees the same value sheet_to_json's own HTML/formatted view would show a person. */
function fillMergedCells(data, merges) {
  (merges || []).forEach(({ s, e }) => {
    const anchor = data[s.r] ? data[s.r][s.c] : undefined;
    if (anchor === undefined || anchor === null || anchor === '') return;
    for (let r = s.r; r <= e.r; r++) {
      if (!data[r]) continue;
      for (let c = s.c; c <= e.c; c++) {
        if (data[r][c] === undefined || data[r][c] === null || data[r][c] === '') {
          data[r][c] = anchor;
        }
      }
    }
  });
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
    fillMergedCells(data, ws['!merges']);

    // A single sheet is usually several "LOADING PLAN FOR <flight>/<date>" mini-tables
    // stacked vertically, one per flight - and different mini-tables can have different
    // column layouts (an extra ROUTING column, "FLIGHT" renamed to "CONNECTING FLIGHT",
    // a CW column some blocks lack, DEBTOR shifted a column over...). Re-detecting the
    // header for every block instead of once per sheet is what makes this correct; using
    // one column layout for the whole sheet silently fed later blocks' data through an
    // earlier block's column positions whenever the two didn't match.
    let colMap = null;
    let sheetCount = 0;

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!row || row.every(c => c === '' || c == null)) continue;

      // Banner/separator rows between blocks - the title line ("LOADING PLAN FOR
      // OD572/01JUL") and the COT/ETD line immediately under it ("COT: 4 hours before
      // ETD..."). Neither is a header or a data row; always skip both.
      if (row.some(c => /loading plan/i.test(String(c)))) continue;
      if (row.some(c => /^(cot|etd)\s*:/i.test(String(c).trim()))) continue;

      // Does this row look like a new block's header? Only real header text exactly
      // matches an alias (data cell values like AWB numbers or 3-letter city codes never
      // do), so a handful of matches reliably means "this is a header row", not a
      // coincidental match inside a data row.
      const candidateMap = {};
      row.forEach((h, idx) => {
        const field = canonicalize(h);
        if (field && !(field in candidateMap)) candidateMap[field] = idx;
      });
      const candidateUseful = ['dest', 'flight', 'awb', 'agent'].some((f) => f in candidateMap);
      if (candidateUseful && Object.keys(candidateMap).length >= 3) {
        colMap = candidateMap;
        continue; // this row IS the header, not a data row
      }

      if (!colMap) continue; // no block header established yet (still in a title/banner row run)

      // Each block ends with its own subtotal row ("TOTAL", "Total:") - never real
      // shipment data, and its awb/dest/agent are blank often enough that it wasn't
      // reliably caught by mapRow()'s own emptiness check when a nonzero weight total
      // landed in one of those blank-elsewhere columns.
      if (row.some((c) => /^total:?$/i.test(String(c).trim()))) continue;

      const rec = mapRow(row, colMap, sheetName, file);
      if (!rec) continue;
      // Backstop for banner-text/label-row variants the two regexes above don't cover
      // ("PLAN VJ SIN 02JUL", "FS - ACP PLAN", a bare "Date:"/"Departure Time:" row, a COT
      // note embedded mid-sentence...) - no real shipment weighs 0kg, so gw===cw===0 means
      // this is title/label text that landed in the data columns, not cargo, regardless of
      // wording (a stray PCS count sometimes survives on these rows too, so pcs alone isn't
      // a reliable enough signal - checked weight only).
      if (rec.gw === 0 && rec.cw === 0) continue;
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
