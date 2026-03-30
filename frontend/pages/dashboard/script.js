const PRODUCTS_KEY = "estoque_products_v1";
const SALES_KEY = "sales_history_v1";
const USERS_KEY = "users_registry_v1";
/** Quantidade máxima considerada “estoque baixo” (acima de 0). */
const LOW_STOCK_THRESHOLD = 5;

const kpiFatDia = document.getElementById("kpiFatDia");
const kpiFatMes = document.getElementById("kpiFatMes");
const kpiQtdVendas = document.getElementById("kpiQtdVendas");
const kpiUnidadesMes = document.getElementById("kpiUnidadesMes");
const kpiTicket = document.getElementById("kpiTicket");
const chartGranularity = document.getElementById("chartGranularity");
const salesChartCanvas = document.getElementById("salesChart");
const chartEmpty = document.getElementById("chartEmpty");
const rankingBody = document.getElementById("rankingBody");
const rankingEmpty = document.getElementById("rankingEmpty");
const clientRankingBody = document.getElementById("clientRankingBody");
const clientRankingEmpty = document.getElementById("clientRankingEmpty");
const stockLowCount = document.getElementById("stockLowCount");
const stockZeroCount = document.getElementById("stockZeroCount");
const stockTotalUnits = document.getElementById("stockTotalUnits");
const listStockLow = document.getElementById("listStockLow");
const listStockZero = document.getElementById("listStockZero");
const listStockLowEmpty = document.getElementById("listStockLowEmpty");
const listStockZeroEmpty = document.getElementById("listStockZeroEmpty");
const lowStockThresholdLabel = document.getElementById("lowStockThresholdLabel");
const refreshBtn = document.getElementById("refreshBtn");
const loadMockBtn = document.getElementById("loadMockBtn");
const removeMockBtn = document.getElementById("removeMockBtn");

let chartInstance = null;

