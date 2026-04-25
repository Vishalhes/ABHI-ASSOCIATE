/* ═══════════════════════════════════════════════════════════════
   ABHI ASSOCIATE · BI DASHBOARD v7
   script.js — Full application logic
═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────────────────────── */
const SB_URL = 'https://yaqxtoenztxluwzqfjhe.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcXh0b2VuenR4bHV3enFmamhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTU3ODEsImV4cCI6MjA5MTkzMTc4MX0.3KfOSunO9L1bU6Vpaq9rHpg2mOuEMHhgwYtWr8B4sDc';

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_F = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PALETTE  = ['#f5a623','#3b82f6','#10b981','#a855f7','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#8b5cf6','#14b8a6','#f43f5e'];
const YR_COLS  = ['#00d4ff','#22c55e','#f5a623','#a855f7','#ef4444','#f97316'];
const YEAR_PILL_LIMIT = 4;

/* ──────────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────────── */
let SB_CLIENT = null;

const D = {
  sale:        [],
  purchase:    [],
  stock:       [],
  availBrands: [],
  availYears:  [],
};

const F = {
  brands: new Set(),
  years:  new Set(),
  months: new Set(),
};

const CH  = {};
const BC  = {};
let itMode = 'top';
let cuMode = 'top';

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function fi(v) {
  const a = Math.abs(v || 0), s = (v || 0) < 0 ? '-' : '';
  if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(2) + ' Cr';
  if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(2) + ' L';
  if (a >= 1e3) return s + '₹' + (a / 1e3).toFixed(1) + 'K';
  return s + '₹' + Math.round(a).toLocaleString('en-IN');
}
function fn(v) { return v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v || 0); }
function tr(s, n = 30) { return s && s.length > n ? s.slice(0, n) + '…' : s || '—'; }
function pct(a, b) { return b ? (a / b * 100).toFixed(1) : '0.0'; }

function bc(brand) {
  if (!BC[brand]) BC[brand] = PALETTE[Object.keys(BC).length % PALETTE.length];
  return BC[brand];
}

function bbrand(b) {
  const c = bc(b);
  return `<span class="bbrand" style="background:${c}22;color:${c};border:1px solid ${c}44">${b}</span>`;
}

function kpiCard(lb, val, sub, color) {
  return `<div class="kcard">
    <div class="kbar" style="background:linear-gradient(90deg,${color},transparent)"></div>
    <div class="klb">${lb}</div>
    <div class="kv" style="color:${color}">${val}</div>
    <div class="ks">${sub}</div>
  </div>`;
}

function toDateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDateLastMonth(d) {
  const cur = toDateOnly(d);
  if (!cur) return null;

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const day = cur.getDate();

  const lastMonthLastDate = new Date(y, m, 0).getDate();
  const safeDay = Math.min(day, lastMonthLastDate);

  return new Date(y, m - 1, safeDay);
}

function isSameMonthYear(d, y, mIndex) {
  return d && d.getFullYear() === y && d.getMonth() === mIndex;
}
function downloadCSV(filename, rows) {
  if (!rows.length) {
    showToast('No data available for export.');
    return;
  }

  const csv = rows.map(row =>
    row.map(cell => {
      const value = cell === null || cell === undefined ? '' : String(cell);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
function exportItemsCSV() {
  const d = getSale();

  const itemMap = {};
  d.forEach(r => {
    const item = r.description_of_goods || 'Unknown';
    itemMap[item] = itemMap[item] || {
      item,
      brand: r.brand_name,
      qty: 0,
      sale: 0,
      profit: 0
    };

    itemMap[item].qty += r.qty;
    itemMap[item].sale += r.amount;
    itemMap[item].profit += r.profit;
  });

  const rows = [
    ['Item Name', 'Brand', 'Qty', 'Sale Amount', 'Profit', 'Margin %']
  ];

  Object.values(itemMap)
    .sort((a, b) => b.sale - a.sale)
    .forEach(x => {
      const margin = x.sale ? (x.profit / x.sale * 100) : 0;
      rows.push([
        x.item,
        x.brand,
        x.qty,
        x.sale,
        x.profit,
        margin.toFixed(2)
      ]);
    });

  downloadCSV('items_export.csv', rows);
}
function exportCustomersCSV() {
  const d = getSale();

  const partyMap = {};
  d.forEach(r => {
    const party = r.party_name || 'Unknown';
    partyMap[party] = partyMap[party] || {
      party,
      qty: 0,
      sale: 0,
      profit: 0
    };

    partyMap[party].qty += r.qty;
    partyMap[party].sale += r.amount;
    partyMap[party].profit += r.profit;
  });

  const rows = [
    ['Party Name', 'Qty', 'Sale Amount', 'Profit', 'Share %']
  ];

  const totalSale = Object.values(partyMap).reduce((s, x) => s + x.sale, 0);

  Object.values(partyMap)
    .sort((a, b) => b.sale - a.sale)
    .forEach(x => {
      const share = totalSale ? (x.sale / totalSale * 100) : 0;
      rows.push([
        x.party,
        x.qty,
        x.sale,
        x.profit,
        share.toFixed(2)
      ]);
    });

  downloadCSV('parties_export.csv', rows);
}
function exportBrandsCSV() {
  const d = getSale();
  const p = getPurch();
  const st = getStock();

  const brandMap = {};

  d.forEach(r => {
    const brand = r.brand_name || 'Unknown';
    brandMap[brand] = brandMap[brand] || {
      brand,
      sale: 0,
      profit: 0,
      qty: 0,
      purchase: 0,
      stockValue: 0
    };

    brandMap[brand].sale += r.amount;
    brandMap[brand].profit += r.profit;
    brandMap[brand].qty += r.qty;
  });

  p.forEach(r => {
    const brand = r.brand_name || 'Unknown';
    brandMap[brand] = brandMap[brand] || {
      brand,
      sale: 0,
      profit: 0,
      qty: 0,
      purchase: 0,
      stockValue: 0
    };

    brandMap[brand].purchase += r.purchase_value;
  });

  st.forEach(r => {
    const brand = r.brand_name || 'Unknown';
    brandMap[brand] = brandMap[brand] || {
      brand,
      sale: 0,
      profit: 0,
      qty: 0,
      purchase: 0,
      stockValue: 0
    };

    brandMap[brand].stockValue += r.closing_value;
  });

  const totalSale = Object.values(brandMap).reduce((s, x) => s + x.sale, 0);

  const rows = [
    ['Brand', 'Sale Amount', 'Purchase Amount', 'Profit', 'Margin %', 'Qty', 'Stock Value', 'Share %']
  ];

  Object.values(brandMap)
    .sort((a, b) => b.sale - a.sale)
    .forEach(x => {
      const margin = x.sale ? (x.profit / x.sale * 100) : 0;
      const share = totalSale ? (x.sale / totalSale * 100) : 0;

      rows.push([
        x.brand,
        x.sale,
        x.purchase,
        x.profit,
        margin.toFixed(2),
        x.qty,
        x.stockValue,
        share.toFixed(2)
      ]);
    });

  downloadCSV('brands_export.csv', rows);
}

/* FIXED:
   currentMTD = current month till latest available date
   lmtdSale   = last month same till-date sale
   growthPct  = currentMTD vs lmtdSale
*/
function calcLMTDMetrics(rows) {
  if (!rows.length) {
    return {
      currentMTD: 0,
      lmtdSale: 0,
      growthPct: 0,
      latestDate: null
    };
  }

  const datedRows = rows
    .filter(r => r.tx_date)
    .map(r => ({ ...r, _d: toDateOnly(r.tx_date) }))
    .filter(r => r._d)
    .sort((a, b) => a._d - b._d);

  if (!datedRows.length) {
    return {
      currentMTD: 0,
      lmtdSale: 0,
      growthPct: 0,
      latestDate: null
    };
  }

  const latestDate = datedRows[datedRows.length - 1]._d;

  const cy = latestDate.getFullYear();
  const cm = latestDate.getMonth();
  const cd = latestDate.getDate();

  const lastMonthCutoff = sameDateLastMonth(latestDate);
  const ly = lastMonthCutoff.getFullYear();
  const lm = lastMonthCutoff.getMonth();
  const ld = lastMonthCutoff.getDate();

  const currentMTD = datedRows
    .filter(r => isSameMonthYear(r._d, cy, cm) && r._d.getDate() <= cd)
    .reduce((s, r) => s + r.amount, 0);

  const lmtdSale = datedRows
    .filter(r => isSameMonthYear(r._d, ly, lm) && r._d.getDate() <= ld)
    .reduce((s, r) => s + r.amount, 0);

  const growthPct = lmtdSale
    ? ((currentMTD - lmtdSale) / lmtdSale) * 100
    : 0;

  return {
    currentMTD,
    lmtdSale,
    growthPct,
    latestDate
  };
}

let _toastT;
function showToast(msg, dur = 3000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove('show'), dur);
}
function showLoader(m) { $('loader').style.display = 'flex'; $('loader-msg').textContent = m || 'Loading…'; }
function hideLoader()  { $('loader').style.display = 'none'; }
function showScreen(n) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'sc-' + n)); }
function kill(id)      { if (CH[id]) { CH[id].destroy(); delete CH[id]; } }

