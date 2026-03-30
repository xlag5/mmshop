const STORAGE_KEY = "estoque_products_v1";

const productForm = document.getElementById("productForm");
const feedback = document.getElementById("feedback");
const productsGrid = document.getElementById("productsGrid");
const emptyState = document.getElementById("emptyState");
const clearButton = document.getElementById("clearButton");
const productFormTitle = document.getElementById("productFormTitle");
const submitProductBtn = document.getElementById("submitProductBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const fotoHelp = document.getElementById("fotoHelp");
const fotoInput = document.getElementById("foto");
const fotoPreviewImg = document.getElementById("fotoPreviewImg");
const fotoPreviewEmpty = document.getElementById("fotoPreviewEmpty");

let editingProductId = null;
let fotoPreviewObjectUrl = null;
let products = loadProducts();

function setFeedback(message, variant) {
  const variants = {
    error: "text-red-600",
    success: "text-green-600",
    info: "text-slate-600"
  };

  feedback.textContent = message || "";
  feedback.className = `text-sm min-h-5 ${variants[variant] || ""}`.trim();
}

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveProducts(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function revokeFotoPreviewObjectUrl() {
  if (fotoPreviewObjectUrl) {
    URL.revokeObjectURL(fotoPreviewObjectUrl);
    fotoPreviewObjectUrl = null;
  }
}

function setFotoPreviewFromSrc(src) {
  if (!fotoPreviewImg || !fotoPreviewEmpty) return;
  if (src) {
    fotoPreviewImg.src = src;
    fotoPreviewImg.classList.remove("hidden");
    fotoPreviewEmpty.classList.add("hidden");
  } else {
    fotoPreviewImg.removeAttribute("src");
    fotoPreviewImg.classList.add("hidden");
    fotoPreviewEmpty.classList.remove("hidden");
    fotoPreviewEmpty.textContent = editingProductId
      ? "Este produto não possui foto. Selecione uma imagem acima."
      : "Selecione uma imagem para ver a prévia.";
  }
}

function clearFotoPreview() {
  revokeFotoPreviewObjectUrl();
  setFotoPreviewFromSrc(null);
}

function refreshFotoPreview() {
  const file = fotoInput?.files?.[0];
  if (file) {
    if (!file.type.startsWith("image/")) {
      clearFotoPreview();
      return;
    }
    revokeFotoPreviewObjectUrl();
    fotoPreviewObjectUrl = URL.createObjectURL(file);
    setFotoPreviewFromSrc(fotoPreviewObjectUrl);
    return;
  }

  if (editingProductId) {
    const existing = products.find((p) => p.id === editingProductId);
    const stored =
      existing &&
      typeof existing.foto === "string" &&
      existing.foto.trim() !== "" &&
      existing.foto.startsWith("data:image/")
        ? existing.foto
        : null;
    if (stored) {
      setFotoPreviewFromSrc(stored);
      return;
    }
  }

  clearFotoPreview();
}

function normalizeProduct(input) {
  const nome = String(input.nome || "").trim();
  const preco = Number(input.preco);
  const quantidade = Number(input.quantidade);
  const foto = input.foto ? String(input.foto) : null;

  return {
    id: input.id ? String(input.id) : String(Date.now()),
    nome,
    preco,
    quantidade,
    foto
  };
}

function setFormMode(mode) {
  const isEdit = mode === "edit";
  if (productFormTitle) {
    productFormTitle.textContent = isEdit ? "Editar produto" : "Adicionar produto";
  }
  if (submitProductBtn) {
    submitProductBtn.textContent = isEdit ? "Salvar alterações" : "Adicionar";
  }
  if (cancelEditBtn) {
    cancelEditBtn.classList.toggle("hidden", !isEdit);
  }
  if (fotoHelp) {
    fotoHelp.textContent = isEdit
      ? "Deixe em branco para manter a foto atual."
      : "Opcional.";
  }
  if (!isEdit) editingProductId = null;
}

function beginEdit(product) {
  editingProductId = product.id;
  productForm.nome.value = product.nome || "";
  productForm.preco.value = String(product.preco ?? "");
  const q = Number(product.quantidade);
  productForm.quantidade.value = Number.isFinite(q) && !Number.isNaN(q) ? String(Math.floor(q)) : "0";
  productForm.foto.value = "";
  revokeFotoPreviewObjectUrl();
  setFormMode("edit");
  refreshFotoPreview();
  setFeedback("", "info");
  productForm.nome.focus();
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEdit(options = {}) {
  const { preserveFeedback = false } = options;
  productForm.reset();
  setFormMode("create");
  clearFotoPreview();
  if (!preserveFeedback) setFeedback("", "info");
}

function renderProducts() {
  productsGrid.innerHTML = "";

  if (products.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  products.forEach((product) => {
    const card = window.createProductCard(product, {
      onEdit: (p) => beginEdit(p),
      onRemove: (id) => {
        if (editingProductId === id) cancelEdit();
        products = products.filter((p) => p.id !== id);
        saveProducts(products);
        renderProducts();
        setFeedback("Produto removido.", "info");
      }
    });

    productsGrid.appendChild(card);
  });
}

function validateForm({ nome, preco, quantidade }) {
  if (!nome) return "Informe o nome do produto.";
  if (Number.isNaN(preco) || preco < 0) return "Informe um preço válido (>= 0).";
  if (!Number.isInteger(quantidade) || Number.isNaN(quantidade) || quantidade < 0) {
    return "Informe uma quantidade válida (inteiro >= 0).";
  }
  return null;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

if (fotoInput) {
  fotoInput.addEventListener("change", () => refreshFotoPreview());
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = productForm.nome.value;
  const preco = productForm.preco.value;
  const quantidade = productForm.quantidade.value;

  const fotoFile = productForm.foto.files[0];
  let foto = null;

  const existing =
    editingProductId ? products.find((p) => p.id === editingProductId) : null;

  if (fotoFile) {
    if (!fotoFile.type.startsWith("image/")) {
      setFeedback("Arquivo de foto inválido. Envie uma imagem.", "error");
      return;
    }

    try {
      foto = await readFileAsDataURL(fotoFile);
    } catch {
      setFeedback("Não foi possível ler a imagem. Tente novamente.", "error");
      return;
    }
  } else if (existing && existing.foto) {
    foto = existing.foto;
  }

  const payload = normalizeProduct({
    id: editingProductId || undefined,
    nome,
    preco,
    quantidade,
    foto
  });

  const error = validateForm(payload);
  if (error) {
    setFeedback(error, "error");
    return;
  }

  if (editingProductId && existing) {
    products = products.map((p) => (p.id === editingProductId ? payload : p));
    saveProducts(products);
    renderProducts();
    setFeedback("Produto atualizado com sucesso.", "success");
    cancelEdit({ preserveFeedback: true });
    return;
  }

  products = [payload, ...products];
  saveProducts(products);
  renderProducts();
  setFeedback("Produto adicionado com sucesso.", "success");
  productForm.reset();
  clearFotoPreview();
});

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => cancelEdit());
}

clearButton.addEventListener("click", () => {
  if (!confirm("Tem certeza que deseja limpar a lista de produtos?")) return;
  products = [];
  saveProducts(products);
  cancelEdit();
  renderProducts();
  setFeedback("Lista limpa.", "info");
});

renderProducts();
clearFotoPreview();
setFeedback("", "info");
