const pool = require("../index");

// Create table if not exists
async function createRepoMembersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS repo_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repo UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      member_role TEXT NOT NULL,
      member_permissions TEXT NOT NULL,
      status member_status NOT NULL DEFAULT 'sent'
    )
  `);
}

// Insert a new repo member
async function insertRepoMember({
  repo,
  user_id,
  member_role,
  member_permissions,
  status = "sent",
}) {
  const result = await pool.query(
    `INSERT INTO repo_members (repo, user_id, member_role, member_permissions, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [repo, user_id, member_role, member_permissions, status]
  );
  return result.rows[0];
}

// Get a member by id
async function getRepoMemberById(id) {
  const result = await pool.query(`SELECT * FROM repo_members WHERE id = $1`, [
    id,
  ]);
  return result.rows[0];
}

// Get all members for a repo
async function getMembersByRepo(repoId) {
  const result = await pool.query(
    `SELECT rm.*, u.full_name, u.email
     FROM repo_members rm
     JOIN users u ON rm.user_id = u.id
     WHERE rm.repo = $1
     ORDER BY u.full_name ASC`,
    [repoId]
  );
  return result.rows;
}

// Get all repos a user is a member of
async function getReposByUser(userId) {
  const result = await pool.query(
    `SELECT r.*, rm.member_role, rm.status
     FROM repo_members rm
     JOIN repos r ON rm.repo = r.id
     WHERE rm.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Update a repo member (e.g., role, permissions, status)
async function updateRepoMember(
  id,
  { member_role, member_permissions, status }
) {
  const result = await pool.query(
    `UPDATE repo_members
     SET member_role = $2,
         member_permissions = $3,
         status = $4
     WHERE id = $1
     RETURNING *`,
    [id, member_role, member_permissions, status]
  );
  return result.rows[0];
}

// Remove a member from a repo
async function deleteRepoMember(id) {
  await pool.query(`DELETE FROM repo_members WHERE id = $1`, [id]);
  return { success: true };
}

module.exports = {
  createRepoMembersTable,
  insertRepoMember,
  getRepoMemberById,
  getMembersByRepo,
  getReposByUser,
  updateRepoMember,
  deleteRepoMember,
};