/* ──────────────────────────────────────────────────────────────
   AUTH
────────────────────────────────────────────────────────────── */
async function doLogin() {
  const email = $('f-email').value.trim();
  const pwd   = $('f-pwd').value;
  const errEl = $('login-err');
  errEl.style.display = 'none';

  if (!email || !pwd) {
    showToast('Email and password are required.');
    return;
  }

  const btn = $('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    SB_CLIENT = supabase.createClient(SB_URL, SB_KEY);

    const { data, error } = await SB_CLIENT.auth.signInWithPassword({ email, password: pwd });
    if (error) throw error;

    $('nav-user').textContent = data.user.email;
    showScreen('dash');
    await loadAllData();

  } catch (e) {
    errEl.textContent = e.message || 'Login failed. Please check your email and password.';
    errEl.style.display = 'block';
  }

  btn.disabled = false;
  btn.textContent = 'Sign In →';
}

async function doLogout() {
  if (SB_CLIENT) await SB_CLIENT.auth.signOut();
  SB_CLIENT = null;
  D.sale = [];
  D.purchase = [];
  D.stock = [];
  D.availBrands = [];
  D.availYears = [];
  Object.keys(CH).forEach(k => kill(k));
  F.brands.clear();
  F.years.clear();
  F.months.clear();
  showScreen('login');
  showToast('Signed out successfully.');
}

$('f-pwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('login-btn').addEventListener('click', doLogin);

/* ──────────────────────────────────────────────────────────────
   FULL FETCH HELPER
────────────────────────────────────────────────────────────── */
async function fetchAllRows(tableName, columns, orderColumn = null, ascending = true, pageSize = 1000) {
  let allRows = [];
  let from = 0;

  while (true) {
    let query = SB_CLIENT
      .from(tableName)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending });
    }

    const { data, error } = await query;
    if (error) throw new Error(`${tableName}: ${error.message}`);

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

/* ──────────────────────────────────────────────────────────────
   DATA LOADING
────────────────────────────────────────────────────────────── */
async function loadAllData() {
  showLoader('Please wait. Loading data…');

  try {
    const [saleData, purchData, stockData] = await Promise.all([
      fetchAllRows(
        'fifo_profit_report',
        'tx_date,year_no,month_no,month_name,brand_name,description_of_goods,party_name,qty,amount,profit',
        'tx_date',
        true,
        1000
      ),
      fetchAllRows(
        'purchase_card_summary',
        'year_no,month_no,month_name,brand_name,purchase_value,purchase_qty',
        'year_no',
        true,
        1000
      ),
      fetchAllRows(
        'stock_summary_latest',
        'brand_name,closing_value,closing_qty,as_on_date',
        'brand_name',
        true,
        1000
      )
    ]);

    D.sale = (saleData || []).map(r => ({
      ...r,
      amount:   +r.amount || 0,
      profit:   +r.profit || 0,
      qty:      +r.qty || 0,
      year_no:  +r.year_no,
      month_no: +r.month_no,
    }));

    D.purchase = (purchData || []).map(r => ({
      ...r,
      purchase_value: +r.purchase_value || 0,
      purchase_qty:   +r.purchase_qty || 0,
      year_no:        +r.year_no,
      month_no:       +r.month_no,
    }));

    D.stock = (stockData || []).map(r => ({
      ...r,
      closing_value: +r.closing_value || 0,
      closing_qty:   +r.closing_qty || 0,
    }));

    D.availBrands = [...new Set([
      ...D.sale.map(r => r.brand_name),
      ...D.purchase.map(r => r.brand_name),
      ...D.stock.map(r => r.brand_name),
    ])].filter(Boolean).sort();

    D.availYears = [...new Set(D.sale.map(r => r.year_no))]
      .filter(Boolean)
      .sort((a, b) => a - b);

    D.availBrands.forEach(b => bc(b));

    console.log('Sale rows loaded:', D.sale.length);
    console.log('Purchase rows loaded:', D.purchase.length);
    console.log('Stock rows loaded:', D.stock.length);
    console.log('Years loaded:', D.availYears);

    renderFilters();
    refreshDash();
    updateNavSub();
    showToast(`Loaded ${D.sale.length} sale rows, ${D.purchase.length} purchase rows, and ${D.stock.length} stock rows.`);

  } catch (e) {
    showToast('Error: ' + e.message, 6000);
    console.error('[Dashboard] Data load error:', e);
  }

  hideLoader();
}

