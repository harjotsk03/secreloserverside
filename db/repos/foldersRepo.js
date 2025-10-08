const pool = require("../index");

// Create table if not exists
async function createFoldersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repo UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      name TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);
}

// Insert a new folder
async function insertFolder({
  repo,
  created_by,
  updated_by,
  name,
  description,
}) {
  const result = await pool.query(
    `INSERT INTO folders (repo, created_by, updated_by, name, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [repo, created_by, updated_by, name, description]
  );
  return result.rows[0];
}

// Get folder by ID
async function getFolderById(id) {
  const result = await pool.query(
    `SELECT f.*, u1.full_name AS created_by_name, u2.full_name AS updated_by_name
     FROM folders f
     JOIN users u1 ON f.created_by = u1.id
     JOIN users u2 ON f.updated_by = u2.id
     WHERE f.id = $1`,
    [id]
  );
  return result.rows[0];
}

// Get all folders for a specific repo
async function getFoldersByRepo(repoId) {
  const result = await pool.query(
    `SELECT f.*, u1.full_name AS created_by_name, u2.full_name AS updated_by_name
     FROM folders f
     JOIN users u1 ON f.created_by = u1.id
     JOIN users u2 ON f.updated_by = u2.id
     WHERE f.repo = $1
     ORDER BY f.created_at DESC`,
    [repoId]
  );
  return result.rows;
}

// Update a folder (name or description, and updated_by)
async function updateFolder(id, { name, description, updated_by }) {
  const result = await pool.query(
    `UPDATE folders
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         updated_by = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, description, updated_by]
  );
  return result.rows[0];
}

// Delete a folder
async function deleteFolder(id) {
  await pool.query(`DELETE FROM folders WHERE id = $1`, [id]);
  return { success: true };
}

module.exports = {
  createFoldersTable,
  insertFolder,
  getFolderById,
  getFoldersByRepo,
  updateFolder,
  deleteFolder,
};
