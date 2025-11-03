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
   WHERE rm.repo = r.id) AS member_count,
  -- Count of secrets
  (SELECT COUNT(*) 
   FROM secrets s
   WHERE s.repo_id = r.id) AS secret_count
FROM repos r
INNER JOIN repo_members rm_user ON rm_user.repo = r.id
WHERE rm_user.user_id = $1

  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function getRepoDetails(repoId, userId) {
  // 1. Fetch the repo info
  const repoQuery = `
    SELECT *
    FROM repos
    WHERE id = $1
  `;
  const repoResult = await pool.query(repoQuery, [repoId]);
  const repo = repoResult.rows[0];

  if (!repo) {
    const err = new Error("Repository not found");
    err.statusCode = 404;
    throw err;
  }

  // 2. Fetch all members of the repo + include user public keys
  const membersQuery = `
    SELECT
      rm.*,
      u.full_name,
      u.email,
      uk.public_key
    FROM repo_members rm
    INNER JOIN users u ON u.id = rm.user_id
    LEFT JOIN user_keys uk ON uk.user_id = u.id
    WHERE rm.repo = $1
  `;
  const membersResult = await pool.query(membersQuery, [repoId]);
  const members = membersResult.rows;

  // 3. Authorization check — ensure current user is a member
  const isMember = members.some((member) => member.user_id === userId);
  if (!isMember) {
    const err = new Error(
      "Access denied: You are not a member of this repository."
    );
    err.statusCode = 403;
    throw err;
  }

  // 4. Return repo and members with public keys included
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
      throw new Error("You are already a member of this repo.");
    }

    // 3️⃣ Add to repo_members
    const memberRes = await client.query(
      `
      INSERT INTO repo_members (repo, user_id, member_role, member_permissions, status)
      VALUES ($1, $2, $3, $4, 'pending')
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
      message: "Invitation accepted, pending approval from admin.",
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

async function updateRepoMemberStatus({
  memberId,
  repoId,
  newStatus,
  adminId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ✅ Check that updater is an admin or owner
    const permissionCheck = await client.query(
      `
      SELECT member_role, member_permissions
      FROM repo_members
      WHERE repo = $1 AND user_id = $2 AND status = 'active'
      `,
      [repoId, adminId]
    );

    if (permissionCheck.rows.length === 0) {
      throw new Error(
        "Unauthorized: You are not an active member of this repo."
      );
    }

    const role = permissionCheck.rows[0].member_permissions;
    if (!["admin", "owner"].includes(role)) {
      throw new Error("Only admins or owners can approve or decline members.");
    }

    console.log(newStatus, memberId, repoId);

    const updateRes = await client.query(
      `
      UPDATE repo_members
      SET status = $1
      WHERE user_id = $2 AND repo = $3
      RETURNING *;
      `,
      [newStatus, memberId, repoId]
    );

    if (updateRes.rows.length === 0) {
      throw new Error("Member not found or already processed.");
    }

    await client.query("COMMIT");

    return {
      success: true,
      message:
        newStatus === "active"
          ? "Member approved successfully."
          : "Member declined successfully.",
      member: updateRes.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating member status:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateMember({ memberId, repoId, permission, role, adminId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Get current user role/permissions
    const userRes = await client.query(
      `SELECT member_role, member_permissions FROM repo_members WHERE repo = $1 AND user_id = $2 AND status = 'active'`,
      [repoId, adminId]
    );

    if (!userRes.rows.length) {
      const err = new Error(
        "Unauthorized: You are not an active member of this repo."
      );
      err.statusCode = 403;
      throw err;
    }

    const currentUserRole = userRes.rows[0].member_permissions; // 'owner', 'admin', 'read'
    if (!["owner", "admin"].includes(currentUserRole)) {
      const err = new Error("Only admins or owners can update members.");
      err.statusCode = 403;
      throw err;
    }

    // 2️⃣ Fetch target member
    const targetRes = await client.query(
      `SELECT member_permissions FROM repo_members WHERE user_id = $1 AND repo = $2`,
      [memberId, repoId]
    );
    if (!targetRes.rows.length) {
      const err = new Error("Target member not found.");
      err.statusCode = 404;
      throw err;
    }

    const targetPermissions = targetRes.rows[0].member_permissions;

    // 3️⃣ Permission rules
    if (currentUserRole === "admin" && targetPermissions === "owner") {
      const err = new Error("Admin cannot modify Owner members.");
      err.statusCode = 403;
      throw err;
    }

    if (currentUserRole !== "owner" && permission === "owner") {
      const err = new Error("Only owner can assign Owner role.");
      err.statusCode = 403;
      throw err;
    }

    // 4️⃣ Nothing to update?
    if (!permission && !role) {
      const err = new Error("Nothing to update.");
      err.statusCode = 400;
      throw err;
    }

    // 5️⃣ Build update dynamically
    const fields = [];
    const values = [];
    let idx = 1;

    if (permission) {
      fields.push(`member_permissions = $${idx++}`);
      values.push(permission);
    }

    if (role) {
      fields.push(`member_role = $${idx++}`);
      values.push(role);
    }

    values.push(memberId, repoId);

    const updateRes = await client.query(
      `UPDATE repo_members SET ${fields.join(
        ", "
      )} WHERE user_id = $${idx++} AND repo = $${idx} RETURNING *`,
      values
    );

    if (!updateRes.rows.length) {
      const err = new Error("Failed to update member.");
      err.statusCode = 500;
      throw err;
    }

    await client.query("COMMIT");

    return updateRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error updating member:", error);
    throw error;
  } finally {
    client.release();
  }
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
  updateRepoMemberStatus,
  updateMember,
};