async function refreshAll() {
  if (!SB_CLIENT) return;
  const btn = $('btn-refresh');
  btn.classList.add('spin-anim');
  await loadAllData();
  btn.classList.remove('spin-anim');
}

/* ──────────────────────────────────────────────────────────────
   FILTER LOGIC
────────────────────────────────────────────────────────────── */
function togglePill(type, value) {
  const s = F[type];
  if (value === 'all') {
    s.clear();
  } else {
    if (s.has(value)) s.delete(value);
    else s.add(value);
  }
  renderFilters();
  refreshDash();
  updateNavSub();
}

function getSale() {
  let d = D.sale;
  if (F.brands.size) d = d.filter(r => F.brands.has(r.brand_name));
  if (F.years.size)  d = d.filter(r => F.years.has(r.year_no));
  if (F.months.size) d = d.filter(r => F.months.has(r.month_no));
  return d;
}

function getPurch() {
  let d = D.purchase;
  if (F.brands.size) d = d.filter(r => F.brands.has(r.brand_name));
  if (F.years.size)  d = d.filter(r => F.years.has(r.year_no));
  if (F.months.size) d = d.filter(r => F.months.has(r.month_no));
  return d;
}

function getStock() {
  let d = D.stock;
  if (F.brands.size) d = d.filter(r => F.brands.has(r.brand_name));
  return d;
}

/* ──────────────────────────────────────────────────────────────
   FILTER RENDER
────────────────────────────────────────────────────────────── */
function renderFilters() {
  renderBrandPills();
  renderYearPills();
  renderMonthPills();
}

function renderBrandPills() {
  const isAll = F.brands.size === 0;
  let h = `<div class="pill${isAll ? ' all-on' : ''}" onclick="togglePill('brands','all')">All</div>`;
  D.availBrands.forEach(b => {
    const on  = F.brands.has(b);
    const col = bc(b);
    const style = on
      ? `background:${col};color:#000;border-color:${col}`
      : `color:${col};border-color:${col}44`;
    h += `<div class="pill" style="${style}" onclick="togglePill('brands','${CSS.escape(b)}')">${b}</div>`;
  });
  $('pills-brand').innerHTML = h;
}

function toggleYearDropdown(e) {
  e.stopPropagation();
  const menu = $('year-dd-menu');
  if (menu) menu.classList.toggle('show');
}

function renderYearPills() {
  const wrap = $('pills-year');
  const years = D.availYears || [];
  const isAll = F.years.size === 0;

  if (years.length <= YEAR_PILL_LIMIT) {
    let h = `<div class="pill${isAll ? ' all-on' : ''}" onclick="togglePill('years','all')">All</div>`;
    years.forEach(yr => {
      const on = F.years.has(yr);
      h += `<div class="pill${on ? ' yr-on' : ''}" onclick="togglePill('years',${yr})">${yr}</div>`;
    });
    wrap.innerHTML = h;
    return;
  }

  const selectedYears = [...F.years].sort((a,b)=>a-b);
  let label = 'All';
  if (selectedYears.length === 1) label = selectedYears[0];
  else if (selectedYears.length > 1) label = `${selectedYears.length} Years`;

  let opts = `<div class="yd-opt ${isAll ? 'on' : ''}" onclick="togglePill('years','all')">All</div>`;
  years.forEach(yr => {
    const on = F.years.has(yr);
    opts += `
      <div class="yd-opt ${on ? 'on' : ''}" onclick="togglePill('years',${yr})">
        <span>${yr}</span>
        <span>${on ? '✓' : ''}</span>
      </div>
    `;
  });

  wrap.innerHTML = `
    <div class="year-dd">
      <button class="year-dd-btn ${!isAll ? 'yr-on' : ''}" onclick="toggleYearDropdown(event)">
        ${label} <span class="year-dd-arrow">▾</span>
      </button>
      <div id="year-dd-menu" class="year-dd-menu">${opts}</div>
    </div>
  `;
}

function renderMonthPills() {
  const isAll = F.months.size === 0;
  let h = `<div class="pill${isAll ? ' all-on' : ''}" onclick="togglePill('months','all')">All</div>`;
  MONTHS_S.forEach((mn, i) => {
    const mo = i + 1;
    const on = F.months.has(mo);
    h += `<div class="pill${on ? ' yr-on' : ''}" onclick="togglePill('months',${mo})">${mn}</div>`;
  });
  $('pills-month').innerHTML = h;
}

function updateNavSub() {
  const br = F.brands.size ? [...F.brands].join(', ') : 'All Brands';
  const yr = F.years.size  ? [...F.years].sort((a,b)=>a-b).join(', ') : 'All Years';
  const mo = F.months.size ? [...F.months].sort((a,b)=>a-b).map(m => MONTHS_S[m-1]).join(', ') : 'All Months';
  $('nav-sub').textContent = `Sales & Purchase · ${br} · ${yr} · ${mo}`;
}

