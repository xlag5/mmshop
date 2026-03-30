const STORAGE_KEY = "users_registry_v1";
const API_BASE = window.MYSTORE_API_BASE || "http://localhost:3001";

const userForm = document.getElementById("userForm");
const feedback = document.getElementById("feedback");
const usersGrid = document.getElementById("usersGrid");
const emptyState = document.getElementById("emptyState");
const clearButton = document.getElementById("clearButton");
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const userFormTitle = document.getElementById("userFormTitle");
const submitUserBtn = document.getElementById("submitUserBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const senhaHelp = document.getElementById("senhaHelp");

let currentFilter = "todos";
let users = [];
let editingUserId = null;
let useApi = true;

function setFeedback(message, variant) {
  const variants = {
    error: "text-red-600",
    success: "text-green-600",
    info: "text-slate-600"
  };

  feedback.textContent = message || "";
  feedback.className = `text-sm min-h-5 ${variants[variant] || ""}`.trim();
}

function loadUsersLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsersLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = "Falha na requisição.";
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // sem corpo json
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadUsersFromSource() {
  if (!useApi) return loadUsersLocal();
  try {
    const list = await apiRequest("/api/users", { method: "GET" });
    saveUsersLocal(list);
    return list;
  } catch {
    useApi = false;
    const local = loadUsersLocal();
    return local;
  }
}

function normalizeUser(input) {
  return {
    id: input.id ? String(input.id) : undefined,
    nome: String(input.nome || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    tipo: input.tipo === "cliente" ? "cliente" : "colaborador",
    senha: input.senha ? String(input.senha) : ""
  };
}

function validateUser({ nome, email, tipo, senha }, { isEdit = false, existingUser = null } = {}) {
  if (!nome) return "Informe o nome.";
  if (!email || !email.includes("@")) return "Informe um e-mail válido.";
  if (tipo !== "colaborador" && tipo !== "cliente") return "Selecione um tipo válido.";

  if (tipo === "colaborador") {
    const novaSenha = senha && String(senha).trim().length > 0 ? String(senha) : "";
    if (novaSenha && novaSenha.length < 6) return "A nova senha deve ter pelo menos 6 caracteres.";
    if (!novaSenha) {
      if (!isEdit) return "Informe uma senha para colaborador (>= 6).";
      const anterior = existingUser && existingUser.senha ? String(existingUser.senha) : "";
      if (anterior.length < 6) return "Informe uma senha para colaborador (>= 6).";
    }
  }
  return null;
}

function setFormMode(mode) {
  const isEdit = mode === "edit";
  userFormTitle.textContent = isEdit ? "Editar usuário" : "Novo usuário";
  submitUserBtn.textContent = isEdit ? "Salvar alterações" : "Cadastrar";
  cancelEditBtn.classList.toggle("hidden", !isEdit);
  senhaHelp.textContent = isEdit
    ? "Deixe em branco para manter a senha atual (colaboradores)."
    : "Obrigatória para colaboradores.";
  if (!isEdit) editingUserId = null;
}

function beginEdit(user) {
  editingUserId = user.id;
  userForm.nome.value = user.nome;
  userForm.email.value = user.email;
  userForm.tipo.value = user.tipo;
  userForm.senha.value = "";
  setFormMode("edit");
  setFeedback("", "info");
  userForm.nome.focus();
  userForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEdit(options = {}) {
  const { preserveFeedback = false } = options;
  userForm.reset();
  userForm.tipo.value = "colaborador";
  setFormMode("create");
  if (!preserveFeedback) setFeedback("", "info");
}

function getFilteredUsers() {
  if (currentFilter === "todos") return users;
  return users.filter((user) => user.tipo === currentFilter);
}

function setActiveFilterButton() {
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle("active", active);
  });
}

async function refreshUsers(message, variant = "info") {
  users = await loadUsersFromSource();
  saveUsersLocal(users);
  renderUsers();
  if (message) setFeedback(message, variant);
}

function renderUsers() {
  usersGrid.innerHTML = "";

  const filteredUsers = getFilteredUsers();
  if (filteredUsers.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filteredUsers.forEach((user) => {
    const card = window.createUserCard(user, {
      onEdit: (u) => beginEdit(u),
      onRemove: async (id) => {
        try {
          if (useApi) {
            await apiRequest(`/api/users/${id}`, { method: "DELETE" });
          } else {
            users = users.filter((item) => item.id !== id);
            saveUsersLocal(users);
          }

          if (editingUserId === id) cancelEdit({});
          await refreshUsers("Usuário removido.", "info");
        } catch (error) {
          setFeedback(error.message || "Falha ao remover usuário.", "error");
        }
      }
    });

    usersGrid.appendChild(card);
  });
}

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const existingUser = editingUserId ? users.find((u) => u.id === editingUserId) : null;

  let payload = normalizeUser({
    id: editingUserId || undefined,
    nome: userForm.nome.value,
    email: userForm.email.value,
    tipo: userForm.tipo.value,
    senha: userForm.senha.value
  });

  const error = validateUser(payload, {
    isEdit: Boolean(editingUserId),
    existingUser
  });
  if (error) {
    setFeedback(error, "error");
    return;
  }

  if (editingUserId && existingUser) {
    if (payload.tipo === "colaborador") {
      const senhaDigitada = String(userForm.senha.value || "").trim();
      if (!senhaDigitada) payload = { ...payload, senha: existingUser.senha || "" };
    } else {
      payload = { ...payload, senha: "" };
    }
  }

  const exists = users.some((item) => item.email === payload.email && item.id !== editingUserId);
  if (exists) {
    setFeedback("Já existe um usuário com este e-mail.", "error");
    return;
  }

  try {
    if (useApi) {
      if (editingUserId && existingUser) {
        await apiRequest(`/api/users/${editingUserId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        cancelEdit({ preserveFeedback: true });
        await refreshUsers("Usuário atualizado com sucesso.", "success");
      } else {
        await apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        userForm.reset();
        userForm.tipo.value = "colaborador";
        await refreshUsers("Usuário cadastrado com sucesso.", "success");
      }
      return;
    }

    if (editingUserId && existingUser) {
      users = users.map((item) => (item.id === editingUserId ? payload : item));
      saveUsersLocal(users);
      cancelEdit({ preserveFeedback: true });
      renderUsers();
      setFeedback("Usuário atualizado com sucesso.", "success");
      return;
    }

    const localPayload = {
      ...payload,
      id: payload.id || String(Date.now())
    };
    users = [localPayload, ...users];
    saveUsersLocal(users);
    userForm.reset();
    userForm.tipo.value = "colaborador";
    renderUsers();
    setFeedback("Usuário cadastrado com sucesso.", "success");
  } catch (submitError) {
    setFeedback(submitError.message || "Falha ao salvar usuário.", "error");
  }
});

cancelEditBtn.addEventListener("click", () => cancelEdit());

clearButton.addEventListener("click", async () => {
  if (!confirm("Tem certeza que deseja limpar todos os usuários?")) return;
  try {
    if (useApi) {
      await apiRequest("/api/users", { method: "DELETE" });
    } else {
      users = [];
      saveUsersLocal(users);
    }
    await refreshUsers("Lista de usuários limpa.", "info");
  } catch (error) {
    setFeedback(error.message || "Falha ao limpar usuários.", "error");
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter || "todos";
    setActiveFilterButton();
    renderUsers();
  });
});

async function init() {
  setActiveFilterButton();
  await refreshUsers("", "info");
  if (useApi) {
    setFeedback("Conectado ao backend.", "info");
  } else {
    setFeedback("Backend indisponível. Usando armazenamento local.", "info");
  }
}

init();
