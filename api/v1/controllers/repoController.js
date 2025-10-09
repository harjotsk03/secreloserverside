const {
  createRepoWithDefaults,
  getUserRepos,
  getRepoDetails,
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

module.exports = { createRepo, fetchUserRepos, fetchRepoDetails };
