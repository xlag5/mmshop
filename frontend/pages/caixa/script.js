/** Mesma chave usada em `pages/estoque/script.js` */
const STORAGE_KEY = "estoque_products_v1";
/** Mesma chave usada em `pages/usuarios/script.js` */
const USERS_STORAGE_KEY = "users_registry_v1";
/** Histórico de vendas (usado no dashboard) */
const SALES_KEY = "sales_history_v1";

const productsGrid = document.getElementById("productsGrid");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");
const selectionCount = document.getElementById("selectionCount");
const finalizeBtn = document.getElementById("finalizeBtn");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutBackdrop = document.getElementById("checkoutBackdrop");
const checkoutCloseBtn = document.getElementById("checkoutCloseBtn");
const checkoutConfirmBtn = document.getElementById("checkoutConfirmBtn");
const checkoutList = document.getElementById("checkoutList");
const checkoutEmpty = document.getElementById("checkoutEmpty");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutClienteSelect = document.getElementById("checkoutClienteSelect");
const checkoutFormError = document.getElementById("checkoutFormError");

/** IDs dos produtos marcados na checkbox (persiste durante a sessão na página). */
const selectedIds = new Set();

/** Quantidade por produto na modal do pedido (id → inteiro ≥ 0). */
const checkoutQtyByProductId = new Map();

let checkoutModalOpen = false;