/* ──────────────────────────────────────────────────────────────
   CHART DEFAULTS
────────────────────────────────────────────────────────────── */
function cOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        labels: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 10, padding: 10 }
      },
      tooltip: {
        backgroundColor: '#181c26',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
        titleColor: '#eef0f7',
        bodyColor: '#9ca3af',
        padding: 10,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fi(ctx.raw)}` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#3d4559', font: { family: 'JetBrains Mono', size: 9 } } },
      y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#3d4559', font: { family: 'JetBrains Mono', size: 9 }, callback: v => fi(v) } }
    },
    ...extra
  };
}

/* ──────────────────────────────────────────────────────────────
   PAGE ROUTING
────────────────────────────────────────────────────────────── */
function showPage(pg) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('on', t.dataset.pg === pg));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'pg-' + pg));
  const map = { ov: renderOverview, br: renderBrands, it: renderItems, cu: renderCustomers, st: renderStock, fc: renderForecast };
  if (map[pg]) map[pg]();
}

function refreshDash() {
  const activePg = document.querySelector('.ptab.on')?.dataset.pg || 'ov';
  showPage(activePg);
}

/* ──────────────────────────────────────────────────────────────
   PAGE: OVERVIEW
────────────────────────────────────────────────────────────── */
function renderOverview() {
  const d  = getSale();
  const p  = getPurch();

  const totSale   = d.reduce((s, r) => s + r.amount, 0);
  const totProfit = d.reduce((s, r) => s + r.profit, 0);
  const totPurch  = p.reduce((s, r) => s + r.purchase_value, 0);
  const margin    = totSale ? totProfit / totSale * 100 : 0;
  const brands    = new Set(d.map(r => r.brand_name)).size;
  const items     = new Set(d.map(r => r.description_of_goods)).size;

  const lmtd = calcLMTDMetrics(d);
  const growthText = lmtd.growthPct >= 0
    ? `+${lmtd.growthPct.toFixed(1)}%`
    : `${lmtd.growthPct.toFixed(1)}%`;

  const growthSub = lmtd.lmtdSale > 0
    ? `MTD ${fi(lmtd.currentMTD)} vs LMTD ${fi(lmtd.lmtdSale)}`
    : 'No previous base';

  $('ov-kpis').innerHTML =
    kpiCard('Total Sale', fi(totSale), d.length + ' transactions', '#f5a623') +
    kpiCard('Profit', fi(totProfit), margin.toFixed(1) + '% margin', totProfit >= 0 ? '#22c55e' : '#ef4444') +
    kpiCard('Total Purchase', fi(totPurch), p.length + ' purchase rows', '#3b82f6') +
    kpiCard(
      'LMTD Sale',
      fi(lmtd.lmtdSale),
      lmtd.latestDate ? `Last month till ${sameDateLastMonth(lmtd.latestDate).toLocaleDateString('en-GB')}` : '—',
      '#06b6d4'
    ) +
    kpiCard(
      'Growth / De-Growth',
      growthText,
      growthSub,
      lmtd.growthPct >= 0 ? '#22c55e' : '#ef4444'
    ) +
    kpiCard('Margin %', margin.toFixed(1) + '%', margin >= 20 ? 'Healthy' : margin >= 10 ? 'Moderate' : 'Low', '#a855f7') +
    kpiCard('Brands', brands, 'active brands', '#14b8a6') +
    kpiCard('Items', items, 'unique items', '#f97316');

  let alerts = '';
  if (margin < 10 && totSale > 0) alerts += `<div class="alert al-w">⚠ Margin below 10% (${margin.toFixed(1)}%) in the selected period.</div>`;
  if (totProfit < 0) alerts += `<div class="alert al-r">❌ Negative profit in the current selection.</div>`;
  $('ov-alerts').innerHTML = alerts;

  renderTrendChart(d);

  const brMap = {};
  d.forEach(r => {
    brMap[r.brand_name] = brMap[r.brand_name] || { s: 0, gp: 0 };
    brMap[r.brand_name].s  += r.amount;
    brMap[r.brand_name].gp += r.profit;
  });

  const brs = Object.entries(brMap).sort((a, b) => b[1].s - a[1].s);

  kill('pl');
  CH.pl = new Chart($('c-pl').getContext('2d'), {
    type: 'bar',
    data: {
      labels: brs.map(b => b[0]),
      datasets: [
        { label: 'Sale ₹', data: brs.map(b => b[1].s), backgroundColor: brs.map(b => bc(b[0]) + '55'), borderColor: brs.map(b => bc(b[0])), borderWidth: 2, borderRadius: 5 },
        { label: 'Profit ₹', data: brs.map(b => b[1].gp), backgroundColor: brs.map(b => b[1].gp >= 0 ? '#22c55e40' : '#ef444440'), borderColor: brs.map(b => b[1].gp >= 0 ? '#22c55e' : '#ef4444'), borderWidth: 2, borderRadius: 5 },
      ]
    },
    options: cOpts()
  });

  const maxS = brs[0] ? brs[0][1].s : 1;
  $('ov-bcb').innerHTML = brs.map(([br, v]) => {
    const col = bc(br);
    const mg  = v.s ? v.gp / v.s * 100 : 0;
    const sh  = totSale ? v.s / totSale * 100 : 0;
    return `<div class="bcb">
      <div class="bcb-l">${bbrand(br)}</div>
      <div class="bcb-t"><div class="bcb-f" style="width:${(v.s/maxS*100).toFixed(0)}%;background:${col}"></div></div>
      <div class="bcb-p">${fi(v.s)} (${sh.toFixed(1)}%)</div>
      <div class="bcb-m ${mg >= 15 ? 'up' : mg > 0 ? '' : 'dn'}">${mg.toFixed(1)}%</div>
    </div>`;
  }).join('') || '<div style="color:var(--dim);font-size:12px;padding:8px">No sale data for the selected filter.</div>';
}

function renderTrendChart(d) {
  kill('trend');
  const ctx = $('c-trend').getContext('2d');

  const activeMos = F.months.size > 0 ? [...F.months].sort((a,b)=>a-b) : [1,2,3,4,5,6,7,8,9,10,11,12];
  const xLabels   = activeMos.map(m => MONTHS_S[m - 1]);
  const activeYrs = F.years.size > 0 ? [...F.years].sort((a,b)=>a-b) : D.availYears;

  let datasets;
  let subtitle;

  const baseD = F.brands.size ? D.sale.filter(r => F.brands.has(r.brand_name)) : D.sale;

  if (activeYrs.length === 1) {
    const yr = activeYrs[0];
    const saleData   = activeMos.map(mo => baseD.filter(r => r.year_no === yr && r.month_no === mo).reduce((s,r) => s + r.amount, 0));
    const profitData = activeMos.map(mo => baseD.filter(r => r.year_no === yr && r.month_no === mo).reduce((s,r) => s + r.profit, 0));

    datasets = [
      { label: `${yr} Sale ₹`, data: saleData, borderColor: '#22c55e', backgroundColor: '#22c55e0e', tension: .4, fill: true, pointRadius: 4, borderWidth: 2 },
      { label: `${yr} Profit ₹`, data: profitData, borderColor: '#f5a623', backgroundColor: '#f5a6230e', tension: .4, fill: true, pointRadius: 4, borderWidth: 2 },
    ];
    subtitle = `${yr} · ${activeMos.length === 12 ? 'Full year' : activeMos.length + ' selected months'}`;
  } else {
    datasets = activeYrs.map((yr, i) => {
      const c    = YR_COLS[i % YR_COLS.length];
      const data = activeMos.map(mo => baseD.filter(r => r.year_no === yr && r.month_no === mo).reduce((s,r) => s + r.amount, 0));
      return { label: String(yr), data, borderColor: c, backgroundColor: c + '10', tension: .4, fill: false, pointRadius: 3, borderWidth: 2.5 };
    });
    subtitle = `${activeYrs.length} years · ${activeMos.length} months · Sales comparison`;
  }

  CH.trend = new Chart(ctx, { type: 'line', data: { labels: xLabels, datasets }, options: cOpts() });
  $('trend-sub').textContent = subtitle;
}

/* ──────────────────────────────────────────────────────────────
   PAGE: BRANDS
────────────────────────────────────────────────────────────── */
function renderBrands() {
  const d = getSale();
  const p = getPurch();
  const st = getStock();

  const brSale   = {};
  const brProfit = {};
  const brQty    = {};

  d.forEach(r => {
    brSale[r.brand_name]   = (brSale[r.brand_name] || 0) + r.amount;
    brProfit[r.brand_name] = (brProfit[r.brand_name] || 0) + r.profit;
    brQty[r.brand_name]    = (brQty[r.brand_name] || 0) + r.qty;
  });

  const brPurch = {};
  p.forEach(r => { brPurch[r.brand_name] = (brPurch[r.brand_name] || 0) + r.purchase_value; });

  const brStock = {};
  st.forEach(r => { brStock[r.brand_name] = (brStock[r.brand_name] || 0) + r.closing_value; });

  const allBrands = [...new Set([...Object.keys(brSale), ...Object.keys(brPurch), ...Object.keys(brStock)])].sort();
  const totSale   = Object.values(brSale).reduce((s, v) => s + v, 0);
  const totProfit = Object.values(brProfit).reduce((s, v) => s + v, 0);
  const topBr     = [...allBrands].sort((a,b) => (brSale[b]||0) - (brSale[a]||0))[0];

  $('br-kpis').innerHTML =
    kpiCard('Total Sale', fi(totSale), allBrands.length + ' brands', '#f5a623') +
    kpiCard('Profit', fi(totProfit), totSale ? (totProfit/totSale*100).toFixed(1)+'% margin' : '—', totProfit >= 0 ? '#22c55e' : '#ef4444') +
    kpiCard('Total Purchase', fi(Object.values(brPurch).reduce((s,v)=>s+v,0)), p.length + ' rows', '#3b82f6') +
    kpiCard('Top Brand', topBr || '—', topBr ? fi(brSale[topBr]||0) : '—', '#a855f7');

  const sorted = [...allBrands].sort((a,b) => (brSale[b]||0) - (brSale[a]||0));

  ['bsale','bprofit','bmargin','bstock'].forEach(k => kill(k));

  CH.bsale = new Chart($('c-bsale').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted,
      datasets: [{ label: 'Sale ₹', data: sorted.map(b => brSale[b]||0), backgroundColor: sorted.map(b => bc(b)+'55'), borderColor: sorted.map(b => bc(b)), borderWidth: 2, borderRadius: 5 }]
    },
    options: cOpts()
  });

  CH.bprofit = new Chart($('c-bprofit').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted,
      datasets: [{ label: 'Profit ₹', data: sorted.map(b => brProfit[b]||0), backgroundColor: sorted.map(b => (brProfit[b]||0)>=0 ? bc(b)+'55' : '#ef444440'), borderColor: sorted.map(b => (brProfit[b]||0)>=0 ? bc(b) : '#ef4444'), borderWidth: 2, borderRadius: 5 }]
    },
    options: cOpts()
  });

  const marginData = sorted.map(b => brSale[b] ? +((brProfit[b]||0)/brSale[b]*100).toFixed(2) : 0);
  CH.bmargin = new Chart($('c-bmargin').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted,
      datasets: [{ label: 'Margin %', data: marginData, backgroundColor: sorted.map(b => bc(b)+'44'), borderColor: sorted.map(b => bc(b)), borderWidth: 2, borderRadius: 4 }]
    },
    options: cOpts({
      scales: {
        x: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#3d4559',font:{family:'JetBrains Mono',size:9}} },
        y: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#3d4559',font:{family:'JetBrains Mono',size:9},callback:v=>v+'%'} }
      }
    })
  });

  const stockBrs = sorted.filter(b => (brStock[b]||0) > 0);
  CH.bstock = new Chart($('c-bstock').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: stockBrs,
      datasets: [{ data: stockBrs.map(b => brStock[b]||0), backgroundColor: stockBrs.map(b => bc(b)+'80'), borderColor: stockBrs.map(b => bc(b)), borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#6b7280', font: { size: 10 }, boxWidth: 10 } } } }
  });

  $('tbl-br').querySelector('tbody').innerHTML = sorted.map(br => {
    const s = brSale[br]||0, gp = brProfit[br]||0, pu = brPurch[br]||0, stv = brStock[br]||0;
    const mg = s ? gp/s*100 : 0;
    const sh = totSale ? s/totSale*100 : 0;
    return `<tr>
      <td>${bbrand(br)}</td>
      <td class="tv">${fi(s)}</td>
      <td class="tv">${fi(pu)}</td>
      <td class="tv ${gp>=0?'up':'dn'}">${fi(gp)}</td>
      <td class="tv ${mg>=15?'up':mg>0?'':'dn'}">${mg.toFixed(1)}%</td>
      <td class="tv">${fi(stv)}</td>
      <td class="tv">${sh.toFixed(1)}%</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--dim);padding:20px">No data</td></tr>';
}

