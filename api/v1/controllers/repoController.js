const { createRepoWithDefaults, getUserRepos } = require("../services/repoService");

async function createRepo(req, res) {
  try {
    const { name, description, type } = req.body;
    const user_id = req.user?.id; // must come from auth middleware

    if (!name || !description || !type) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const repo = await createRepoWithDefaults({
      name,
      description,
      type,
      user_id,
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

module.exports = { createRepo, fetchUserRepos };
