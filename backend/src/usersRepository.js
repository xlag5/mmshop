import { query } from "./db.js";

export async function initUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('colaborador', 'cliente')),
      senha TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function listUsers(tipo) {
  if (tipo) {
    const result = await query(
      `SELECT id, nome, email, tipo, senha
       FROM users
       WHERE tipo = $1
       ORDER BY created_at DESC`,
      [tipo]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, nome, email, tipo, senha
     FROM users
     ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getUserById(id) {
  const result = await query(
    `SELECT id, nome, email, tipo, senha
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserByEmail(email) {
  const result = await query(
    `SELECT id, nome, email, tipo, senha
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser({ id, nome, email, tipo, senha }) {
  const result = await query(
    `INSERT INTO users (id, nome, email, tipo, senha)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, email, tipo, senha`,
    [id, nome, email, tipo, senha || ""]
  );
  return result.rows[0];
}

export async function updateUser(id, { nome, email, tipo, senha }) {
  const result = await query(
    `UPDATE users
     SET nome = $2,
         email = $3,
         tipo = $4,
         senha = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, nome, email, tipo, senha`,
    [id, nome, email, tipo, senha || ""]
  );
  return result.rows[0] || null;
}

export async function deleteUser(id) {
  const result = await query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  return Boolean(result.rows[0]);
}

export async function deleteAllUsers() {
  await query("DELETE FROM users");
}