function formatBRL(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function loadProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function loadSales() {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saleDate(sale) {
  const d = new Date(sale.at);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isThisMonth(d, ref = new Date()) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dayKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  const offset = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function lastNWeekStarts(n, ref = new Date()) {
  const out = [];
  let d = startOfWeekMonday(ref);
  for (let i = 0; i < n; i++) {
    out.unshift(new Date(d));
    d = new Date(d);
    d.setDate(d.getDate() - 7);
  }
  return out;
}

function updateKpis() {
  const sales = loadSales();
  const now = new Date();
  let fatDia = 0;
  let fatMes = 0;
  let vendasMes = 0;
  let unidadesMes = 0;

  for (const s of sales) {
    const d = saleDate(s);
    if (!d) continue;
    const t = Number(s.total);
    const total = Number.isFinite(t) ? t : 0;
    if (isSameDay(d, now)) fatDia += total;
    if (isThisMonth(d, now)) {
      fatMes += total;
      vendasMes += 1;
      const items = Array.isArray(s.items) ? s.items : [];
      for (const it of items) {
        const q = Math.max(0, Math.floor(Number(it.qty) || 0));
        unidadesMes += q;
      }
    }
  }

  const ticket = vendasMes > 0 ? fatMes / vendasMes : 0;

  if (kpiFatDia) kpiFatDia.textContent = formatBRL(fatDia);
  if (kpiFatMes) kpiFatMes.textContent = formatBRL(fatMes);
  if (kpiQtdVendas) kpiQtdVendas.textContent = String(vendasMes);
  if (kpiUnidadesMes) kpiUnidadesMes.textContent = String(unidadesMes);
  if (kpiTicket) kpiTicket.textContent = formatBRL(ticket);
}

function getChartSeries(mode) {
  const sales = loadSales();
  const now = new Date();

  if (mode === "dia") {
    const keys = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      keys.push(dayKey(d));
    }
    const map = new Map(keys.map((k) => [k, 0]));
    const countMap = new Map(keys.map((k) => [k, 0]));
    for (const s of sales) {
      const d = saleDate(s);
      if (!d) continue;
      const k = dayKey(d);
      if (map.has(k)) {
        const t = Number(s.total);
        map.set(k, map.get(k) + (Number.isFinite(t) ? t : 0));
        countMap.set(k, countMap.get(k) + 1);
      }
    }
    const labels = keys.map((k) => {
      const [, m, dd] = k.split("-");
      return `${dd}/${m}`;
    });
    return {
      labels,
      values: keys.map((k) => map.get(k)),
      counts: keys.map((k) => countMap.get(k) ?? 0)
    };
  }

  if (mode === "semana") {
    const starts = lastNWeekStarts(8, now);
    const keys = starts.map((st) => dayKey(st));
    const map = new Map(keys.map((k) => [k, 0]));
    const countMap = new Map(keys.map((k) => [k, 0]));
    for (const s of sales) {
      const d = saleDate(s);
      if (!d) continue;
      const k = dayKey(startOfWeekMonday(d));
      if (map.has(k)) {
        const t = Number(s.total);
        map.set(k, map.get(k) + (Number.isFinite(t) ? t : 0));
        countMap.set(k, countMap.get(k) + 1);
      }
    }
    const labels = starts.map((st) => {
      const dd = pad2(st.getDate());
      const m = pad2(st.getMonth() + 1);
      return `Sem. ${dd}/${m}`;
    });
    return {
      labels,
      values: keys.map((k) => map.get(k)),
      counts: keys.map((k) => countMap.get(k) ?? 0)
    };
  }

  const keys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  const map = new Map(keys.map((k) => [k, 0]));
  const countMap = new Map(keys.map((k) => [k, 0]));
  for (const s of sales) {
    const d = saleDate(s);
    if (!d) continue;
    const k = monthKey(d);
    if (map.has(k)) {
      const t = Number(s.total);
      map.set(k, map.get(k) + (Number.isFinite(t) ? t : 0));
      countMap.set(k, countMap.get(k) + 1);
    }
  }
  const labels = keys.map((k) => {
    const [, m] = k.split("-");
    const y = k.slice(0, 4);
    return `${m}/${y}`;
  });
  return {
    labels,
    values: keys.map((k) => map.get(k)),
    counts: keys.map((k) => countMap.get(k) ?? 0)
  };
}

function renderChart() {
  if (!salesChartCanvas || typeof Chart === "undefined") return;

  const mode = chartGranularity && chartGranularity.value ? chartGranularity.value : "dia";
  const { labels, values, counts } = getChartSeries(mode);
  const hasSales = loadSales().length > 0;

  if (chartEmpty) {
    chartEmpty.classList.toggle("hidden", hasSales);
  }
  if (salesChartCanvas) salesChartCanvas.classList.toggle("hidden", !hasSales);

  if (!hasSales) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(salesChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: values,
          borderColor: "rgb(37 99 235)",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const i = ctx.dataIndex;
              const c = counts[i] ?? 0;
              return c === 1 ? "1 venda" : `${c} vendas`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) =>
              new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
                Number(v)
              )
          }
        }
      }
    }
  });
}