function formatBRL(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadSales() {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSales(sales) {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

function appendSale(entry) {
  const sales = loadSales();
  sales.unshift(entry);
  saveSales(sales);
}

function loadAllUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getClientUsers() {
  return loadAllUsers().filter((u) => u && u.tipo === "cliente");
}

function populateClienteSelect() {
  if (!checkoutClienteSelect) return;

  const previous = checkoutClienteSelect.value;
  checkoutClienteSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione o cliente";
  checkoutClienteSelect.appendChild(placeholder);

  getClientUsers().forEach((u) => {
    const opt = document.createElement("option");
    opt.value = String(u.id);
    const nome = u.nome ? String(u.nome) : "—";
    const email = u.email ? String(u.email) : "";
    opt.textContent = email ? `${nome} (${email})` : nome;
    checkoutClienteSelect.appendChild(opt);
  });

  const hasPrevious = previous && [...checkoutClienteSelect.options].some((o) => o.value === previous);
  checkoutClienteSelect.value = hasPrevious ? previous : "";
}

function getSelectedProductsInOrder() {
  return loadProducts().filter((p) => selectedIds.has(p.id));
}

function getProductStock(p) {
  const q = Number(p.quantidade);
  return Number.isFinite(q) && !Number.isNaN(q) ? Math.max(0, Math.floor(q)) : 0;
}

function syncCheckoutQuantities() {
  const selected = getSelectedProductsInOrder();
  const activeIds = new Set(selected.map((p) => p.id));

  for (const id of [...checkoutQtyByProductId.keys()]) {
    if (!activeIds.has(id)) checkoutQtyByProductId.delete(id);
  }

  selected.forEach((p) => {
    const stock = getProductStock(p);
    let qty = checkoutQtyByProductId.has(p.id) ? Number(checkoutQtyByProductId.get(p.id)) : 1;

    if (!Number.isFinite(qty)) qty = 1;
    qty = Math.floor(qty);

    if (stock <= 0) {
      checkoutQtyByProductId.set(p.id, 0);
      return;
    }

    qty = Math.min(Math.max(1, qty), stock);
    checkoutQtyByProductId.set(p.id, qty);
  });
}

function hideCheckoutFormError() {
  if (!checkoutFormError) return;
  checkoutFormError.textContent = "";
  checkoutFormError.classList.add("hidden");
}

function showCheckoutFormError(message) {
  if (!checkoutFormError) return;
  checkoutFormError.textContent = message;
  checkoutFormError.classList.remove("hidden");
}

function updateCheckoutTotal() {
  if (!checkoutTotal) return;
  let total = 0;
  getSelectedProductsInOrder().forEach((p) => {
    const precoNum = Number(p.preco);
    const preco = Number.isNaN(precoNum) ? 0 : precoNum;
    const qtyRaw = checkoutQtyByProductId.get(p.id);
    const qty = Number.isFinite(Number(qtyRaw)) ? Math.max(0, Math.floor(Number(qtyRaw))) : 0;
    total += preco * qty;
  });
  checkoutTotal.textContent = formatBRL(total);
}

function updateFinalizeButton() {
  if (!finalizeBtn) return;
  const has = selectedIds.size > 0;
  finalizeBtn.disabled = !has;
  finalizeBtn.title = has ? "" : "Selecione ao menos um produto";
}

function updateSelectionSummary() {
  if (!selectionCount) return;
  const n = selectedIds.size;
  selectionCount.textContent =
    n === 0
      ? "Nenhum item selecionado."
      : n === 1
        ? "1 item selecionado."
        : `${n} itens selecionados.`;
  updateFinalizeButton();
}

function pruneSelection(validIds) {
  for (const id of [...selectedIds]) {
    if (!validIds.has(id)) selectedIds.delete(id);
  }
}

function populateCheckoutModal() {
  if (!checkoutList || !checkoutEmpty || !checkoutTotal) return;

  hideCheckoutFormError();
  syncCheckoutQuantities();

  const selected = getSelectedProductsInOrder();
  checkoutList.innerHTML = "";

  if (selected.length === 0) {
    checkoutEmpty.classList.remove("hidden");
    checkoutList.classList.add("hidden");
    checkoutTotal.textContent = formatBRL(0);
    return;
  }

  checkoutEmpty.classList.add("hidden");
  checkoutList.classList.remove("hidden");

  selected.forEach((p) => {
    const precoNum = Number(p.preco);
    const preco = Number.isNaN(precoNum) ? 0 : precoNum;
    const stock = getProductStock(p);
    const qty = checkoutQtyByProductId.get(p.id) ?? 0;

    const li = document.createElement("li");
    li.className =
      "flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between";

    const left = document.createElement("div");
    left.className = "min-w-0 flex-1";

    const name = document.createElement("p");
    name.className = "font-medium text-slate-800 truncate";
    name.textContent = p.nome ? String(p.nome) : "—";

    const meta = document.createElement("p");
    meta.className = "text-xs text-slate-500 mt-0.5";
    meta.textContent = `Preço unit.: ${formatBRL(preco)} · Estoque: ${stock}`;

    left.append(name, meta);

    const controls = document.createElement("div");
    controls.className = "flex flex-wrap items-center gap-3 sm:justify-end";

    const qtyWrap = document.createElement("div");
    qtyWrap.className = "flex items-center gap-2";

    const qtyLabel = document.createElement("label");
    qtyLabel.className = "text-xs font-medium text-slate-600 whitespace-nowrap";
    qtyLabel.setAttribute("for", `checkout-qty-${p.id}`);
    qtyLabel.textContent = "Qtd.";

    const qtyInput = document.createElement("input");
    qtyInput.id = `checkout-qty-${p.id}`;
    qtyInput.type = "number";
    qtyInput.inputMode = "numeric";
    qtyInput.min = stock > 0 ? "1" : "0";
    qtyInput.max = String(stock);
    qtyInput.step = "1";
    qtyInput.disabled = stock <= 0;
    qtyInput.value = String(stock <= 0 ? 0 : qty);
    qtyInput.className =
      "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500";

    const subtotalSpan = document.createElement("span");
    subtotalSpan.className = "min-w-[5.5rem] text-right font-semibold text-slate-800 tabular-nums";
    subtotalSpan.textContent = formatBRL(preco * (stock <= 0 ? 0 : qty));

    const applyQtyFromInput = () => {
      let v = Math.floor(Number(qtyInput.value));
      if (!Number.isFinite(v)) v = stock > 0 ? 1 : 0;
      if (stock <= 0) {
        v = 0;
      } else {
        v = Math.min(Math.max(1, v), stock);
      }
      checkoutQtyByProductId.set(p.id, v);
      qtyInput.value = String(v);
      subtotalSpan.textContent = formatBRL(preco * v);
      updateCheckoutTotal();
    };

    qtyInput.addEventListener("change", applyQtyFromInput);
    qtyInput.addEventListener("input", () => {
      let v = Math.floor(Number(qtyInput.value));
      if (!Number.isFinite(v)) return;
      if (stock <= 0) {
        subtotalSpan.textContent = formatBRL(0);
        updateCheckoutTotal();
        return;
      }
      v = Math.min(Math.max(1, v), stock);
      checkoutQtyByProductId.set(p.id, v);
      subtotalSpan.textContent = formatBRL(preco * v);
      updateCheckoutTotal();
    });

    qtyWrap.append(qtyLabel, qtyInput);

    controls.append(qtyWrap, subtotalSpan);
    li.append(left, controls);
    checkoutList.appendChild(li);
  });

  updateCheckoutTotal();
}

function onCheckoutKeydown(event) {
  if (event.key === "Escape" && checkoutModalOpen) {
    event.preventDefault();
    closeCheckoutModal();
  }
}

function openCheckoutModal() {
  if (!checkoutModal || selectedIds.size === 0) return;

  hideCheckoutFormError();
  populateClienteSelect();
  populateCheckoutModal();
  checkoutModal.classList.remove("hidden");
  checkoutModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("overflow-hidden");
  checkoutModalOpen = true;
  document.addEventListener("keydown", onCheckoutKeydown);
  if (checkoutCloseBtn) checkoutCloseBtn.focus();
}

function closeCheckoutModal() {
  if (!checkoutModal) return;

  hideCheckoutFormError();
  checkoutQtyByProductId.clear();
  checkoutModal.classList.add("hidden");
  checkoutModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("overflow-hidden");
  checkoutModalOpen = false;
  document.removeEventListener("keydown", onCheckoutKeydown);
  if (finalizeBtn && !finalizeBtn.disabled) finalizeBtn.focus();
}

function confirmCheckout() {
  if (selectedIds.size === 0) return;

  hideCheckoutFormError();
  syncCheckoutQuantities();

  const selected = getSelectedProductsInOrder();
  for (const p of selected) {
    const stock = getProductStock(p);
    const qty = checkoutQtyByProductId.get(p.id) ?? 0;
    const nome = p.nome ? String(p.nome) : "Produto";
    if (stock <= 0) {
      showCheckoutFormError(`“${nome}” está sem estoque. Remova-o do pedido ou ajuste o estoque.`);
      return;
    }
    if (qty < 1 || qty > stock) {
      showCheckoutFormError(`Quantidade inválida para “${nome}”. Use entre 1 e ${stock}.`);
      return;
    }
  }

  const products = loadProducts();
  const at = new Date();
  const itemsRegistro = selected.map((p) => {
    const precoNum = Number(p.preco);
    const preco = Number.isNaN(precoNum) ? 0 : precoNum;
    const qty = Math.max(0, Math.floor(Number(checkoutQtyByProductId.get(p.id) ?? 0)));
    return {
      productId: String(p.id),
      nome: p.nome ? String(p.nome) : "—",
      qty,
      precoUnit: preco,
      subtotal: preco * qty
    };
  });
  const totalVenda = itemsRegistro.reduce((acc, it) => acc + it.subtotal, 0);
  const clientIdVal = checkoutClienteSelect && checkoutClienteSelect.value ? checkoutClienteSelect.value : null;

  appendSale({
    id: String(at.getTime()),
    at: at.toISOString(),
    total: totalVenda,
    clientId: clientIdVal,
    items: itemsRegistro
  });

  const updated = products.map((product) => {
    if (!selectedIds.has(product.id)) return product;
    const qtdSale = Math.max(0, Math.floor(Number(checkoutQtyByProductId.get(product.id) ?? 0)));
    const qtdAtual = Number(product.quantidade);
    const qtdNormalizada = Number.isFinite(qtdAtual) && !Number.isNaN(qtdAtual) ? Math.floor(qtdAtual) : 0;
    return { ...product, quantidade: Math.max(0, qtdNormalizada - qtdSale) };
  });

  saveProducts(updated);
  selectedIds.clear();
  closeCheckoutModal();
  renderProducts();
}

function renderProducts() {
  productsGrid.innerHTML = "";
  const products = loadProducts();
  const validIds = new Set(products.map((p) => p.id));
  pruneSelection(validIds);

  if (productCount) {
    const n = products.length;
    productCount.textContent =
      n === 0 ? "0 produtos" : n === 1 ? "1 produto" : `${n} produtos`;
  }

  if (products.length === 0) {
    emptyState.classList.remove("hidden");
    updateSelectionSummary();
    if (checkoutModalOpen) closeCheckoutModal();
    return;
  }

  emptyState.classList.add("hidden");

  products.forEach((product) => {
    const card = window.createProductCard(product, {
      selectable: true,
      selected: selectedIds.has(product.id),
      onSelectionChange: (p, checked) => {
        if (checked) selectedIds.add(p.id);
        else selectedIds.delete(p.id);
        updateSelectionSummary();
      }
    });
    productsGrid.appendChild(card);
  });

  updateSelectionSummary();

  if (checkoutModalOpen) {
    if (selectedIds.size === 0) closeCheckoutModal();
    else {
      populateClienteSelect();
      populateCheckoutModal();
    }
  }
}

if (finalizeBtn) {
  finalizeBtn.addEventListener("click", () => openCheckoutModal());
}
if (checkoutCloseBtn) {
  checkoutCloseBtn.addEventListener("click", () => closeCheckoutModal());
}
if (checkoutBackdrop) {
  checkoutBackdrop.addEventListener("click", () => closeCheckoutModal());
}
if (checkoutConfirmBtn) {
  checkoutConfirmBtn.addEventListener("click", () => confirmCheckout());
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) renderProducts();
  if (event.key === USERS_STORAGE_KEY && checkoutModalOpen) populateClienteSelect();
});

renderProducts();
