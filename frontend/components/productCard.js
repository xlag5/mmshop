function formatBRL(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

function safeDomIdSegment(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * @param {{id: string, nome: string, preco: number|string, quantidade: number|string, foto?: string|null}} product
 * @param {{onRemove?: (id: string) => void, onEdit?: (product: object) => void, selectable?: boolean, selected?: boolean, onSelectionChange?: (product: object, checked: boolean) => void}} [options] — sem onRemove, o card fica somente leitura (ex.: tela Caixa)
 * @returns {HTMLElement}
 */
function createProductCard(product, options = {}) {
  const { onRemove, onEdit, selectable, selected, onSelectionChange } = options;
  const showRemove = typeof onRemove === "function";
  const showEdit = typeof onEdit === "function";
  const showCheckbox = Boolean(selectable);
  const sid = safeDomIdSegment(product.id);

  const card = document.createElement("div");
  card.className = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm";
  if (showCheckbox) {
    card.classList.add("cursor-pointer", "hover:border-blue-200", "transition-colors");
  }

  const preco = formatBRL(product.preco);
  const quantidade = Number(product.quantidade);

  const hasFoto =
    typeof product.foto === "string" && product.foto.trim() !== "" && product.foto.startsWith("data:image/");

  const fotoMarkup = hasFoto
    ? `<img
        src="${escapeAttr(product.foto)}"
        alt="Foto do produto"
        class="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-slate-50"
      />`
    : `<div class="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Sem foto
      </div>`;

  const editBtnHtml = showEdit
    ? `<button
        type="button"
        class="shrink-0 rounded-xl px-3 py-2 text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
        data-edit="${escapeHtml(product.id)}"
        aria-label="Editar produto"
      >
        Editar
      </button>`
    : "";

  const removeBtnHtml = showRemove
    ? `<button
        type="button"
        class="shrink-0 rounded-xl px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
        data-remove="${escapeHtml(product.id)}"
        aria-label="Remover produto"
      >
        Remover
      </button>`
    : "";

  const actionsHtml =
    showEdit || showRemove
      ? `<div class="shrink-0 flex flex-col gap-2 items-end">${editBtnHtml}${removeBtnHtml}</div>`
      : "";

  const checkboxHtml = showCheckbox
    ? `<input
        type="checkbox"
        id="product-select-${sid}"
        class="product-select-checkbox mt-1.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        ${selected ? "checked" : ""}
        aria-labelledby="product-title-${sid}"
      />`
    : "";

  card.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0 flex-1">
        ${checkboxHtml}
        <div class="flex items-start gap-4 min-w-0 flex-1">
          ${fotoMarkup}
          <div class="min-w-0">
            <h3 id="product-title-${sid}" class="text-slate-900 font-semibold text-base truncate">${escapeHtml(product.nome)}</h3>
            <p class="mt-1 text-sm text-slate-600">Preço: <span class="font-medium text-slate-800">${preco}</span></p>
            <p class="text-sm text-slate-600">Quantidade: <span class="font-medium text-slate-800">${Number.isNaN(quantidade) ? 0 : quantidade}</span></p>
          </div>
        </div>
      </div>
      ${actionsHtml}
    </div>
  `;

  if (showEdit) {
    const editBtn = card.querySelector("[data-edit]");
    editBtn.addEventListener("click", () => onEdit(product));
  }

  if (showCheckbox) {
    const cb = card.querySelector(".product-select-checkbox");
    cb.addEventListener("change", () => {
      if (typeof onSelectionChange === "function") onSelectionChange(product, cb.checked);
    });
    cb.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  if (showRemove) {
    const button = card.querySelector("[data-remove]");
    button.addEventListener("click", () => onRemove(product.id));
  }

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  // Escapa apenas o necessário para inserir em atributos HTML (ex: src).
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

// Disponibiliza no escopo global para usar na página sem bundler.
window.createProductCard = createProductCard;

