const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'master_plan.json');

if (!fs.existsSync(dataPath)) {
  console.log("File data/master_plan.json chưa tồn tại.");
  process.exit(1);
}

let raw = fs.readFileSync(dataPath, 'utf8');
raw = raw.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
const data = JSON.parse(raw);

console.log(`=======================================================`);
console.log(`=== BÁO CÁO PHÂN TÍCH CHUYÊN SÂU DỮ LIỆU LD PLAN ===`);
console.log(`=== TỔNG BẢN GHI KHAI THÁC: ${data.length.toLocaleString('vi-VN')} VẬN ĐƠN ===`);
console.log(`=======================================================\n`);

// 1. Executive Summary
let totalPcs = 0, totalGw = 0, totalCw = 0, totalCbm = 0;
data.forEach(item => {
  totalPcs += Number(item.pcs) || 0;
  totalGw += Number(item.gw) || 0;
  totalCw += Number(item.cw) || 0;
  totalCbm += Number(item.cbm) || 0;
});

const cwGwRatio = totalGw > 0 ? (totalCw / totalGw).toFixed(2) : 0;
const cwCbmRatio = totalCbm > 0 ? (totalCw / totalCbm).toFixed(2) : 0;

console.log("--- 1. TỔNG QUAN SẢN LƯỢNG KHO VẬN ---");
console.log(`- Tổng số lô hàng (Master Records): ${data.length.toLocaleString('vi-VN')}`);
console.log(`- Tổng số kiện (PCS): ${totalPcs.toLocaleString('vi-VN')} kiện`);
console.log(`- Trọng lượng thực (GW): ${Math.round(totalGw).toLocaleString('vi-VN')} KG`);
console.log(`- Trọng lượng tính cước (CW): ${Math.round(totalCw).toLocaleString('vi-VN')} KG`);
console.log(`- Thể tích tích lũy (CBM): ${totalCbm.toFixed(2)} m³`);
console.log(`- Hệ số cước (CW / GW Ratio): ${cwGwRatio} (${cwGwRatio >= 1.0 ? 'Hàng thể tích/cồng kềnh chiếm đa số' : 'Hàng nặng chiếm đa số'})`);
console.log(`- Mật độ tính cước (CW / CBM): ${cwCbmRatio} KG/m³\n`);

// Helper to parse Month
function parseMonth(dateStr, fileName) {
  const fn = (fileName || "").toUpperCase();
  const ds = (dateStr || "").toUpperCase();
  if (ds.includes("JUN") || fn.includes("JUN")) return "Tháng 06 / 2026";
  if (ds.includes("AUG") || fn.includes("AUG")) return "Tháng 08 / 2026";
  return "Tháng 07 / 2026";
}

// 2. Monthly Breakdown
const monthStats = {};
data.forEach(item => {
  const m = parseMonth(item.date, item.fileName);
  if (!monthStats[m]) monthStats[m] = { count: 0, pcs: 0, gw: 0, cw: 0, cbm: 0 };
  monthStats[m].count++;
  monthStats[m].pcs += Number(item.pcs) || 0;
  monthStats[m].gw += Number(item.gw) || 0;
  monthStats[m].cw += Number(item.cw) || 0;
  monthStats[m].cbm += Number(item.cbm) || 0;
});

console.log("--- 2. BÁO CÁO THEO THÁNG (MONTHLY BREAKDOWN) ---");
Object.keys(monthStats).sort().forEach(m => {
  const s = monthStats[m];
  const r = s.gw > 0 ? (s.cw / s.gw).toFixed(2) : '0';
  console.log(`* ${m}: ${s.count.toString().padStart(4)} lô | ${s.pcs.toLocaleString('vi-VN').padStart(7)} kiện | GW: ${Math.round(s.gw).toLocaleString('vi-VN').padStart(10)} kg | CW: ${Math.round(s.cw).toLocaleString('vi-VN').padStart(10)} kg | CBM: ${s.cbm.toFixed(2).padStart(8)} m³ | CW/GW: ${r}`);
});
console.log("");

