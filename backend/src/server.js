import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  createUser,
  deleteAllUsers,
  deleteUser,
  getUserByEmail,
  getUserById,
  initUsersTable,
  listUsers,
  updateUser
} from "./usersRepository.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

function normalizeUserPayload(input = {}) {
  return {
    nome: String(input.nome || "").trim(),
    email: String(input.email || "")
      .trim()
      .toLowerCase(),
    tipo: input.tipo === "cliente" ? "cliente" : "colaborador",
    senha: String(input.senha || "")
  };
}

function validateUser(payload, { isEdit = false, existingUser = null } = {}) {
  if (!payload.nome) return "Informe o nome.";
  if (!payload.email || !payload.email.includes("@")) return "Informe um e-mail válido.";
  if (payload.tipo !== "colaborador" && payload.tipo !== "cliente") return "Selecione um tipo válido.";

  if (payload.tipo === "colaborador") {
    const novaSenha = payload.senha.trim();
    if (novaSenha && novaSenha.length < 6) return "A nova senha deve ter pelo menos 6 caracteres.";
    if (!novaSenha) {
      if (!isEdit) return "Informe uma senha para colaborador (>= 6).";
      const anterior = existingUser && existingUser.senha ? String(existingUser.senha) : "";
      if (anterior.length < 6) return "Informe uma senha para colaborador (>= 6).";
    }
  }

  return null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/users", async (req, res) => {
  try {
    const tipo = req.query.tipo ? String(req.query.tipo) : null;
    const users = await listUsers(tipo);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Falha ao listar usuários." });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Falha ao buscar usuário." });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const payload = normalizeUserPayload(req.body);
    const error = validateUser(payload, { isEdit: false });
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const existing = await getUserByEmail(payload.email);
    if (existing) {
      res.status(409).json({ error: "Já existe um usuário com este e-mail." });
      return;
    }

    const created = await createUser({
      id: crypto.randomUUID(),
      ...payload,
      senha: payload.tipo === "cliente" ? "" : payload.senha
    });

    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Falha ao criar usuário." });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const existingUser = await getUserById(id);
    if (!existingUser) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const payload = normalizeUserPayload(req.body);
    const error = validateUser(payload, { isEdit: true, existingUser });
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const sameEmailUser = await getUserByEmail(payload.email);
    if (sameEmailUser && sameEmailUser.id !== id) {
      res.status(409).json({ error: "Já existe um usuário com este e-mail." });
      return;
    }

    const senhaFinal =
      payload.tipo === "cliente"
        ? ""
        : payload.senha.trim()
          ? payload.senha
          : existingUser.senha || "";

    const updated = await updateUser(id, { ...payload, senha: senhaFinal });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Falha ao atualizar usuário." });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const removed = await deleteUser(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Falha ao remover usuário." });
  }
});

app.delete("/api/users", async (_req, res) => {
  try {
    await deleteAllUsers();
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Falha ao limpar usuários." });
  }
});

initUsersTable()
  .then(() => {
    app.listen(port, () => {
      console.log(`API de usuários rodando em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao iniciar o backend:", error);
    process.exit(1);
  });
