const pool = require("../../../db/index");
const { insertRepo } = require("../../../db/repos/repoRepos");
const { insertRepoMember } = require("../../../db/repos/repoMembersRepos");
const { insertFolder } = require("../../../db/repos/foldersRepo");

async function createRepoWithDefaults({ name, description, type, user_id }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create repo
    const repoResult = await client.query(
      `INSERT INTO repos (created_by, updated_by, name, description, type)
       VALUES ($1, $1, $2, $3, $4)
       RETURNING *`,
      [user_id, name, description, type]
    );
    const repo = repoResult.rows[0];

    // 2. Add repo owner as member
    const memberResult = await client.query(
      `INSERT INTO repo_members (repo, user_id, member_role, member_permissions, status)
       VALUES ($1, $2, 'owner', 'all', 'active')
       RETURNING *`,
      [repo.id, user_id]
    );
    const member = memberResult.rows[0];

    // 3. Create default "General" folder
    const folderResult = await client.query(
      `INSERT INTO folders (repo, created_by, updated_by, name, description)
       VALUES ($1, $2, $2, 'General', 'Default folder for this repository')
       RETURNING *`,
      [repo.id, user_id]
    );
    const folder = folderResult.rows[0];

    await client.query("COMMIT");

    // Fetch joined data (so the response has full structure)
    const fullRepoResult = await pool.query(
      `
      SELECT 
        r.*,
        json_agg(DISTINCT f.*) AS folders,
        json_agg(DISTINCT rm.*) AS members
      FROM repos r
      LEFT JOIN folders f ON f.repo = r.id
      LEFT JOIN repo_members rm ON rm.repo = r.id
      WHERE r.id = $1
      GROUP BY r.id
      `,
      [repo.id]
    );

    return fullRepoResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getUserRepos(userId) {
  const query = `
    SELECT
      r.*,
      COALESCE(json_agg(DISTINCT f.*) FILTER (WHERE f.id IS NOT NULL), '[]') AS folders,
      COALESCE(json_agg(DISTINCT rm.*) FILTER (WHERE rm.id IS NOT NULL), '[]') AS members
    FROM repos r
    INNER JOIN repo_members rm_user ON rm_user.repo = r.id
    LEFT JOIN folders f ON f.repo = r.id
    LEFT JOIN repo_members rm ON rm.repo = r.id
    WHERE rm_user.user_id = $1
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

module.exports = { createRepoWithDefaults, getUserRepos };
