const {
  createSecret,
  deleteSecret,
  createUserSecret,
  deleteUserSecret,
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

async function addUserSecretsController(req, res) {
  try {
    const { secret_id, encrypted_keys } = req.body;
    const { userId } = req.params;

    if (
      !secret_id ||
      !Array.isArray(encrypted_keys) ||
      encrypted_keys.length === 0
    ) {
      return res.status(400).json({ error: "Missing or invalid fields." });
    }

    const userSecretRows = [];

    // Loop through and add each new user_secret entry
    for (const entry of encrypted_keys) {
      const { encrypted_key, nonce, sender_public_key } = entry;

      if (!userId || !encrypted_key || !nonce || !sender_public_key) {
        console.warn("Skipping invalid entry:", entry);
        continue; // skip incomplete entries
      }

      const userSecret = await createUserSecret({
        secret_id,
        user_id: userId,
        encrypted_secret_key: encrypted_key,
        nonce,
        sender_public_key,
      });

      userSecretRows.push(userSecret);
    }

    res.status(201).json({
      message: "User secrets added successfully.",
      user_secrets: userSecretRows,
    });
  } catch (error) {
    console.error("❌ Error adding user secrets:", error);
    res.status(500).json({ error: "Failed to add user secrets." });
  }
}

async function addNewUserDEKController(req, res) {
  try {
    const { encrypted_keys } = req.body;
    const { userId } = req.params;

    console.log(userId);

    if (
      !userId ||
      !Array.isArray(encrypted_keys) ||
      encrypted_keys.length === 0
    ) {
      return res.status(400).json({ error: "Missing or invalid fields." });
    }

    const userSecretRows = await Promise.all(
      encrypted_keys.map(async (entry) => {
        const { secret_id, encrypted_key } = entry;
        if (!secret_id || !encrypted_key) {
          console.warn("Skipping invalid entry:", entry);
          return null;
        }

        const {
          encrypted_key: keyStr,
          nonce,
          sender_public_key,
        } = encrypted_key;

        if (!keyStr || !nonce || !sender_public_key) {
          console.warn("Skipping invalid encrypted_key:", encrypted_key);
          return null;
        }

        try {
          return await createUserSecret({
            secret_id,
            user_id: userId,
            encrypted_secret_key: keyStr,
            nonce,
            sender_public_key,
          });
        } catch (err) {
          console.error("Failed to create user secret:", err);
          return null; // continue processing others
        }
      })
    );

    res.status(201).json({
      message: "User secrets added successfully.",
      created_count: userSecretRows.filter(Boolean).length,
    });
  } catch (error) {
    console.error("❌ Error adding user secrets:", error);
    res.status(500).json({ error: "Failed to add user secrets." });
  }
}

async function removeUserDEKController(req, res) {
  try {
    const { encrypted_keys } = req.body;
    const { userId } = req.params;

    console.log("Removing DEKs for user:", userId);
    if (
      !userId ||
      !Array.isArray(encrypted_keys) ||
      encrypted_keys.length === 0
    ) {
      return res.status(400).json({ error: "Missing or invalid fields." });
    }

    // Extract secret_ids only
    const secretIds = encrypted_keys
      .map((entry) => entry.secret_id)
      .filter(Boolean);

    if (secretIds.length === 0) {
      return res.status(400).json({ error: "No valid secret_ids provided." });
    }

    const deletedResults = await Promise.all(
      secretIds.map(async (secret_id) => {
        try {
          return await deleteUserSecret({ user_id: userId, secret_id });
        } catch (err) {
          console.error(`❌ Failed to delete secret ${secret_id}:`, err);
          return null;
        }
      })
    );

    const deleted = deletedResults.filter(Boolean);

    res.status(200).json({
      message: "User secrets removed successfully.",
      deleted_count: deleted.length,
    });
  } catch (error) {
    console.error("❌ Error removing user secrets:", error);
    res.status(500).json({ error: "Failed to remove user secrets." });
  }
}

module.exports = {
  createSecretController,
  deleteSecretController,
  addUserSecretsController,
  addNewUserDEKController,
  removeUserDEKController,
};