function topProducts(limit = 15) {
  const map = new Map();
  for (const s of loadSales()) {
    const items = Array.isArray(s.items) ? s.items : [];
    for (const it of items) {
      const id = String(it.productId ?? "");
      const nomeRaw = it.nome ? String(it.nome) : "—";
      const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
      const sub = Number(it.subtotal);
      const receita = Number.isFinite(sub) ? sub : (Number(it.precoUnit) || 0) * qty;
      const cur = map.get(id) || { nome: nomeRaw, qty: 0, receita: 0 };
      cur.qty += qty;
      cur.receita += receita;
      if (nomeRaw && nomeRaw !== "—") cur.nome = nomeRaw;
      map.set(id, cur);
    }
  }
  return [...map.entries()]
    .map(([, v]) => v)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

function renderRanking() {
  if (!rankingBody || !rankingEmpty) return;
  rankingBody.innerHTML = "";
  const rows = topProducts(20);
  if (rows.length === 0) {
    rankingEmpty.classList.remove("hidden");
    return;
  }
  rankingEmpty.classList.add("hidden");
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-2 pr-2 text-slate-500">${idx + 1}</td>
      <td class="py-2 pr-2 font-medium text-slate-800">${escapeHtml(r.nome)}</td>
      <td class="py-2 pr-2 text-right tabular-nums">${r.qty}</td>
      <td class="py-2 text-right font-medium text-slate-800 tabular-nums">${formatBRL(r.receita)}</td>
    `;
    rankingBody.appendChild(tr);
  });
}

function topClients(limit = 20) {
  const map = new Map();
  for (const s of loadSales()) {
    const clientId = s.clientId ? String(s.clientId) : null;
    if (!clientId) continue;
    const t = Number(s.total);
    const gasto = Number.isFinite(t) ? t : 0;
    const cur = map.get(clientId) || { clientId, pedidos: 0, gasto: 0 };
    cur.pedidos += 1;
    cur.gasto += gasto;
    map.set(clientId, cur);
  }

  const userMap = new Map(loadUsers().map((u) => [String(u.id), u]));

  return [...map.values()]
    .map((c) => {
      const user = userMap.get(c.clientId);
      return { ...c, nome: user && user.nome ? String(user.nome) : c.clientId };
    })
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, limit);
}

function renderClientRanking() {
  if (!clientRankingBody || !clientRankingEmpty) return;
  clientRankingBody.innerHTML = "";
  const rows = topClients(20);
  if (rows.length === 0) {
    clientRankingEmpty.classList.remove("hidden");
    return;
  }
  clientRankingEmpty.classList.add("hidden");
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-2 pr-2 text-slate-500">${idx + 1}</td>
      <td class="py-2 pr-2 font-medium text-slate-800">${escapeHtml(r.nome)}</td>
      <td class="py-2 pr-2 text-right tabular-nums">${r.pedidos}</td>
      <td class="py-2 text-right font-medium text-slate-800 tabular-nums">${formatBRL(r.gasto)}</td>
    `;
    clientRankingBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productQty(p) {
  const q = Number(p.quantidade);
  return Number.isFinite(q) && !Number.isNaN(q) ? Math.max(0, Math.floor(q)) : 0;
}

function renderStock() {
  const products = loadProducts();
  let totalUnits = 0;
  const low = [];
  const zero = [];

  for (const p of products) {
    const q = productQty(p);
    totalUnits += q;
    const nome = p.nome ? String(p.nome) : "—";
    if (q === 0) zero.push({ nome, q });
    else if (q <= LOW_STOCK_THRESHOLD) low.push({ nome, q });
  }

  if (lowStockThresholdLabel) lowStockThresholdLabel.textContent = String(LOW_STOCK_THRESHOLD);
  if (stockLowCount) stockLowCount.textContent = String(low.length);
  if (stockZeroCount) stockZeroCount.textContent = String(zero.length);
  if (stockTotalUnits) stockTotalUnits.textContent = String(totalUnits);

  function fillList(ul, items, emptyEl) {
    if (!ul) return;
    ul.innerHTML = "";
    if (items.length === 0) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "flex justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2";
      li.innerHTML = `<span class="truncate text-slate-800">${escapeHtml(it.nome)}</span><span class="shrink-0 font-medium tabular-nums">${it.q}</span>`;
      ul.appendChild(li);
    });
  }

  fillList(listStockLow, low, listStockLowEmpty);
  fillList(listStockZero, zero, listStockZeroEmpty);
}

function refreshAll() {
  updateKpis();
  renderChart();
  renderRanking();
  renderClientRanking();
  renderStock();
}

if (chartGranularity) {
  chartGranularity.addEventListener("change", () => renderChart());
}
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => refreshAll());
}

if (loadMockBtn && window.DashboardMock) {
  loadMockBtn.addEventListener("click", () => {
    if (
      !confirm(
        "Carregar dados fictícios? Qualquer demonstração carregada antes será substituída; vendas e produtos reais (sem o prefixo de mock) não serão apagados."
      )
    ) {
      return;
    }
    window.DashboardMock.apply();
    refreshAll();
  });
}

if (removeMockBtn && window.DashboardMock) {
  removeMockBtn.addEventListener("click", () => {
    if (!confirm("Remover apenas vendas e produtos da demonstração?")) return;
    window.DashboardMock.remove();
    refreshAll();
  });
}

window.addEventListener("storage", (e) => {
  if (e.key === SALES_KEY || e.key === PRODUCTS_KEY || e.key === USERS_KEY) refreshAll();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshAll();
});

if (lowStockThresholdLabel) lowStockThresholdLabel.textContent = String(LOW_STOCK_THRESHOLD);
refreshAll();
