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
    const data = await getRepoDetails(repoId);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching repo details:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch repo details" });
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
    console.log(
      repo_id,
      user_id,
      user_name,
      member_permissions,
      member_role,
      status,
      expires_at
    );

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

    console.log(repo_invite);

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
    const repoId = repo_id;
    const repos = await getUserRepoInvites(userId, repoId);
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
    const repoId = id;
    const repoInvite = await getRepoInviteDetails(userId, repoId);
    res.json({ success: true, data: repoInvite });
  } catch (err) {
    console.error("Error fetching repo invite:", err);
    res.status(500).json({ success: false, error: "Failed to fetch repos" });
  }
}

async function joinRepoController(req, res) {
  try {
    const { id } = req.params;
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

    if (!repoId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing repo ID." });
    }

    const repoSecrets = await getRepoSecrets(repoId);

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
};
