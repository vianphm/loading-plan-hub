// Loading Plan Hub - Weekly & Monthly Logistics Analytics & Auto-Update Engine
document.addEventListener('DOMContentLoaded', () => {
  let masterData = [];
  let filteredData = [];
  let currentPage = 1;
  const pageSize = 20;
  let lastFetchedRecordCount = 0;

  // Chart instances
  let weeklyTrendChartInstance = null;
  let weeklyPieChartInstance = null;
  let monthlyCwChartInstance = null;
  let carrierMarketChartInstance = null;

  // Sales Intelligence chart instance
  let regionDonutChartInstance = null;

  // ── REGION & AIRPORT INTELLIGENCE MAPS ──────────────────────────────────
  const REGION_MAP = {
    ICN:'Far East',GMP:'Far East',PUS:'Far East',
    NRT:'Far East',HND:'Far East',KIX:'Far East',NGO:'Far East',FUK:'Far East',
    HKG:'Far East',CAN:'Far East',PEK:'Far East',PVG:'Far East',CTU:'Far East',SZX:'Far East',
    MAA:'India',DEL:'India',BLR:'India',BOM:'India',AMD:'India',CCU:'India',HYD:'India',COK:'India',PNQ:'India',CMB:'India',DAC:'India',KTM:'India',
    LHR:'Europe',LGW:'Europe',MAN:'Europe',CDG:'Europe',FRA:'Europe',MUC:'Europe',DUS:'Europe',AMS:'Europe',BRU:'Europe',MXP:'Europe',FCO:'Europe',MAD:'Europe',BCN:'Europe',ZRH:'Europe',VIE:'Europe',PRG:'Europe',WAW:'Europe',ARN:'Europe',CPH:'Europe',HEL:'Europe',IST:'Europe',
    BKK:'SE Asia',DMK:'SE Asia',SIN:'SE Asia',KUL:'SE Asia',PEN:'SE Asia',CGK:'SE Asia',MNL:'SE Asia',SGN:'SE Asia',HAN:'SE Asia',RGN:'SE Asia',
    JFK:'Americas',EWR:'Americas',LAX:'Americas',SFO:'Americas',ORD:'Americas',ATL:'Americas',DFW:'Americas',SEA:'Americas',IAD:'Americas',MIA:'Americas',BOS:'Americas',YYZ:'Americas',YVR:'Americas',GRU:'Americas',
    DXB:'Middle East',AUH:'Middle East',DOH:'Middle East',RUH:'Middle East',JED:'Middle East',KWI:'Middle East',BAH:'Middle East',MCT:'Middle East',AMM:'Middle East',
    SYD:'Oceania',MEL:'Oceania',BNE:'Oceania',PER:'Oceania',AKL:'Oceania',
    NBO:'Africa',JNB:'Africa',ADD:'Africa',LOS:'Africa',CAI:'Africa'
  };
  const REGION_COLOR = {
    'Far East':'#38bdf8','India':'#f59e0b','Europe':'#8b5cf6',
    'Americas':'#10b981','Middle East':'#f97316','SE Asia':'#06b6d4',
    'Oceania':'#84cc16','Africa':'#ec4899','Other':'#64748b'
  };
  const AIRPORT_INFO = {
    ICN:{city:'Seoul',country:'South Korea',flag:'🇰🇷'},
    PUS:{city:'Busan',country:'South Korea',flag:'🇰🇷'},
    NRT:{city:'Tokyo Narita',country:'Japan',flag:'🇯🇵'},
    HND:{city:'Tokyo Haneda',country:'Japan',flag:'🇯🇵'},
    KIX:{city:'Osaka',country:'Japan',flag:'🇯🇵'},
    HKG:{city:'Hong Kong',country:'HK China',flag:'🇭🇰'},
    PEK:{city:'Beijing',country:'China',flag:'🇨🇳'},
    PVG:{city:'Shanghai',country:'China',flag:'🇨🇳'},
    CAN:{city:'Guangzhou',country:'China',flag:'🇨🇳'},
    MAA:{city:'Chennai',country:'India',flag:'🇮🇳'},
    DEL:{city:'Delhi',country:'India',flag:'🇮🇳'},
    BLR:{city:'Bangalore',country:'India',flag:'🇮🇳'},
    BOM:{city:'Mumbai',country:'India',flag:'🇮🇳'},
    AMD:{city:'Ahmedabad',country:'India',flag:'🇮🇳'},
    CCU:{city:'Kolkata',country:'India',flag:'🇮🇳'},
    HYD:{city:'Hyderabad',country:'India',flag:'🇮🇳'},
    COK:{city:'Kochi',country:'India',flag:'🇮🇳'},
    CMB:{city:'Colombo',country:'Sri Lanka',flag:'🇱🇰'},
    LHR:{city:'London',country:'UK',flag:'🇬🇧'},
    MXP:{city:'Milan',country:'Italy',flag:'🇮🇹'},
    FCO:{city:'Rome',country:'Italy',flag:'🇮🇹'},
    AMS:{city:'Amsterdam',country:'Netherlands',flag:'🇳🇱'},
    FRA:{city:'Frankfurt',country:'Germany',flag:'🇩🇪'},
    MUC:{city:'Munich',country:'Germany',flag:'🇩🇪'},
    CDG:{city:'Paris',country:'France',flag:'🇫🇷'},
    MAD:{city:'Madrid',country:'Spain',flag:'🇪🇸'},
    ZRH:{city:'Zurich',country:'Switzerland',flag:'🇨🇭'},
    VIE:{city:'Vienna',country:'Austria',flag:'🇦🇹'},
    IST:{city:'Istanbul',country:'Turkey',flag:'🇹🇷'},
    BKK:{city:'Bangkok',country:'Thailand',flag:'🇹🇭'},
    SIN:{city:'Singapore',country:'Singapore',flag:'🇸🇬'},
    KUL:{city:'Kuala Lumpur',country:'Malaysia',flag:'🇲🇾'},
    PEN:{city:'Penang',country:'Malaysia',flag:'🇲🇾'},
    CGK:{city:'Jakarta',country:'Indonesia',flag:'🇮🇩'},
    MNL:{city:'Manila',country:'Philippines',flag:'🇵🇭'},
    JFK:{city:'New York',country:'USA',flag:'🇺🇸'},
    LAX:{city:'Los Angeles',country:'USA',flag:'🇺🇸'},
    SFO:{city:'San Francisco',country:'USA',flag:'🇺🇸'},
    ORD:{city:'Chicago',country:'USA',flag:'🇺🇸'},
    YYZ:{city:'Toronto',country:'Canada',flag:'🇨🇦'},
    DXB:{city:'Dubai',country:'UAE',flag:'🇦🇪'},
    AUH:{city:'Abu Dhabi',country:'UAE',flag:'🇦🇪'},
    DOH:{city:'Doha',country:'Qatar',flag:'🇶🇦'},
    RUH:{city:'Riyadh',country:'Saudi Arabia',flag:'🇸🇦'},
    JED:{city:'Jeddah',country:'Saudi Arabia',flag:'🇸🇦'},
    KWI:{city:'Kuwait',country:'Kuwait',flag:'🇰🇼'},
    SYD:{city:'Sydney',country:'Australia',flag:'🇦🇺'},
    MEL:{city:'Melbourne',country:'Australia',flag:'🇦🇺'},
    AKL:{city:'Auckland',country:'New Zealand',flag:'🇳🇿'}
  };

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const weeklyViewSection = document.getElementById('weeklyViewSection');
  const monthlyViewSection = document.getElementById('monthlyViewSection');
  const salesViewSection = document.getElementById('salesViewSection');
  const detailViewSection = document.getElementById('detailViewSection');

  const searchInput = document.getElementById('searchInput');
  const flightFilter = document.getElementById('flightFilter');
  const agentFilter = document.getElementById('agentFilter');
  const destFilter = document.getElementById('destFilter');
  const tableBody = document.getElementById('tableBody');
  const weeklyTableBody = document.getElementById('weeklyTableBody');
  const monthlyTableBody = document.getElementById('monthlyTableBody');

  const refreshBtn = document.getElementById('refreshBtn');
  const refreshBtnText = document.getElementById('refreshBtnText');
  const refreshIcon = document.getElementById('refreshIcon');
  const lastSyncTime = document.getElementById('lastSyncTime');
  const exportBtn = document.getElementById('exportBtn');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const paginationInfo = document.getElementById('paginationInfo');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Toast Notification Helper
  function showToast(msg) {
    if (!toastNotification) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3500);
  }

  // Tab View Switcher
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const view = btn.dataset.view;
      weeklyViewSection.style.display = view === 'weekly' ? 'block' : 'none';
      monthlyViewSection.style.display = view === 'monthly' ? 'block' : 'none';
      salesViewSection.style.display = view === 'sales' ? 'block' : 'none';
      detailViewSection.style.display = view === 'detail' ? 'block' : 'none';

      if (view === 'weekly') renderWeeklyAnalytics();
      if (view === 'monthly') renderMonthlyAnalytics();
      if (view === 'sales') renderSalesIntel();
    });
  });

  // Load Master JSON Data with Cache-Busting & Auto-Update
  async function loadData(isManualTrigger = false) {
    try {
      if (refreshIcon) refreshIcon.classList.add('spin-icon');
      if (refreshBtnText && isManualTrigger) refreshBtnText.textContent = 'Đang đồng bộ...';

      // Cache-busting parameter to bypass CDN/Browser cache for instant update
      const cacheBustUrl = `data/master_plan.json?v=${Date.now()}`;
      const response = await fetch(cacheBustUrl, { cache: 'no-store' });

      if (!response.ok) throw new Error('Không thể tải file data/master_plan.json');
      
      const newData = await response.json();

      const isDataUpdated = newData.length !== lastFetchedRecordCount;
      masterData = newData;
      filteredData = [...masterData];
      lastFetchedRecordCount = masterData.length;

      populateFilters();
      updateDashboard();

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (lastSyncTime) lastSyncTime.textContent = `Cập nhật lần cuối: ${nowStr} (${masterData.length.toLocaleString('vi-VN')} bản ghi)`;

      if (isManualTrigger || isDataUpdated) {
        showToast(`🟢 Đã đồng bộ ${masterData.length.toLocaleString('vi-VN')} vận đơn mới nhất!`);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 3rem; color: #f43f5e;">Lỗi tải dữ liệu: ${err.message}.</td></tr>`;
      showToast(`⚠️ Không thể kết nối CDN Vercel: ${err.message}`);
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('spin-icon');
      if (refreshBtnText) refreshBtnText.textContent = 'Cập nhật phiên bản mới';
    }
  }

  // Populate Filter Selects
  function populateFilters() {
    const flights = new Set();
    const agents = new Set();
    const dests = new Set();

    masterData.forEach(item => {
      if (item.flight) flights.add(item.flight.trim());
      if (item.agent) agents.add(item.agent.trim());
      if (item.dest) dests.add(item.dest.trim());
    });

    populateSelect(flightFilter, Array.from(flights).sort(), 'Tất cả Chuyến Bay');
    populateSelect(agentFilter, Array.from(agents).sort(), 'Tất cả Đại Lý');
    populateSelect(destFilter, Array.from(dests).sort(), 'Tất cả Điểm Đến');
  }

  function populateSelect(selectEl, items, defaultLabel) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
    items.forEach(val => {
      if (val) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectEl.appendChild(opt);
      }
    });
  }

  // Filter Handler
  function filterData() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedFlight = flightFilter ? flightFilter.value : '';
    const selectedAgent = agentFilter ? agentFilter.value : '';
    const selectedDest = destFilter ? destFilter.value : '';

    filteredData = masterData.filter(item => {
      const matchQuery = !query || 
        (item.awb && item.awb.toLowerCase().includes(query)) ||
        (item.flight && item.flight.toLowerCase().includes(query)) ||
        (item.agent && item.agent.toLowerCase().includes(query)) ||
        (item.dest && item.dest.toLowerCase().includes(query)) ||
        (item.note && item.note.toLowerCase().includes(query));

      const matchFlight = !selectedFlight || item.flight === selectedFlight;
      const matchAgent = !selectedAgent || item.agent === selectedAgent;
      const matchDest = !selectedDest || item.dest === selectedDest;

      return matchQuery && matchFlight && matchAgent && matchDest;
    });

    currentPage = 1;
    updateDashboard();
  }

  // Master Dashboard Update
  function updateDashboard() {
    updateKPIs();
    renderWeeklyAnalytics();
    renderMonthlyAnalytics();
    renderDetailTable();
  }

  // KPI Calculations
  function updateKPIs() {
    let totalPcs = 0;
    let totalGw = 0;
    let totalCw = 0;
    let totalCbm = 0;

    filteredData.forEach(item => {
      totalPcs += Number(item.pcs) || 0;
      totalGw += Number(item.gw) || 0;
      totalCw += Number(item.cw) || 0;
      totalCbm += Number(item.cbm) || 0;
    });

    const ratio = totalGw > 0 ? (totalCw / totalGw).toFixed(2) : '0.00';

    document.getElementById('kpiTotalRecords').textContent = filteredData.length.toLocaleString('vi-VN');
    document.getElementById('kpiTotalPcs').textContent = totalPcs.toLocaleString('vi-VN');
    document.getElementById('kpiTotalGw').textContent = Math.round(totalGw).toLocaleString('vi-VN') + ' KG';
    document.getElementById('kpiTotalCw').textContent = Math.round(totalCw).toLocaleString('vi-VN') + ' KG';
    document.getElementById('kpiCwGwRatio').textContent = ratio;
    
    const subEl = document.getElementById('kpiCwGwSub');
    if (subEl) {
      subEl.textContent = Number(ratio) >= 1.0 
        ? 'Hàng cồng kềnh/tính cước thể tích (CW > GW)' 
        : 'Hàng đặc/trọng lượng thực (GW > CW)';
    }

    document.getElementById('kpiTotalCbm').textContent = totalCbm.toFixed(2) + ' m³';
  }

  // --- WEEKLY ANALYTICS ENGINE ---
  function getWeekName(dateStr, fileName) {
    const fn = (fileName || '').toUpperCase();
    if (fn.includes('25JUN') || fn.includes('26JUN')) return 'Tuần 26 (25-30/06)';
    if (fn.includes('30JUN') || fn.includes('02 JUL') || fn.includes('03JUL') || fn.includes('4JUL') || fn.includes('5-6JUL') || fn.includes('07JUL')) return 'Tuần 27 (01-07/07)';
    if (fn.includes('08JUL') || fn.includes('19 -20 JUL')) return 'Tuần 28 (08-20/07)';
    if (fn.includes('21 JUL') || fn.includes('22 JUL') || fn.includes('23 JUL') || fn.includes('24 JUL')) return 'Tuần 29 (21-24/07)';
    if (fn.includes('25 JUL') || fn.includes('25-26-27') || fn.includes('28 JUL')) return 'Tuần 30 (25-28/07)';
    if (fn.includes('29 JUL') || fn.includes('30 JUL') || fn.includes('31JUL') || fn.includes('02+3AUG')) return 'Tuần 31 (29/07-03/08)';
    return 'Tuần khác';
  }

  function renderWeeklyAnalytics() {
    const weeks = {};

    filteredData.forEach(item => {
      const wk = getWeekName(item.date, item.fileName);
      if (!weeks[wk]) {
        weeks[wk] = { count: 0, pcs: 0, gw: 0, cw: 0, cbm: 0 };
      }
      weeks[wk].count++;
      weeks[wk].pcs += Number(item.pcs) || 0;
      weeks[wk].gw += Number(item.gw) || 0;
      weeks[wk].cw += Number(item.cw) || 0;
      weeks[wk].cbm += Number(item.cbm) || 0;
    });

    const sortedWeeks = Object.keys(weeks).sort();

    let tableHtml = '';
    sortedWeeks.forEach(wk => {
      const w = weeks[wk];
      const ratio = w.gw > 0 ? (w.cw / w.gw).toFixed(2) : '-';
      const density = w.cbm > 0 ? (w.cw / w.cbm).toFixed(1) : '-';

      tableHtml += `
        <tr>
          <td style="font-weight: 700; color: #38bdf8;">${wk}</td>
          <td style="font-size:0.75rem; color:#94a3b8;">Khái quát theo file master</td>
          <td style="font-weight:600;">${w.count} lô</td>
          <td>${w.pcs.toLocaleString('vi-VN')}</td>
          <td>${Math.round(w.gw).toLocaleString('vi-VN')}</td>
          <td style="font-weight:700; color:#a78bfa;">${Math.round(w.cw).toLocaleString('vi-VN')}</td>
          <td style="color:#f59e0b;">${w.cbm.toFixed(2)}</td>
          <td><span class="badge ${Number(ratio) >= 1 ? 'badge-dest' : 'badge-agent'}">${ratio}</span></td>
          <td>${density} KG/m³</td>
        </tr>
      `;
    });
    if (weeklyTableBody) weeklyTableBody.innerHTML = tableHtml || `<tr><td colspan="9" style="text-align:center;">Không có dữ liệu tuần.</td></tr>`;

    // Weekly Trend Chart
    const labels = sortedWeeks;
    const gwData = sortedWeeks.map(w => Math.round(weeks[w].gw));
    const cwData = sortedWeeks.map(w => Math.round(weeks[w].cw));

    if (weeklyTrendChartInstance) weeklyTrendChartInstance.destroy();
    const ctxTrend = document.getElementById('weeklyTrendChart').getContext('2d');
    weeklyTrendChartInstance = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Chargeable Weight (CW kg)', data: cwData, backgroundColor: 'rgba(139, 92, 246, 0.8)', borderRadius: 6 },
          { label: 'Gross Weight (GW kg)', data: gwData, backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#cbd5e1' } } },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#cbd5e1' } }
        }
      }
    });

    // Weekly Pie Chart
    if (weeklyPieChartInstance) weeklyPieChartInstance.destroy();
    const ctxPie = document.getElementById('weeklyPieChart').getContext('2d');
    weeklyPieChartInstance = new Chart(ctxPie, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{ data: cwData, backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } } }
      }
    });
  }

  // --- MONTHLY ANALYTICS ENGINE ---
  function getMonthName(dateStr, fileName) {
    const fn = (fileName || '').toUpperCase();
    const ds = (dateStr || '').toUpperCase();

    if (ds.includes('JUN') || fn.includes('JUN')) return 'Tháng 06 / 2026';
    if (ds.includes('AUG') || fn.includes('AUG')) return 'Tháng 08 / 2026';
    return 'Tháng 07 / 2026';
  }

  function renderMonthlyAnalytics() {
    const months = {};
    const carriers = {};

    filteredData.forEach(item => {
      const m = getMonthName(item.date, item.fileName);
      if (!months[m]) months[m] = { count: 0, pcs: 0, gw: 0, cw: 0, cbm: 0, flights: new Set() };
      months[m].count++;
      months[m].pcs += Number(item.pcs) || 0;
      months[m].gw += Number(item.gw) || 0;
      months[m].cw += Number(item.cw) || 0;
      months[m].cbm += Number(item.cbm) || 0;
      if (item.flight) months[m].flights.add(item.flight);

      // Carriers
      let flt = (item.flight || 'KHÁC').toUpperCase();
      let code = flt.startsWith('VJ') ? 'VietJet (VJ)' :
                 flt.startsWith('KJ') ? 'Air Incheon (KJ)' :
                 flt.startsWith('5X') ? 'UPS (5X)' :
                 flt.startsWith('KE') ? 'Korean Air (KE)' :
                 flt.startsWith('ET') ? 'Ethiopian (ET)' : 'Hãng khác';
      
      carriers[code] = (carriers[code] || 0) + (Number(item.cw) || 0);
    });

    const sortedMonths = Object.keys(months).sort();

    let tableHtml = '';
    sortedMonths.forEach(m => {
      const mon = months[m];
      const ratio = mon.gw > 0 ? (mon.cw / mon.gw).toFixed(2) : '-';

      tableHtml += `
        <tr>
          <td style="font-weight: 700; color: #a78bfa;">${m}</td>
          <td><span class="badge badge-flight">${mon.flights.size} Chuyến bay</span></td>
          <td style="font-weight:600;">${mon.count} lô</td>
          <td>${mon.pcs.toLocaleString('vi-VN')}</td>
          <td>${Math.round(mon.gw).toLocaleString('vi-VN')}</td>
          <td style="font-weight:700; color:#38bdf8;">${Math.round(mon.cw).toLocaleString('vi-VN')}</td>
          <td style="color:#f59e0b;">${mon.cbm.toFixed(2)}</td>
          <td><span class="badge badge-dest">${ratio}</span></td>
        </tr>
      `;
    });
    if (monthlyTableBody) monthlyTableBody.innerHTML = tableHtml || `<tr><td colspan="8" style="text-align:center;">Không có dữ liệu tháng.</td></tr>`;

    // Monthly Bar Chart
    if (monthlyCwChartInstance) monthlyCwChartInstance.destroy();
    const ctxMonthly = document.getElementById('monthlyCwChart').getContext('2d');
    monthlyCwChartInstance = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: sortedMonths,
        datasets: [{ label: 'Sản lượng cước CW (KG)', data: sortedMonths.map(m => Math.round(months[m].cw)), backgroundColor: ['#06b6d4', '#8b5cf6', '#10b981'], borderRadius: 8 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#cbd5e1' } }
        }
      }
    });

    // Carrier Doughnut Chart
    if (carrierMarketChartInstance) carrierMarketChartInstance.destroy();
    const ctxCarrier = document.getElementById('carrierMarketChart').getContext('2d');
    const carrierLabels = Object.keys(carriers);
    const carrierValues = carrierLabels.map(k => Math.round(carriers[k]));

    carrierMarketChartInstance = new Chart(ctxCarrier, {
      type: 'doughnut',
      data: {
        labels: carrierLabels,
        datasets: [{ data: carrierValues, backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } } }
      }
    });
  }

  // --- DETAIL MASTER TABLE ---
  function renderDetailTable() {
    if (!tableBody) return;
    if (filteredData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 3rem; color: #64748b;">Không tìm thấy bản ghi nào.</td></tr>`;
      if (paginationInfo) paginationInfo.textContent = 'Hiển thị 0 - 0 trong tổng số 0 bản ghi';
      if (prevPageBtn) prevPageBtn.disabled = true;
      if (nextPageBtn) nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredData.length);
    const pageItems = filteredData.slice(startIdx, endIdx);

    let html = '';
    pageItems.forEach((item, index) => {
      html += `
        <tr>
          <td>${startIdx + index + 1}</td>
          <td style="font-weight: 700; color: #38bdf8;">${item.awb || 'N/A'}</td>
          <td><span class="badge badge-flight">${item.flight || '-'}</span></td>
          <td>${item.date || '-'}</td>
          <td><span class="badge badge-dest">${item.dest || '-'}</span></td>
          <td><span class="badge badge-agent">${item.agent || '-'}</span></td>
          <td style="font-weight: 600;">${item.pcs || 0}</td>
          <td>${Number(item.gw || 0).toLocaleString('vi-VN')}</td>
          <td style="font-weight: 700; color: #a78bfa;">${Number(item.cw || 0).toLocaleString('vi-VN')}</td>
          <td>${Number(item.cbm || 0).toFixed(2)}</td>
          <td style="font-size: 0.775rem; color: #94a3b8; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.note || ''}">${item.note || '-'}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
    if (paginationInfo) paginationInfo.textContent = `Hiển thị ${startIdx + 1} - ${endIdx} trong tổng số ${filteredData.length.toLocaleString('vi-VN')} bản ghi`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  // Export CSV
  function exportCSV() {
    if (filteredData.length === 0) return alert('Không có dữ liệu để xuất CSV!');
    const headers = ['STT', 'File', 'Sheet', 'MAWB', 'Flight', 'Date', 'Dest', 'Agent', 'PCS', 'GW_KG', 'CW_KG', 'CBM', 'Note'];
    const rows = filteredData.map((item, idx) => [
      idx + 1,
      `"${item.fileName || ''}"`,
      `"${item.sheetName || ''}"`,
      `"${item.awb || ''}"`,
      `"${item.flight || ''}"`,
      `"${item.date || ''}"`,
      `"${item.dest || ''}"`,
      `"${item.agent || ''}"`,
      item.pcs || 0,
      item.gw || 0,
      item.cw || 0,
      item.cbm || 0,
      `"${(item.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loading_plan_weekly_monthly_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ══════════════════════════════════════════════════════════════════
  //  SALES INTELLIGENCE MODULE
  // ══════════════════════════════════════════════════════════════════

  function getSalesData() {
    const monthFilter = document.getElementById('salesMonthFilter')?.value || '';
    const regionFilter = document.getElementById('salesRegionFilter')?.value || '';
    // Only include records with valid IATA dest code and meaningful agent name
    return masterData.filter(r => {
      const validDest = /^[A-Z]{3}$/.test(r.dest);
      const validAgent = r.agent && /[A-Za-z]/.test(r.agent) && r.agent.length >= 2 && r.agent.length <= 20;
      const validCw = r.cw > 0;
      if (!validDest || !validAgent || !validCw) return false;
      if (monthFilter && !String(r.fileName || '').toLowerCase().includes(monthFilter.toLowerCase())) return false;
      const region = REGION_MAP[r.dest] || 'Other';
      if (regionFilter && region !== regionFilter) return false;
      return true;
    });
  }

  function renderSalesIntel() {
    const data = getSalesData();
    populateSalesMonthFilter();
    renderRegionalDonut(data);
    renderCustomerLeaderboard(data);
    renderDestinationIntel(data);
    renderRouteMatrix(data);

    // Filter change listeners
    document.getElementById('salesMonthFilter')?.addEventListener('change', () => {
      const d = getSalesData();
      renderRegionalDonut(d);
      renderCustomerLeaderboard(d);
      renderDestinationIntel(d);
      renderRouteMatrix(d);
    });
    document.getElementById('salesRegionFilter')?.addEventListener('change', () => {
      const d = getSalesData();
      renderCustomerLeaderboard(d);
      renderDestinationIntel(d);
      renderRouteMatrix(d);
    });
    document.getElementById('sortAgentBy')?.addEventListener('change', () => renderCustomerLeaderboard(getSalesData()));
    document.getElementById('exportSalesBtn')?.addEventListener('click', () => exportSalesCSV(getSalesData()));

    // Prospecting Init
    initProspectingFilters();
    document.getElementById('btnProspect')?.addEventListener('click', renderProspecting);
  }

  function initProspectingFilters() {
    const destSel = document.getElementById('prospectDestFilter');
    const carrSel = document.getElementById('prospectCarrierFilter');
    const compSel = document.getElementById('prospectCompanyFilter');
    if (!destSel || destSel.options.length > 1) return; // already inited

    const validData = masterData.filter(r => r.cw > 0 && r.agent && r.agent.length >= 2);
    
    // Dests
    const dests = [...new Set(validData.map(r => r.dest).filter(d => /^[A-Z]{3}$/.test(d)))].sort();
    dests.forEach(d => {
      const opt = document.createElement('option');
      const ai = AIRPORT_INFO[d];
      opt.value = d; opt.textContent = ai ? `${ai.flag} ${d} - ${ai.city}` : d;
      destSel.appendChild(opt);
    });

    // Carriers
    const carrs = [...new Set(validData.map(r => r.carrier).filter(c => c && c.length >= 2))].sort();
    carrs.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = `✈️ ${c}`;
      carrSel.appendChild(opt);
    });

    // Companies (Sheet Names)
    const comps = [...new Set(validData.map(r => r.company).filter(Boolean))].sort();
    comps.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = `🏭 ${c}`;
      compSel.appendChild(opt);
    });
  }

  function renderProspecting() {
    const dest = document.getElementById('prospectDestFilter')?.value;
    const carr = document.getElementById('prospectCarrierFilter')?.value;
    const comp = document.getElementById('prospectCompanyFilter')?.value;
    const resEl = document.getElementById('prospectingResults');
    if (!resEl) return;

    if (!dest && !carr && !comp) {
      resEl.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: #64748b;">
          <i class="ph ph-warning-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Vui lòng chọn ít nhất 1 tiêu chí (Tuyến, Hãng hoặc Công ty) để lọc.</p>
        </div>`;
      return;
    }

    const data = masterData.filter(r => {
      if (r.cw <= 0 || !r.agent || r.agent.length < 2) return false;
      if (dest && r.dest !== dest) return false;
      if (carr && r.carrier !== carr) return false;
      if (comp && r.company !== comp) return false;
      return true;
    });

    if (data.length === 0) {
      resEl.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: #64748b;">
          <i class="ph ph-ghost" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Không có khách hàng nào khớp với tiêu chí tìm kiếm này.</p>
        </div>`;
      return;
    }

    const agentMap = {};
    data.forEach(r => {
      const a = r.agent.trim().toUpperCase();
      if (!agentMap[a]) agentMap[a] = { cw: 0, count: 0, carriers: {}, dests: {}, companies: {} };
      agentMap[a].cw += r.cw || 0;
      agentMap[a].count++;
      if (r.carrier) agentMap[a].carriers[r.carrier] = (agentMap[a].carriers[r.carrier] || 0) + (r.cw || 0);
      if (r.dest) agentMap[a].dests[r.dest] = (agentMap[a].dests[r.dest] || 0) + (r.cw || 0);
      if (r.company) agentMap[a].companies[r.company] = (agentMap[a].companies[r.company] || 0) + (r.cw || 0);
    });

    const sorted = Object.entries(agentMap).sort((a,b) => b[1].cw - a[1].cw);

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h4 style="color:#e2e8f0; margin:0; font-size:1rem;">Khách hàng Tiềm năng (Top ${sorted.length})</h4>
        <span style="background:var(--accent-blue); color:#fff; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;">
          TỔNG SẢN LƯỢNG MỤC TIÊU: ${Math.round(data.reduce((s,r)=>s+r.cw,0)).toLocaleString('vi-VN')} kg
        </span>
      </div>
      <table class="modern-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên Đại Lý (Agent)</th>
            <th style="text-align:right;">Tổng CW Target</th>
            <th style="text-align:right;">Số Lô</th>
            <th>Công Ty (Sheet)</th>
            <th>Hãng Bay Ưa Chuộng</th>
            <th>Tuyến Ưa Chuộng</th>
          </tr>
        </thead>
        <tbody>
    `;

    sorted.slice(0, 50).forEach(([agent, info], idx) => {
      const topComp = Object.entries(info.companies).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
      const topCarr = Object.entries(info.carriers).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
      const topDest = Object.entries(info.dests).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
      const ai = AIRPORT_INFO[topDest];
      
      html += `
        <tr>
          <td style="color:#64748b; font-weight:700;">${idx+1}</td>
          <td style="font-weight:700; color:#38bdf8; font-size:1.1rem;">${agent}</td>
          <td style="text-align:right; font-weight:700; color:#10b981;">${Math.round(info.cw).toLocaleString('vi-VN')} kg</td>
          <td style="text-align:right; color:#94a3b8;">${info.count}</td>
          <td style="color:#f59e0b; font-weight:600;"><i class="ph-fill ph-factory"></i> ${topComp}</td>
          <td style="color:#e2e8f0; font-weight:600;"><i class="ph-fill ph-airplane-tilt"></i> ${topCarr}</td>
          <td style="color:#e2e8f0; font-weight:600;">${ai?.flag||''} ${topDest}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    resEl.innerHTML = html;
  }

  function populateSalesMonthFilter() {
    const sel = document.getElementById('salesMonthFilter');
    if (!sel || sel.options.length > 1) return;
    const months = [...new Set(masterData.map(r => {
      const f = r.fileName || '';
      const m = f.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
      return m ? m[0].toLowerCase() : null;
    }).filter(Boolean))];
    const labels = {jan:'Tháng 1',feb:'Tháng 2',mar:'Tháng 3',apr:'Tháng 4',may:'Tháng 5',jun:'Tháng 6',jul:'Tháng 7',aug:'Tháng 8',sep:'Tháng 9',oct:'Tháng 10',nov:'Tháng 11',dec:'Tháng 12'};
    months.sort().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = labels[m] || m;
      sel.appendChild(opt);
    });
  }

  function renderRegionalDonut(data) {
    const regionTotals = {};
    data.forEach(r => {
      const region = REGION_MAP[r.dest] || 'Other';
      regionTotals[region] = (regionTotals[region] || 0) + (r.cw || 0);
    });
    const sorted = Object.entries(regionTotals).sort((a,b) => b[1]-a[1]);
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => Math.round(e[1]));
    const colors = labels.map(l => REGION_COLOR[l] || '#64748b');
    const total = values.reduce((s,v)=>s+v,0);

    const ctx = document.getElementById('regionDonutChart');
    if (!ctx) return;
    if (regionDonutChartInstance) regionDonutChartInstance.destroy();
    regionDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#0a0f1e', hoverOffset: 6 }] },
      options: {
        cutout: '65%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('vi-VN')} kg (${((ctx.parsed/total)*100).toFixed(1)}%)` } }
        }
      }
    });

    // Custom legend
    const legend = document.getElementById('regionLegend');
    if (legend) {
      legend.innerHTML = sorted.map(([region, cw]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${REGION_COLOR[region]||'#64748b'};flex-shrink:0;"></div>
            <span style="font-size:0.75rem;font-weight:600;color:#e2e8f0;">${region}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.75rem;color:${REGION_COLOR[region]||'#64748b'};font-weight:700;">${Math.round(cw).toLocaleString('vi-VN')} kg</span>
            <span style="font-size:0.65rem;color:#64748b;margin-left:4px;">${((cw/total)*100).toFixed(1)}%</span>
          </div>
        </div>`).join('');
    }
  }

  function renderCustomerLeaderboard(data) {
    const sortBy = document.getElementById('sortAgentBy')?.value || 'cw';
    const agentMap = {};
    data.forEach(r => {
      const a = r.agent.trim().toUpperCase();
      if (!agentMap[a]) agentMap[a] = { cw: 0, gw: 0, count: 0, pcs: 0, dests: {} };
      agentMap[a].cw += r.cw || 0;
      agentMap[a].gw += r.gw || 0;
      agentMap[a].count++;
      agentMap[a].pcs += r.pcs || 0;
      agentMap[a].dests[r.dest] = (agentMap[a].dests[r.dest] || 0) + (r.cw || 0);
    });

    let sorted = Object.entries(agentMap);
    if (sortBy === 'count') sorted.sort((a,b) => b[1].count - a[1].count);
    else if (sortBy === 'avg') sorted.sort((a,b) => (b[1].cw/b[1].count) - (a[1].cw/a[1].count));
    else sorted.sort((a,b) => b[1].cw - a[1].cw);

    const maxCw = sorted[0]?.[1]?.cw || 1;

    function getTier(cw) {
      if (cw >= 10000) return { label: '🐋 Whale', color: '#38bdf8' };
      if (cw >= 5000) return { label: '🔥 Major', color: '#f59e0b' };
      if (cw >= 1000) return { label: '📦 Regular', color: '#10b981' };
      return { label: '🔹 Small', color: '#64748b' };
    }

    const el = document.getElementById('customerLeaderboard');
    if (!el) return;
    if (!sorted.length) { el.innerHTML = '<div style="color:#64748b;padding:2rem;text-align:center;">Không có dữ liệu hợp lệ</div>'; return; }

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:0;margin-bottom:8px;padding:0 8px;">
        <span style="font-size:0.65rem;color:#64748b;font-weight:700;letter-spacing:.08em;">AGENT</span>
        <span style="font-size:0.65rem;color:#64748b;font-weight:700;letter-spacing:.08em;text-align:right;">TOTAL CW</span>
        <span style="font-size:0.65rem;color:#64748b;font-weight:700;letter-spacing:.08em;text-align:right;">SỐ LÔ</span>
        <span style="font-size:0.65rem;color:#64748b;font-weight:700;letter-spacing:.08em;text-align:right;">AVG CW</span>
        <span style="font-size:0.65rem;color:#64748b;font-weight:700;letter-spacing:.08em;text-align:right;">TOP DEST</span>
      </div>
      ${sorted.map(([agent, info], i) => {
        const tier = getTier(info.cw);
        const pct = (info.cw / maxCw * 100).toFixed(1);
        const topDest = Object.entries(info.dests).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
        const ai = AIRPORT_INFO[topDest];
        const destLabel = ai ? `${ai.flag} ${topDest}` : topDest;
        const avgCw = Math.round(info.cw / info.count);
        return `
          <div style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:0;align-items:center;margin-bottom:6px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:0.7rem;color:#475569;font-weight:600;width:18px;">${i+1}</span>
                <div>
                  <span style="font-size:0.85rem;font-weight:700;color:#f1f5f9;">${agent}</span>
                  <span style="font-size:0.65rem;font-weight:600;color:${tier.color};margin-left:6px;">${tier.label}</span>
                </div>
              </div>
              <span style="font-size:0.8rem;font-weight:700;color:${tier.color};text-align:right;">${Math.round(info.cw).toLocaleString('vi-VN')} kg</span>
              <span style="font-size:0.75rem;color:#94a3b8;text-align:right;">${info.count} lô</span>
              <span style="font-size:0.75rem;color:#94a3b8;text-align:right;">${avgCw.toLocaleString('vi-VN')} kg</span>
              <span style="font-size:0.75rem;color:#94a3b8;text-align:right;">${destLabel}</span>
            </div>
            <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${tier.color};border-radius:2px;transition:width .5s ease;"></div>
            </div>
          </div>`;
      }).join('')}`;
  }

  function renderDestinationIntel(data) {
    const destMap = {};
    data.forEach(r => {
      if (!destMap[r.dest]) destMap[r.dest] = { cw: 0, gw: 0, count: 0, agents: new Set() };
      destMap[r.dest].cw += r.cw || 0;
      destMap[r.dest].gw += r.gw || 0;
      destMap[r.dest].count++;
      destMap[r.dest].agents.add(r.agent.trim().toUpperCase());
    });
    const sorted = Object.entries(destMap).sort((a,b) => b[1].cw - a[1].cw);
    const maxCw = sorted[0]?.[1]?.cw || 1;

    const el = document.getElementById('destinationIntel');
    if (!el) return;
    if (!sorted.length) { el.innerHTML = '<div style="color:#64748b;padding:2rem;text-align:center;">Không có dữ liệu</div>'; return; }

    el.innerHTML = sorted.map(([dest, info]) => {
      const ai = AIRPORT_INFO[dest] || { city: dest, country: '', flag: '✈️' };
      const region = REGION_MAP[dest] || 'Other';
      const color = REGION_COLOR[region] || '#64748b';
      const pct = (info.cw / maxCw * 100).toFixed(1);
      return `
        <div style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.4rem;line-height:1;">${ai.flag}</span>
              <div>
                <span style="font-size:0.9rem;font-weight:800;color:#f1f5f9;">${dest}</span>
                <span style="font-size:0.72rem;color:#94a3b8;margin-left:6px;">${ai.city}${ai.country ? ` · ${ai.country}` : ''}</span>
                <span style="display:inline-block;font-size:0.6rem;font-weight:700;color:${color};background:${color}22;border-radius:4px;padding:1px 5px;margin-left:6px;">${region}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.85rem;font-weight:700;color:${color};">${Math.round(info.cw).toLocaleString('vi-VN')} kg</div>
              <div style="font-size:0.65rem;color:#64748b;">${info.count} lô · ${info.agents.size} agent</div>
            </div>
          </div>
          <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;"></div>
          </div>
        </div>`;
    }).join('');
  }

  function renderRouteMatrix(data) {
    // Get top 8 agents and top 8 dests by CW
    const agentTotals = {}, destTotals = {};
    data.forEach(r => {
      const a = r.agent.trim().toUpperCase();
      agentTotals[a] = (agentTotals[a] || 0) + (r.cw || 0);
      destTotals[r.dest] = (destTotals[r.dest] || 0) + (r.cw || 0);
    });
    const topAgents = Object.entries(agentTotals).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);
    const topDests = Object.entries(destTotals).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);

    // Build matrix
    const matrix = {};
    topAgents.forEach(a => { matrix[a] = {}; topDests.forEach(d => matrix[a][d] = 0); });
    data.forEach(r => {
      const a = r.agent.trim().toUpperCase();
      if (matrix[a] && topDests.includes(r.dest)) {
        matrix[a][r.dest] = (matrix[a][r.dest] || 0) + (r.cw || 0);
      }
    });
    const allVals = topAgents.flatMap(a => topDests.map(d => matrix[a][d]));
    const maxVal = Math.max(...allVals, 1);

    const el = document.getElementById('routeMatrix');
    if (!el) return;

    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.7rem;">
        <thead>
          <tr>
            <th style="padding:6px 8px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.08);white-space:nowrap;">AGENT ↓ / DEST →</th>
            ${topDests.map(d => {
              const ai = AIRPORT_INFO[d];
              const region = REGION_MAP[d] || 'Other';
              const color = REGION_COLOR[region] || '#64748b';
              return `<th style="padding:6px 4px;text-align:center;color:${color};font-weight:700;border-bottom:1px solid rgba(255,255,255,0.08);white-space:nowrap;" title="${ai?.city||d}">${ai?.flag||''} ${d}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${topAgents.map(agent => `
            <tr onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
              <td style="padding:7px 8px;font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${agent}</td>
              ${topDests.map(dest => {
                const val = matrix[agent][dest];
                const intensity = val > 0 ? Math.max(0.08, val / maxVal) : 0;
                const region = REGION_MAP[dest] || 'Other';
                const color = REGION_COLOR[region] || '#64748b';
                const bg = val > 0 ? `${color}${Math.round(intensity*60).toString(16).padStart(2,'0')}` : 'transparent';
                const textColor = val > 0 ? color : '#334155';
                return `<td style="padding:7px 4px;text-align:center;background:${bg};border-bottom:1px solid rgba(255,255,255,0.04);border-right:1px solid rgba(255,255,255,0.03);color:${textColor};font-weight:${val>0?'700':'400'};">${val > 0 ? Math.round(val).toLocaleString('vi-VN') : '—'}</td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function exportSalesCSV(data) {
    const agentMap = {};
    data.forEach(r => {
      const a = r.agent.trim().toUpperCase();
      if (!agentMap[a]) agentMap[a] = { cw: 0, gw: 0, count: 0, pcs: 0, dests: {} };
      agentMap[a].cw += r.cw || 0;
      agentMap[a].gw += r.gw || 0;
      agentMap[a].count++;
      agentMap[a].pcs += r.pcs || 0;
      agentMap[a].dests[r.dest] = (agentMap[a].dests[r.dest] || 0) + (r.cw || 0);
    });
    const rows = [['Agent','Total CW (kg)','Total GW (kg)','Số Lô Hàng','Total PCS','Avg CW/Lô','Top Dest','Top Dest CW','Region']];
    Object.entries(agentMap).sort((a,b)=>b[1].cw-a[1].cw).forEach(([agent,info]) => {
      const [topDest, topDestCw] = Object.entries(info.dests).sort((a,b)=>b[1]-a[1])[0] || ['-',0];
      const region = REGION_MAP[topDest] || 'Other';
      rows.push([agent,Math.round(info.cw),Math.round(info.gw),info.count,info.pcs,Math.round(info.cw/info.count),topDest,Math.round(topDestCw),region]);
    });
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📊 Đã xuất Sales Report CSV!');
  }

  // ══════════════════════════════════════════════════════════════════

  // Event Listeners
  if (searchInput) searchInput.addEventListener('input', filterData);
  if (flightFilter) flightFilter.addEventListener('change', filterData);
  if (agentFilter) agentFilter.addEventListener('change', filterData);
  if (destFilter) destFilter.addEventListener('change', filterData);
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadData(true));
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderDetailTable(); } });
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(filteredData.length / pageSize); if (currentPage < totalPages) { currentPage++; renderDetailTable(); } });

  // Initial Load
  loadData();

  // Auto Polling Every 60 Seconds
  setInterval(() => {
    loadData(false);
  }, 60000);
});
