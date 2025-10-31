const pool = require("../../../db/index");

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
    members,
  };
}

async function getRepoDetailsJoin(repoId) {
  const repoQuery = `
  SELECT
    r.id,
    r.name,
    r.description,
    r.type,
    (
      SELECT COUNT(*)
      FROM repo_members rm
      WHERE rm.repo = r.id
    ) AS member_count
  FROM repos r
  WHERE r.id = $1
`;
  const repoResult = await pool.query(repoQuery, [repoId]);
  const repo = repoResult.rows[0];

  if (!repo) {
    throw new Error("Repo not found");
  }

  return {
    repo,
  };
}

async function createRepoInvite({
  repo_id,
  user_id,
  user_name,
  member_role,
  member_permissions,
  status,
  expires_at,
}) {
  console.log(
    repo_id,
    user_id,
    user_name,
    member_role,
    member_permissions,
    status,
    expires_at
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const repoResult = await client.query(
      `INSERT INTO repo_invites (repo_id, invitee_id, invitee_name, member_role, member_permissions, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        repo_id,
        user_id,
        user_name,
        member_role,
        member_permissions,
        status,
        expires_at,
      ]
    );

    await client.query("COMMIT");

    const repoInviteID = repoResult.rows[0];
    return { repoInviteID };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating repo invite:", err);
    throw err;
  } finally {
    client.release();
  }
}

async function getUserRepoInvites(userId, repoId) {
  const query = `
    SELECT
      ri.*,
      r.name AS repo_name,
      r.description AS repo_description,
      r.type AS repo_type,
      (
        SELECT COUNT(*)
        FROM repo_members rm
        WHERE rm.repo = r.id
      ) AS member_count
    FROM repo_invites ri
    INNER JOIN repos r ON r.id = ri.repo_id
    WHERE ri.invitee_id = $1
      AND ri.repo_id = $2
    ORDER BY ri.created_at DESC;
  `;

  const result = await pool.query(query, [userId, repoId]);
  return result.rows;
}

async function getRepoInviteDetails(userId, repoInviteId) {
  const query = `
    SELECT
      ri.*,
      r.name AS repo_name,
      r.description AS repo_description,
      r.type AS repo_type,
      (
        SELECT COUNT(*)
        FROM repo_members rm
        WHERE rm.repo = r.id
      ) AS member_count,
      (
        SELECT EXISTS (
          SELECT 1
          FROM repo_members rm2
          WHERE rm2.repo = r.id AND rm2.user_id = $1
        )
      ) AS user_is_member
    FROM repo_invites ri
    INNER JOIN repos r ON r.id = ri.repo_id
    WHERE ri.id = $2
    LIMIT 1;
  `;

  const result = await pool.query(query, [userId, repoInviteId]);
  return result.rows[0];
}

async function joinRepo(userId, repoInviteId, member_role) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch the invite and repo info
    const inviteRes = await client.query(
      `SELECT * FROM repo_invites WHERE id = $1`,
      [repoInviteId]
    );
    const invite = inviteRes.rows[0];
    if (!invite) throw new Error("Invite not found");

    // Check expiration
    // if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    //   throw new Error("Invite expired");
    // }

    // 2️⃣ Check if already a member
    const existingMemberRes = await client.query(
      `SELECT * FROM repo_members WHERE repo = $1 AND user_id = $2`,
      [invite.repo_id, userId]
    );
    if (existingMemberRes.rows.length > 0) {
      throw new Error("User is already a member of this repo");
    }

    // 3️⃣ Add to repo_members
    const memberRes = await client.query(
      `
      INSERT INTO repo_members (repo, user_id, member_role, member_permissions, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *;
      `,
      [invite.repo_id, userId, member_role, invite.member_permissions || "read"]
    );
    const member = memberRes.rows[0];

    // 4️⃣ Mark invite as accepted
    await client.query(
      `UPDATE repo_invites SET status = 'accepted' WHERE id = $1`,
      [repoInviteId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Joined repo successfully",
      member,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error joining repo:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function getRepoUserKeys(repoId) {
  const query = `
    SELECT 
      rm.user_id, 
      uk.public_key
    FROM repo_members rm
    INNER JOIN user_keys uk ON uk.user_id = rm.user_id
    WHERE rm.repo = $1
      AND rm.status = 'active';
  `;

  const result = await pool.query(query, [repoId]);
  return result.rows;
}

async function getRepoSecrets(repoId, userId) {
  const query = `
    SELECT 
      s.id,
      s.name,
      s.description,
      s.encrypted_secret,
      s.nonce AS secret_nonce,
      s.type,
      s.version,
      s.repo_id,
      s.created_at,
      cu.full_name AS created_by_name,
      s.updated_at,
      uu.full_name AS updated_by_name,
      us.encrypted_secret_key,
      us.nonce AS user_nonce,
      us.sender_public_key
    FROM secrets s
    LEFT JOIN users cu ON s.created_by = cu.id
    LEFT JOIN users uu ON s.updated_by = uu.id
    LEFT JOIN user_secrets us 
      ON us.secret_id = s.id
      AND us.user_id = $2
    WHERE s.repo_id = $1
    ORDER BY s.created_at DESC;
  `;

  const result = await pool.query(query, [repoId, userId]);
  return result.rows;
}


module.exports = {
  createRepoWithDefaults,
  getUserRepos,
  getRepoDetails,
  getRepoDetailsJoin,
  createRepoInvite,
  getUserRepoInvites,
  getRepoInviteDetails,
  joinRepo,
  getRepoUserKeys,
  getRepoSecrets,
};