/* ──────────────────────────────────────────────────────────────
   PAGE: ITEMS
────────────────────────────────────────────────────────────── */
function renderItems(mode) {
  if (mode) itMode = mode;
  const d = getSale();

  const itemMap = {};
  d.forEach(r => {
    const k = r.description_of_goods || 'Unknown';
    itemMap[k] = itemMap[k] || { sale: 0, profit: 0, qty: 0, brand: r.brand_name };
    itemMap[k].sale   += r.amount;
    itemMap[k].profit += r.profit;
    itemMap[k].qty    += r.qty;
  });

  const items = Object.entries(itemMap).map(([name, v]) => ({ name, ...v, margin: v.sale ? v.profit/v.sale*100 : 0 }));
  const totSale = items.reduce((s, x) => s + x.sale, 0);

  $('it-kpis').innerHTML =
    kpiCard('Total Items', items.length, 'unique items', '#f5a623') +
    kpiCard('Total Sale', fi(totSale), d.length + ' rows', '#22c55e') +
    kpiCard('Total Profit', fi(items.reduce((s,x)=>s+x.profit,0)), 'FIFO basis', '#3b82f6') +
    kpiCard('Best Margin', items.length ? [...items].sort((a,b)=>b.margin-a.margin)[0].margin.toFixed(1)+'%' : '—', 'top item', '#a855f7');

  let sorted;
  if (itMode === 'top') sorted = [...items].sort((a,b) => b.sale - a.sale).slice(0, 10);
  else if (itMode === 'bot') sorted = [...items].sort((a,b) => a.sale - b.sale).slice(0, 10);
  else sorted = [...items].sort((a,b) => b.profit - a.profit).slice(0, 10);

  $('it-ct').textContent = itMode === 'top' ? 'Top 10 Items by Sale' : itMode === 'bot' ? 'Bottom 10 Items' : 'Top 10 Items by Profit';

  kill('items');
  CH.items = new Chart($('c-items').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(x => tr(x.name, 26)),
      datasets: [{
        label: itMode === 'profit' ? 'Profit ₹' : 'Sale ₹',
        data: sorted.map(x => itMode === 'profit' ? x.profit : x.sale),
        backgroundColor: sorted.map(x => bc(x.brand)+'55'),
        borderColor: sorted.map(x => bc(x.brand)),
        borderWidth: 2,
        borderRadius: 5
      }]
    },
    options: { ...cOpts(), indexAxis: 'y' }
  });

  const tableItems = [...items].sort((a,b) => b.sale - a.sale);
  $('tbl-items').querySelector('tbody').innerHTML = tableItems.map((x, i) =>
    `<tr>
      <td class="rk">${i+1}</td>
      <td class="tnm tv">${x.name}</td>
      <td>${bbrand(x.brand)}</td>
      <td class="tv">${fn(x.qty)}</td>
      <td class="tv">${fi(x.sale)}</td>
      <td class="tv ${x.profit>=0?'up':'dn'}">${fi(x.profit)}</td>
      <td class="tv ${x.margin>=15?'up':x.margin>0?'':'dn'}">${x.margin.toFixed(1)}%</td>
    </tr>`
  ).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--dim);padding:20px">No data</td></tr>';
}

