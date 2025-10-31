const {
  createSecret,
  deleteSecret,
  createUserSecret,
} = require("../services/secretService");

async function createSecretController(req, res) {
  try {
    const {
      name,
      description,
      type,
      encrypted_secret,
      nonce,
      encrypted_keys, // array of user key objects
      repo_id,
    } = req.body;
    const user_id = req.user?.id;

    if (!name || !type || !encrypted_secret || !nonce || !repo_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // 1️⃣ Create the base secret
    const secret = await createSecret({
      name,
      description,
      type,
      user_id,
      encrypted_secret,
      nonce,
      repo_id,
    });

    // 2️⃣ Insert related user_secrets
    // assuming you have a function like `createUserSecret` that writes to `user_secrets`
    const userSecretRows = [];
    for (const entry of encrypted_keys || []) {
      const {
        user_id: target_user_id,
        encrypted_key,
        nonce,
        sender_public_key,
      } = entry;

      const userSecret = await createUserSecret({
        secret_id: secret.id,
        user_id: target_user_id,
        encrypted_secret_key: encrypted_key,
        nonce,
        sender_public_key,
      });

      userSecretRows.push(userSecret);
    }

    // 3️⃣ Find the row that belongs to the user who created the secret
    const creatorUserSecret = userSecretRows.find(
      (row) => row.user_id === user_id
    );

    // 4️⃣ Return combined data
    res.status(201).json({
      message: "Secret created successfully.",
      secret,
      user_secret: creatorUserSecret || null,
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