// 3. Weekly Breakdown
function parseWeek(dateStr, fileName) {
  const fn = (fileName || "").toUpperCase();
  if (fn.includes("25JUN") || fn.includes("26JUN")) return "Tuần 26 (25-30/06)";
  if (fn.includes("30JUN") || fn.includes("02 JUL") || fn.includes("03JUL") || fn.includes("4JUL") || fn.includes("5-6JUL") || fn.includes("07JUL")) return "Tuần 27 (01-07/07)";
  if (fn.includes("08JUL") || fn.includes("19 -20 JUL")) return "Tuần 28 (08-20/07)";
  if (fn.includes("21 JUL") || fn.includes("22 JUL") || fn.includes("23 JUL") || fn.includes("24 JUL")) return "Tuần 29 (21-24/07)";
  if (fn.includes("25 JUL") || fn.includes("25-26-27") || fn.includes("28 JUL")) return "Tuần 30 (25-28/07)";
  if (fn.includes("29 JUL") || fn.includes("30 JUL") || fn.includes("31JUL") || fn.includes("02+3AUG")) return "Tuần 31 (29/07-03/08)";
  return "Tuần Khác";
}

const weekStats = {};
data.forEach(item => {
  const w = parseWeek(item.date, item.fileName);
  if (!weekStats[w]) weekStats[w] = { count: 0, pcs: 0, gw: 0, cw: 0, cbm: 0 };
  weekStats[w].count++;
  weekStats[w].pcs += Number(item.pcs) || 0;
  weekStats[w].gw += Number(item.gw) || 0;
  weekStats[w].cw += Number(item.cw) || 0;
  weekStats[w].cbm += Number(item.cbm) || 0;
});

console.log("--- 3. BÁO CÁO THEO TUẦN (WEEKLY BREAKDOWN) ---");
Object.keys(weekStats).sort().forEach(w => {
  const s = weekStats[w];
  const r = s.gw > 0 ? (s.cw / s.gw).toFixed(2) : '0';
  console.log(`* ${w.padEnd(22)}: ${s.count.toString().padStart(4)} lô | ${s.pcs.toLocaleString('vi-VN').padStart(6)} kiện | GW: ${Math.round(s.gw).toLocaleString('vi-VN').padStart(9)} kg | CW: ${Math.round(s.cw).toLocaleString('vi-VN').padStart(9)} kg | CW/GW: ${r}`);
});
console.log("");

// 4. Carrier Breakdown
const carrierMap = {};
data.forEach(item => {
  let flt = (item.flight || "KHÁC").trim().toUpperCase();
  let code = flt.startsWith("VJ") ? "VietJet (VJ)" :
             flt.startsWith("KJ") ? "Air Incheon (KJ)" :
             flt.startsWith("5X") ? "UPS Cargo (5X)" :
             flt.startsWith("KE") ? "Korean Air (KE)" :
             flt.startsWith("ET") ? "Ethiopian (ET)" :
             flt.startsWith("OD") ? "Batik Air (OD)" :
             flt.startsWith("JD") ? "Capital Airlines (JD)" :
             flt.startsWith("XJ") ? "Thai AirAsia (XJ)" : flt || "KHÁC";

  if (!carrierMap[code]) carrierMap[code] = { count: 0, cw: 0, gw: 0 };
  carrierMap[code].count++;
  carrierMap[code].cw += Number(item.cw) || 0;
  carrierMap[code].gw += Number(item.gw) || 0;
});

console.log("--- 4. PHÂN TÍCH THỊ PHẦN HÃNG VẬN TẢI (CARRIER MARKET SHARE) ---");
Object.entries(carrierMap)
  .sort((a,b) => b[1].cw - a[1].cw)
  .forEach(([carrier, stat]) => {
    const share = ((stat.cw / totalCw) * 100).toFixed(1);
    console.log(`* ${carrier.padEnd(24)}: ${stat.count.toString().padStart(4)} lô | CW: ${Math.round(stat.cw).toLocaleString('vi-VN').padStart(10)} kg (${share}%)`);
  });
console.log("");

// 5. Top 10 Agents
const agentMap = {};
data.forEach(item => {
  const ag = (item.agent || "KHÔNG RÕ").trim().toUpperCase();
  if (!agentMap[ag]) agentMap[ag] = { count: 0, cw: 0, gw: 0 };
  agentMap[ag].count++;
  agentMap[ag].cw += Number(item.cw) || 0;
  agentMap[ag].gw += Number(item.gw) || 0;
});

console.log("--- 5. TOP 10 ĐẠI LÝ (FORWARDER / AGENT CONCENTRATION) ---");
Object.entries(agentMap)
  .sort((a,b) => b[1].cw - a[1].cw)
  .slice(0, 10)
  .forEach(([ag, stat], idx) => {
    const share = ((stat.cw / totalCw) * 100).toFixed(1);
    console.log(`${(idx+1).toString().padStart(2)}. ${ag.padEnd(16)}: ${stat.count.toString().padStart(4)} lô | CW: ${Math.round(stat.cw).toLocaleString('vi-VN').padStart(10)} kg (${share}%)`);
  });
console.log("");