/* ──────────────────────────────────────────────────────────────
   PAGE: CUSTOMERS
────────────────────────────────────────────────────────────── */
function renderCustomers(mode) {
  if (mode) cuMode = mode;
  const d = getSale();

  const custMap = {};
  d.forEach(r => {
    const k = r.party_name || 'Unknown';
    custMap[k] = custMap[k] || { sale: 0, profit: 0, qty: 0 };
    custMap[k].sale   += r.amount;
    custMap[k].profit += r.profit;
    custMap[k].qty    += r.qty;
  });

  const custs = Object.entries(custMap).map(([party, v]) => ({ party, ...v }));
  const totSale = custs.reduce((s, c) => s + c.sale, 0);
  const topCustomer = [...custs].sort((a,b)=>b.sale-a.sale)[0];

  $('cu-kpis').innerHTML =
    kpiCard('Total Parties', custs.length, 'unique customers', '#f5a623') +
    kpiCard('Total Sale', fi(totSale), d.length + ' rows', '#22c55e') +
    kpiCard('Top Party', topCustomer?.party || '—', fi(topCustomer?.sale || 0), '#3b82f6') +
    kpiCard('Average per Party', fi(custs.length ? totSale/custs.length : 0), 'average revenue', '#a855f7');

  const sorted = cuMode === 'top'
    ? [...custs].sort((a,b) => b.sale - a.sale).slice(0, 10)
    : [...custs].sort((a,b) => a.sale - b.sale).slice(0, 10);

  $('cu-ct').textContent = cuMode === 'top' ? 'Top 10 Customers by Sale' : 'Bottom 10 Customers';

  kill('cust');
  kill('cpie');

  CH.cust = new Chart($('c-cust').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(c => tr(c.party, 22)),
      datasets: [{ label: 'Sale ₹', data: sorted.map(c => c.sale), backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length] + '55'), borderColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 2, borderRadius: 5 }]
    },
    options: { ...cOpts(), indexAxis: 'y' }
  });

  const top5 = [...custs].sort((a,b) => b.sale - a.sale).slice(0, 5);
  const othS = totSale - top5.reduce((s,c)=>s+c.sale,0);

  CH.cpie = new Chart($('c-cpie').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: [...top5.map(c => tr(c.party, 18)), 'Others'],
      datasets: [{ data: [...top5.map(c=>c.sale), othS > 0 ? othS : 0], backgroundColor: [...PALETTE.slice(0,5), '#6b7280'], borderColor: 'var(--s2)', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#6b7280', font: { size: 10 }, boxWidth: 10 } } } }
  });

  $('tbl-cust').querySelector('tbody').innerHTML = [...custs].sort((a,b)=>b.sale-a.sale).map((c, i) =>
    `<tr>
      <td class="rk">${i+1}</td>
      <td class="tnm">${tr(c.party, 32)}</td>
      <td class="tv">${fi(c.sale)}</td>
      <td class="tv ${c.profit>=0?'up':'dn'}">${fi(c.profit)}</td>
      <td class="tv">${fn(c.qty)}</td>
      <td class="tv">${totSale ? (c.sale/totSale*100).toFixed(1) : 0}%</td>
    </tr>`
  ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--dim);padding:20px">No data</td></tr>';
}

