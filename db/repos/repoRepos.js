const pool = require("../index");

// Create table if not exists
async function createReposTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS repos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `);
}

// Insert a new repo
async function insertRepo({ created_by, updated_by, name, description, type }) {
  const result = await pool.query(
    `INSERT INTO repos (created_by, updated_by, name, description, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [created_by, updated_by, name, description, type]
  );
  return result.rows[0];
}

// Get a repo by id
async function getRepoById(id) {
  const result = await pool.query(`SELECT * FROM repos WHERE id = $1`, [id]);
  return result.rows[0];
}

// Get repos created by a specific user
async function getReposByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM repos WHERE created_by = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Get all repos
async function getAllRepos() {
  const result = await pool.query(
    `SELECT * FROM repos ORDER BY created_at DESC`
  );
  return result.rows;
}

// Update a repo
async function updateRepo(id, { updated_by, name, description, type }) {
  const result = await pool.query(
    `UPDATE repos
     SET updated_by = $2,
         name = $3,
         description = $4,
         type = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, updated_by, name, description, type]
  );
  return result.rows[0];
}

// Delete a repo
async function deleteRepo(id) {
  await pool.query(`DELETE FROM repos WHERE id = $1`, [id]);
  return { success: true };
}

module.exports = {
  createReposTable,
  insertRepo,
  getRepoById,
  getReposByUser,
  getAllRepos,
  updateRepo,
  deleteRepo,
};
