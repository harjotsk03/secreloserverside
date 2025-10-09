const pool = require("../../../db/index");
const { insertRepo } = require("../../../db/repos/repoRepos");
const { insertRepoMember } = require("../../../db/repos/repoMembersRepos");
const { insertFolder } = require("../../../db/repos/foldersRepo");

async function createRepoWithDefaults({
  name,
  description,
  type,
  user_id,
  member_role,
}) {
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
       VALUES ($1, $2, $3, 'owner', 'active')
       RETURNING *`,
      [repo.id, user_id, member_role]
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
    -- Count of members
    (SELECT COUNT(*) 
    FROM repo_members rm 
    WHERE rm.repo = r.id) AS member_count
  FROM repos r
  INNER JOIN repo_members rm_user ON rm_user.repo = r.id
  WHERE rm_user.user_id = $1
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
    -- Count of members
    (SELECT COUNT(*) 
    FROM repo_members rm 
    WHERE rm.repo = r.id) AS member_count
  FROM repos r
  INNER JOIN repo_members rm_user ON rm_user.repo = r.id
  WHERE rm_user.user_id = $1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function getRepoDetails(repoId) {
  // 1. Fetch the repo info
  const repoQuery = `
    SELECT *
    FROM repos
    WHERE id = $1
  `;
  const repoResult = await pool.query(repoQuery, [repoId]);
  const repo = repoResult.rows[0];

  if (!repo) {
    throw new Error("Repo not found");
  }

  // 2. Fetch folders for this repo
  const foldersQuery = `
    SELECT *
    FROM folders
    WHERE repo = $1
  `;
  const foldersResult = await pool.query(foldersQuery, [repoId]);
  const folders = foldersResult.rows;

  // 3. Fetch members for this repo
  const membersQuery = `
  SELECT
    rm.*,
    u.full_name,
    u.email
FROM repo_members rm
INNER JOIN users u ON u.id = rm.user_id
WHERE rm.repo = $1
`;
  const membersResult = await pool.query(membersQuery, [repoId]);
  const members = membersResult.rows;

  // Return 3 separate JSON objects
  return {
    repo,
    folders,
    members,
  };
}

module.exports = { createRepoWithDefaults, getUserRepos, getRepoDetails };