/* ──────────────────────────────────────────────────────────────
   PAGE: STOCK
────────────────────────────────────────────────────────────── */
function renderStock() {
  const st = getStock();

  const totVal = st.reduce((s,r) => s + r.closing_value, 0);
  const totQty = st.reduce((s,r) => s + r.closing_qty, 0);
  const maxVal = st.reduce((a,r) => r.closing_value > a.closing_value ? r : a, { closing_value: 0, brand_name: '—' });

  $('st-kpis').innerHTML =
    kpiCard('Latest Stock Value', fi(totVal), st.length + ' brands in stock', '#f5a623') +
    kpiCard('Total Closing Qty', fn(totQty), 'units', '#22c55e') +
    kpiCard('Highest Stock', maxVal.brand_name, fi(maxVal.closing_value), '#3b82f6') +
    kpiCard('Average per Brand', fi(st.length ? totVal/st.length : 0), 'average', '#a855f7');

  kill('sv');
  kill('sq');

  const sorted = [...st].sort((a,b) => b.closing_value - a.closing_value);

  CH.sv = new Chart($('c-sv').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.brand_name),
      datasets: [{ label: 'Closing Value ₹', data: sorted.map(r => r.closing_value), backgroundColor: sorted.map(r => bc(r.brand_name)+'55'), borderColor: sorted.map(r => bc(r.brand_name)), borderWidth: 2, borderRadius: 5 }]
    },
    options: cOpts()
  });

  CH.sq = new Chart($('c-sq').getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.brand_name),
      datasets: [{ label: 'Closing Qty', data: sorted.map(r => r.closing_qty), backgroundColor: sorted.map(r => bc(r.brand_name)+'44'), borderColor: sorted.map(r => bc(r.brand_name)), borderWidth: 2, borderRadius: 5 }]
    },
    options: cOpts({
      scales: {
        x: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#3d4559',font:{family:'JetBrains Mono',size:9}} },
        y: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#3d4559',font:{family:'JetBrains Mono',size:9},callback:v=>fn(v)} }
      }
    })
  });

  $('tbl-stock').querySelector('tbody').innerHTML = sorted.map(r => {
    const avg = r.closing_qty ? r.closing_value / r.closing_qty : 0;
    return `<tr>
      <td>${bbrand(r.brand_name)}</td>
      <td class="tv">${fi(r.closing_value)}</td>
      <td class="tv">${fn(r.closing_qty)}</td>
      <td class="tv">${fi(avg)}</td>
      <td class="tv">${r.as_on_date || '—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--dim);padding:20px">No stock data</td></tr>';
}

/* ──────────────────────────────────────────────────────────────
   PAGE: FORECAST
────────────────────────────────────────────────────────────── */
function wLinReg(pts) {
  if (!pts.length) return { m: 0, b: 0 };
  if (pts.length === 1) return { m: 0, b: pts[0].y };

  let sw=0, swx=0, swy=0, swxy=0, swx2=0;
  pts.forEach((p, i) => {
    const w = i + 1;
    sw += w;
    swx += w * p.x;
    swy += w * p.y;
    swxy += w * p.x * p.y;
    swx2 += w * p.x * p.x;
  });

  const det = sw*swx2 - swx*swx;
  if (!det) return { m: 0, b: swy/sw };

  const m = (sw*swxy - swx*swy) / det;
  return { m, b: (swy - m*swx) / sw };
}

function renderForecast() {
  const baseD = F.brands.size ? D.sale.filter(r => F.brands.has(r.brand_name)) : D.sale;
  const baseP = F.brands.size ? D.purchase.filter(r => F.brands.has(r.brand_name)) : D.purchase;

  const moSale   = {};
  const moProfit = {};
  const moPurch  = {};

  baseD.forEach(r => {
    const k = `${r.year_no}-${String(r.month_no).padStart(2,'0')}`;
    moSale[k]   = (moSale[k] || 0) + r.amount;
    moProfit[k] = (moProfit[k] || 0) + r.profit;
  });

  baseP.forEach(r => {
    const k = `${r.year_no}-${String(r.month_no).padStart(2,'0')}`;
    moPurch[k] = (moPurch[k] || 0) + r.purchase_value;
  });

  const allKeys  = [...new Set([...Object.keys(moSale), ...Object.keys(moPurch)])].sort();
  const n        = allKeys.length;
  const saleArr  = allKeys.map(k => moSale[k] || 0);
  const profArr  = allKeys.map(k => moProfit[k] || 0);
  const purchArr = allKeys.map(k => moPurch[k] || 0);
  const labels   = allKeys.map(k => { const [y,m]=k.split('-'); return MONTHS_S[+m-1]+'-'+y; });

  const q = n >= 8 ? 'high' : n >= 4 ? 'med' : 'low';
  $('fc-quality').className = 'alert ' + (q==='high'?'al-g':q==='med'?'al-w':'al-r');
  $('fc-quality').textContent =
    q==='high' ? `✅ ${n} months of history — high forecast accuracy`
    : q==='med' ? `⚠ ${n} months — medium accuracy. More data improves forecast.`
    : `❌ Only ${n} months — low accuracy. At least 4 months are recommended.`;

  $('fc-cs').textContent = `Weighted regression · ${n} months of history`;

  const { m: sm, b: sb } = wLinReg(saleArr.map((y,x) => ({x,y})));
  const { m: pm, b: pb } = wLinReg(profArr.map((y,x) => ({x,y})));

  const fcSale = [], fcProfit = [], fcLabels = [];
  let [fy, fm] = allKeys.length ? allKeys[allKeys.length-1].split('-').map(Number) : [2025, 1];

  for (let i = 1; i <= 3; i++) {
    fm++;
    if (fm > 12) { fm = 1; fy++; }
    fcLabels.push(MONTHS_S[fm-1] + '-' + fy);
    fcSale.push(Math.max(0, sm*(n+i-1)+sb));
    fcProfit.push(pm*(n+i-1)+pb);
  }

  const allLab    = [...labels, ...fcLabels];
  const actSale   = [...saleArr, ...Array(3).fill(null)];
  const actProfit = [...profArr, ...Array(3).fill(null)];
  const fcastS    = [...Array(Math.max(n-1,0)).fill(null), saleArr[n-1]||0, ...fcSale];
  const fcastP    = [...Array(Math.max(n-1,0)).fill(null), profArr[n-1]||0, ...fcProfit];

  const fc3mo = fcSale.reduce((s,v)=>s+v,0);
  $('fc-kpis').innerHTML =
    kpiCard('Months Used', n, 'in regression model', '#f5a623') +
    kpiCard('Forecast (3 Months)', fi(fc3mo), 'projected sale', '#22c55e') +
    kpiCard('Monthly Trend', sm>=0?'Growing':'Declining', (sm>=0?'+':'')+fi(sm)+'/month', sm>=0?'#22c55e':'#ef4444') +
    kpiCard('Accuracy', q==='high'?'High':q==='med'?'Medium':'Low', n+' months', '#a855f7');

  kill('fcline');
  kill('fcps');
  kill('fcbrand');

  CH.fcline = new Chart($('c-fc-line').getContext('2d'), {
    type: 'line',
    data: { labels: allLab, datasets: [
      { label: 'Actual Sale ₹', data: actSale, borderColor:'#22c55e', backgroundColor:'#22c55e0d', tension:.35, fill:true, pointRadius:2, borderWidth:2.5 },
      { label: 'Actual Profit ₹', data: actProfit, borderColor:'#3b82f6', backgroundColor:'#3b82f60d', tension:.35, fill:true, pointRadius:2, borderWidth:2 },
      { label: 'Forecast Sale ₹', data: fcastS, borderColor:'#f5a623', borderDash:[7,4], backgroundColor:'transparent', tension:.3, fill:false, pointRadius:7, borderWidth:2.5, pointStyle:'triangle' },
      { label: 'Forecast Profit ₹', data: fcastP, borderColor:'#a855f7', borderDash:[7,4], backgroundColor:'transparent', tension:.3, fill:false, pointRadius:7, borderWidth:2, pointStyle:'triangle' },
    ]},
    options: cOpts()
  });

  CH.fcps = new Chart($('c-fc-ps').getContext('2d'), {
    type: 'line',
    data: { labels: labels, datasets: [
      { label: 'Sale ₹', data: saleArr, borderColor:'#22c55e', backgroundColor:'#22c55e0d', tension:.4, fill:true, pointRadius:3, borderWidth:2 },
      { label: 'Purchase ₹', data: purchArr, borderColor:'#3b82f6', backgroundColor:'#3b82f60d', tension:.4, fill:true, pointRadius:3, borderWidth:2 },
    ]},
    options: cOpts()
  });

  const brBrands = [...new Set(baseD.map(r => r.brand_name))];
  const brFcData = brBrands.map(br => {
    const mhist = allKeys.map(k => {
      const [y,m] = k.split('-').map(Number);
      return baseD.filter(r => r.brand_name===br && r.year_no===y && r.month_no===m).reduce((s,r)=>s+r.amount,0);
    });
    const { m: bm, b: bb } = wLinReg(mhist.map((y,x)=>({x,y})));
    return Math.max(0, bm * mhist.length + bb);
  });

  CH.fcbrand = new Chart($('c-fc-brand').getContext('2d'), {
    type: 'bar',
    data: { labels: brBrands, datasets: [{ label: 'Forecast Next Month ₹', data: brFcData, backgroundColor: brBrands.map(b=>bc(b)+'55'), borderColor: brBrands.map(b=>bc(b)), borderWidth:2, borderRadius:5 }] },
    options: cOpts()
  });

  const itemMo = {};
  baseD.forEach(r => {
    const k = `${r.description_of_goods}`;
    const mk = `${r.year_no}-${String(r.month_no).padStart(2,'0')}`;
    if (!itemMo[k]) itemMo[k] = { brand: r.brand_name, monthly: {} };
    itemMo[k].monthly[mk] = (itemMo[k].monthly[mk] || 0) + r.amount;
  });

  const itemFc = Object.entries(itemMo).map(([name, v]) => {
    const hist = allKeys.map(k => v.monthly[k] || 0);
    const {m: im, b: ib} = wLinReg(hist.map((y,x)=>({x,y})));
    const avgMo = hist.reduce((s,v)=>s+v,0) / Math.max(hist.filter(v=>v>0).length,1);
    const fc = Math.max(0, im*hist.length+ib);
    const chg = avgMo > 0 ? (fc - avgMo) / avgMo * 100 : 0;
    return { name, brand: v.brand, avg: avgMo, fc, chg };
  }).sort((a,b)=>b.avg-a.avg).slice(0,15);

  $('tbl-fc').querySelector('tbody').innerHTML = itemFc.map((x, i) =>
    `<tr>
      <td class="rk">${i+1}</td>
      <td class="tnm tv">${tr(x.name, 30)}</td>
      <td>${bbrand(x.brand)}</td>
      <td class="tv">${fi(x.avg)}</td>
      <td class="tv">${fi(x.fc)}</td>
      <td class="tv ${x.chg>=0?'up':'dn'}">${x.chg>=0?'+':''}${x.chg.toFixed(1)}%</td>
    </tr>`
  ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--dim);padding:20px">No data</td></tr>';
}

/* ──────────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────────── */
(function init() {

  document.querySelectorAll('.ptab').forEach(t =>
    t.addEventListener('click', () => showPage(t.dataset.pg))
  );

  document.querySelectorAll('.tab2').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.g, m = btn.dataset.m;
      document.querySelectorAll(`.tab2[data-g="${g}"]`).forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      if (g === 'it') renderItems(m);
      if (g === 'cu') renderCustomers(m);
    });
  });

  document.addEventListener('click', (e) => {
    const menu = $('year-dd-menu');
    if (!menu) return;
    const dd = document.querySelector('.year-dd');
    if (dd && !dd.contains(e.target)) {
      menu.classList.remove('show');
    }
  });

  (async () => {
    if (SB_URL === 'YOUR_SUPABASE_URL') return;

    try {
      SB_CLIENT = supabase.createClient(SB_URL, SB_KEY);
      const { data: { session } } = await SB_CLIENT.auth.getSession();
      if (session) {
        $('nav-user').textContent = session.user.email;
        showScreen('dash');
        await loadAllData();
      }
    } catch (e) {
      console.warn('Session check failed:', e.message);
    }
  })();

})();
