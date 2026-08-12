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

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const weeklyViewSection = document.getElementById('weeklyViewSection');
  const monthlyViewSection = document.getElementById('monthlyViewSection');
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
      detailViewSection.style.display = view === 'detail' ? 'block' : 'none';

      if (view === 'weekly') renderWeeklyAnalytics();
      if (view === 'monthly') renderMonthlyAnalytics();
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
