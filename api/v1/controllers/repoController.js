const {
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
  getPendingRepoMembers,
  updateRepoMemberStatus,
  updateMember,
} = require("../services/repoService");

async function createRepo(req, res) {
  try {
    const { name, description, type, member_role } = req.body;
    const user_id = req.user?.id;

    if (!name || !description || !type || !member_role) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const repo = await createRepoWithDefaults({
      name,
      description,
      type,
      user_id,
      member_role,
    });

    res.status(201).json({
      message: "Repository created successfully.",
      repo,
    });
  } catch (error) {
    console.error("❌ Error creating repo:", error);
    res.status(500).json({ error: "Failed to create repository." });
  }
}

async function fetchUserRepos(req, res) {
  try {
    const userId = req.user.id;
    const repos = await getUserRepos(userId);
    res.json({ success: true, data: repos });
  } catch (err) {
    console.error("Error fetching user repos:", err);
    res.status(500).json({ success: false, error: "Failed to fetch repos" });
  }
}

async function fetchRepoDetails(req, res) {
  try {
    const repoId = req.params.id;
    const userId = req.user.id;

    const data = await getRepoDetails(repoId, userId);

    // ✅ Consistent response structure
    res.json({
      success: true,
      repo: data.repo,
      members: data.members,
      folders: data.folders || [], // Include folders if you have them
    });
  } catch (err) {
    console.error("Error fetching repo details:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Failed to fetch repo details";

    // ✅ Send error message in response body
    res.status(statusCode).json({
      success: false,
      message: message, // ✅ Changed from 'error' to 'message'
      error: message, // ✅ Keep both for compatibility
    });
  }
}

async function fetchRepoDetailsJoin(req, res) {
  try {
    const repoId = req.params.id;
    const data = await getRepoDetailsJoin(repoId);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching repo details:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch repo details" });
  }
}

async function createRepoInviteController(req, res) {
  try {
    const {
      repo_id,
      user_name,
      member_role,
      member_permissions,
      status,
      expires_at,
    } = req.body;
    const user_id = req.user?.id;

    if (
      !repo_id ||
      !user_id ||
      !user_name ||
      !member_permissions ||
      !status ||
      !expires_at
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const repo_invite = await createRepoInvite({
      repo_id,
      user_id,
      user_name,
      member_role,
      member_permissions,
      status,
      expires_at,
    });

    res.status(201).json({
      message: "Repo invite created successfully.",
      repo_invite,
    });
  } catch (error) {
    console.error("Error creating repo invite:", error);
    res.status(500).json({ error: "Failed to create repository invite." });
  }
}

async function fetchUserRepoInvites(req, res) {
  try {
    const { repo_id } = req.query;
    const userId = req.user.id;
    const repos = await getUserRepoInvites(userId, repo_id);
    res.json({ success: true, data: repos });
  } catch (err) {
    console.error("Error fetching repo invites:", err);
    res.status(500).json({ success: false, error: "Failed to fetch repos" });
  }
}

async function fetchRepoInvite(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const repoInvite = await getRepoInviteDetails(userId, id);
    res.json({ success: true, data: repoInvite });
  } catch (err) {
    console.error("Error fetching repo invite:", err);
    res.status(500).json({ success: false, error: "Failed to fetch repos" });
  }
}

async function joinRepoController(req, res) {
  try {
    const { id } = req.params; // invite ID
    const { member_role } = req.query;
    const userId = req.user?.id;

    if (!id || !userId || !member_role) {
      return res
        .status(400)
        .json({ success: false, error: "Missing invite ID or user ID" });
    }

    const result = await joinRepo(userId, id, member_role);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.member,
    });
  } catch (error) {
    console.error("Error joining repo:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to join repo",
    });
  }
}

async function fetchRepoUserKeys(req, res) {
  try {
    const repoId = req.params.id;

    if (!repoId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing repo ID." });
    }

    const userKeys = await getRepoUserKeys(repoId);

    res.json({
      success: true,
      count: userKeys.length,
      data: userKeys,
    });
  } catch (err) {
    console.error("❌ Error fetching repo user keys:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user public keys.",
    });
  }
}

async function fetchRepoSecrets(req, res) {
  try {
    const repoId = req.params.id;
    const userId = req.user?.id;

    if (!repoId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing repo ID." });
    }

    const repoSecrets = await getRepoSecrets(repoId, userId);

    res.json({
      success: true,
      count: repoSecrets.length,
      data: repoSecrets,
    });
  } catch (err) {
    console.error("❌ Error fetching repo secrets:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch repo secrets.",
    });
  }
}

/* ------------------------------ NEW CONTROLLERS ------------------------------ */

// 🟡 Get all pending members for a repo (for admin/owner)
async function fetchPendingRepoMembers(req, res) {
  try {
    const { repoId } = req.params;
    const pending = await getPendingRepoMembers(repoId);
    res.json({ success: true, count: pending.length, data: pending });
  } catch (err) {
    console.error("Error fetching pending repo members:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// 🟢 Approve pending member
async function approveRepoMemberController(req, res) {
  try {
    const { memberId, repoId } = req.params;
    const adminId = req.user?.id;

    const result = await updateRepoMemberStatus({
      memberId,
      repoId,
      newStatus: "active",
      adminId,
    });

    res.json({ success: true, message: result.message, data: result.member });
  } catch (err) {
    console.error("Error approving repo member:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// 🔴 Decline pending member
async function declineRepoMemberController(req, res) {
  try {
    const { memberId, repoId } = req.params;
    const adminId = req.user?.id;

    const result = await updateRepoMemberStatus({
      memberId,
      repoId,
      newStatus: "rejected",
      adminId,
    });

    res.json({ success: true, message: result.message, data: result.member });
  } catch (err) {
    console.error("Error declining repo member:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateMemberController(req, res) {
  try {
    const { memberId, repoId } = req.params;
    const adminId = req.user?.id;
    const { permission, role } = req.body;

    const updatedMember = await updateMember({
      memberId,
      repoId,
      permission,
      role,
      adminId,
    });

    res.json({ success: true, message: "Member updated", data: updatedMember });
  } catch (err) {
    console.error("Error updating member:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
}

/* ------------------------------ EXPORTS ------------------------------ */
module.exports = {
  createRepo,
  fetchUserRepos,
  fetchRepoDetails,
  fetchRepoDetailsJoin,
  createRepoInviteController,
  fetchUserRepoInvites,
  fetchRepoInvite,
  joinRepoController,
  fetchRepoUserKeys,
  fetchRepoSecrets,
  fetchPendingRepoMembers,
  approveRepoMemberController,
  declineRepoMemberController,
  updateMemberController,
};
