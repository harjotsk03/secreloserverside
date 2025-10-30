const { createSecret, deleteSecret } = require("../services/secretService");

async function createSecretController(req, res) {
  try {
    const {
      name,
      description,
      type,
      encrypted_secret,
      nonce,
      encrypted_keys,
      repo_id,
    } = req.body;
    const user_id = req.user?.id;

    console.log(encrypted_keys);

    if (!name || !type || !encrypted_secret || !nonce || !repo_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    console.log(encrypted_secret);

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

async function deleteSecretController(req, res) {
  try {
    const secret_id = req.params?.id;
    const user_id = req.user?.id;

    if (!secret_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!user_id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to perform this action." });
    }

    const secret = await deleteSecret({
      secret_id,
    });

    res.status(201).json({
      message: "Secret deleted successfully.",
      secret,
    });
  } catch (error) {
    console.error("❌ Error deleted secret:", error);
    res.status(500).json({ error: "Failed to deleted secret." });
  }
}

module.exports = {
  createSecretController,
  deleteSecretController,
};
