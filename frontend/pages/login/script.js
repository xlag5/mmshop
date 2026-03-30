const loginForm = document.getElementById("loginForm");
const feedback = document.getElementById("feedback");
const submitButton = document.getElementById("submitButton");

const USERS_STORAGE_KEY = "users_registry_v1";

// Fallback de administrador (caso você não tenha criado colaboradores ainda)
const MOCK_USERS = [{ email: "admin@teste.com", password: "123456", name: "Administrador" }];

function setFeedback(message, variant) {
  const variants = {
    error: "mt-4 text-sm text-center min-h-5 text-red-600",
    success: "mt-4 text-sm text-center min-h-5 text-green-600",
    info: "mt-4 text-sm text-center min-h-5 text-slate-600"
  };

  feedback.textContent = message;
  feedback.className = variants[variant] || variants.info;
}

function loadStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function authenticate(email, password) {
  const emailLower = String(email || "").toLowerCase();

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const storedUsers = loadStoredUsers();

      // Valida contra usuários cadastrados (colaboradores/clientes) no mock.
      const storedUser = storedUsers.find(
        (u) => u.email && String(u.email).toLowerCase() === emailLower && u.senha === password
      );

      if (storedUser) {
        resolve({
          token: `mock-jwt-token-${storedUser.id}`,
          user: { email: storedUser.email, name: storedUser.nome, tipo: storedUser.tipo }
        });
        return;
      }

      // Fallback admin mock
      const admin = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === emailLower && u.password === password
      );

      if (!admin) {
        reject(new Error("E-mail ou senha invalidos."));
        return;
      }

      resolve({
        token: "mock-jwt-token-admin",
        user: { email: admin.email, name: admin.name, tipo: "colaborador" }
      });
    }, 900);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || password.length < 6) {
    setFeedback("Preencha os campos corretamente.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";
  submitButton.classList.add("opacity-70", "cursor-not-allowed");
  setFeedback("Validando credenciais mock...", "info");

  try {
    const result = await authenticate(email, password);

    localStorage.setItem("mockAuth", JSON.stringify(result));
    setFeedback(`Login realizado com sucesso. Ola, ${result.user.name}!`, "success");
    loginForm.reset();

    // Após login mock, encaminha para a página de estoque.
    setTimeout(() => {
      window.location.href = "../estoque/index.html";
    }, 650);
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
    submitButton.classList.remove("opacity-70", "cursor-not-allowed");
  }
});

