const { createSecret } = require("../services/secretService");

async function createSecretController(req, res) {
  try {
    const { name, description, type, encrypted_secret, nonce, repo_id } =
      req.body;
    const user_id = req.user?.id;

    if (!name || !type || !encrypted_secret || !nonce || !repo_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    console.log(encrypted_secret)

    const secret = await createSecret({
      name,
      description,
      type,
      user_id,
      encrypted_secret,
      nonce,
      repo_id,
    });

    res.status(201).json({
      message: "Secret created successfully.",
      secret,
    });
  } catch (error) {
    console.error("❌ Error creating secret:", error);
    res.status(500).json({ error: "Failed to create secret." });
  }
}

module.exports = {
  createSecretController,
};
