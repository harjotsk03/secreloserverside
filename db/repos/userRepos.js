const pool = require("../index");

async function createUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
}

async function insertUser({ full_name, email, password_hash }) {
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [full_name, email, password_hash]
  );
  return result.rows[0];
}

async function getUserBy(type, value) {
  const result = await pool.query(
    `SELECT id, full_name, email, created_at, updated_at, last_login, is_active FROM users WHERE ${type} = $1`,
    [value]
  );
  return result.rows[0];
}

async function getUserBySecure(type, value) {
  const result = await pool.query(
    `SELECT * FROM users WHERE ${type} = $1`,
    [value]
  );
  return result.rows[0];
}

async function getUserKeyData(userId) {
  const result = await pool.query(
    `SELECT * FROM user_keys WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function getAllUsers() {
  const result = await pool.query(
    `SELECT id, full_name, email, created_at, updated_at, last_login, is_active FROM users`
  );
  return result.rows;
}

module.exports = {
  createUsersTable,
  insertUser,
  getUserBy,
  getUserBySecure,
  getAllUsers,
  getUserKeyData,
};
