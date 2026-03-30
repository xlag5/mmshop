/**
 * Dados fictícios para demonstração do dashboard.
 * Prefixos permitem remover só o mock sem apagar vendas/estoque reais.
 */
const DASHBOARD_MOCK_SALES_PREFIX = "dashboard-mock-sale-";
const DASHBOARD_MOCK_PRODUCT_PREFIX = "dashboard-mock-product-";

const MOCK_SALES_KEY = "sales_history_v1";
const MOCK_PRODUCTS_KEY = "estoque_products_v1";

function mockLoadSales() {
  try {
    const raw = localStorage.getItem(MOCK_SALES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function mockSaveSales(sales) {
  localStorage.setItem(MOCK_SALES_KEY, JSON.stringify(sales));
}

function mockLoadProducts() {
  try {
    const raw = localStorage.getItem(MOCK_PRODUCTS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function mockSaveProducts(products) {
  localStorage.setItem(MOCK_PRODUCTS_KEY, JSON.stringify(products));
}

function stripMockSales(sales) {
  return sales.filter((s) => !String(s.id || "").startsWith(DASHBOARD_MOCK_SALES_PREFIX));
}

function stripMockProducts(products) {
  return products.filter((p) => !String(p.id || "").startsWith(DASHBOARD_MOCK_PRODUCT_PREFIX));
}

/**
 * Catálogo de loja de tereré (ervas, cuias, bombas, copos).
 * Estoques variados para o painel: alto, baixo (≤5) e zero.
 */
function buildMockProductCatalog() {
  return [
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}1`,
      nome: "Erva para tereré 1 kg (tradicional)",
      preco: 28.9,
      quantidade: 92
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}2`,
      nome: "Erva composta menta-limão 500 g",
      preco: 22.5,
      quantidade: 4
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}3`,
      nome: "Cuia de couro natural média",
      preco: 48.0,
      quantidade: 24
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}4`,
      nome: "Cuia inox com bocal 350 ml",
      preco: 34.9,
      quantidade: 3
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}5`,
      nome: "Bomba inox desmontável com mola",
      preco: 26.9,
      quantidade: 0
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}6`,
      nome: "Bomba inox tradicional curva",
      preco: 19.9,
      quantidade: 38
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}7`,
      nome: "Copo térmico para tereré 473 ml",
      preco: 72.9,
      quantidade: 5
    },
    {
      id: `${DASHBOARD_MOCK_PRODUCT_PREFIX}8`,
      nome: "Copo de acrílico com tampa 700 ml",
      preco: 36.5,
      quantidade: 14
    }
  ].map((p) => ({ ...p, foto: null }));
}

/**
 * Gera vendas nos últimos ~55 dias (incluindo hoje), com picos e quedas para o gráfico.
 * @param {ReturnType<buildMockProductCatalog>} catalog
 */
function buildMockSales(catalog) {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const pick = (ids) => {
    const rows = ids.map((id) => byId.get(id)).filter(Boolean);
    const items = [];
    let total = 0;
    for (const p of rows) {
      const weights = [1, 2, 2, 3, 4, 5];
      const qty = weights[Math.floor(Math.random() * weights.length)];
      const precoUnit = Number(p.preco) || 0;
      const subtotal = Math.round(precoUnit * qty * 100) / 100;
      total += subtotal;
      items.push({
        productId: p.id,
        nome: p.nome,
        qty,
        precoUnit,
        subtotal
      });
    }
    return { items, total: Math.round(total * 100) / 100 };
  };

  const ids = catalog.map((p) => p.id);
  /** Combinações típicas: kit erva+cuia+bomba, só erva, copo térmico + erva, etc. */
  const combos = [
    [ids[0], ids[2], ids[5]],
    [ids[0], ids[3], ids[6]],
    [ids[0], ids[5]],
    [ids[1], ids[2]],
    [ids[1], ids[7]],
    [ids[0], ids[4], ids[6]],
    [ids[2], ids[6]],
    [ids[3], ids[5]],
    [ids[0]],
    [ids[1], ids[3]],
    [ids[6], ids[7]],
    [ids[0], ids[7]],
    [ids[4], ids[0]]
  ];

  const sales = [];
  let saleIndex = 0;
  const now = new Date();

  /** Padrão de “intensidade” por dia (0 = sem venda, 1 = leve, 2 = forte) */
  const pattern = [
    2, 1, 1, 0, 2, 1, 0, 2, 2, 1, 0, 1, 2, 1, 1, 2, 0, 1, 2, 1, 1, 0, 2, 1, 2, 2, 0, 1, 1, 2, 1, 0, 1, 2, 1, 2, 0, 1, 1, 2, 1, 0, 2, 1, 1, 2, 1, 0, 2, 2, 1, 1, 0, 2, 1, 1
  ];

  for (let day = 0; day < pattern.length; day++) {
    const intensity = pattern[day];
    const count = intensity === 0 ? 0 : intensity === 1 ? 1 : 1 + Math.floor(Math.random() * 2);

    for (let v = 0; v < count; v++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      const hour = 9 + Math.floor(Math.random() * 9);
      const min = Math.floor(Math.random() * 60);
      d.setHours(hour, min, 0, 0);

      const combo = combos[Math.floor(Math.random() * combos.length)];
      const { items, total } = pick(combo);

      sales.push({
        id: `${DASHBOARD_MOCK_SALES_PREFIX}${saleIndex++}`,
        at: d.toISOString(),
        total,
        clientId: Math.random() > 0.4 ? "mock-cliente" : null,
        items
      });
    }
  }

  /** Garante pelo menos duas vendas “hoje” para o KPI do dia */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let extra = 0; extra < 2; extra++) {
    const d = new Date(today);
    d.setHours(12 + extra * 4, 20, 0, 0);
    const combo = combos[extra % combos.length];
    const { items, total } = pick(combo);
    sales.push({
      id: `${DASHBOARD_MOCK_SALES_PREFIX}${saleIndex++}`,
      at: d.toISOString(),
      total,
      clientId: null,
      items
    });
  }

  return sales.sort((a, b) => new Date(b.at) - new Date(a.at));
}

function applyDashboardMock() {
  const catalog = buildMockProductCatalog();
  const mockSales = buildMockSales(catalog);
  const withoutMockSales = stripMockSales(mockLoadSales());
  const withoutMockProducts = stripMockProducts(mockLoadProducts());

  mockSaveSales([...mockSales, ...withoutMockSales]);
  mockSaveProducts([...catalog, ...withoutMockProducts]);
}

function removeDashboardMock() {
  mockSaveSales(stripMockSales(mockLoadSales()));
  mockSaveProducts(stripMockProducts(mockLoadProducts()));
}

window.DashboardMock = {
  apply: applyDashboardMock,
  remove: removeDashboardMock
};
