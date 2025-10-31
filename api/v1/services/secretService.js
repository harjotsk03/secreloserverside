const pool = require("../../../db/index");

async function createSecret({
  name,
  description,
  type,
  user_id,
  encrypted_secret,
  nonce,
  repo_id,
  version = 1,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Encrypted Secret in service:", encrypted_secret);

    const secretResult = await client.query(
      `
      INSERT INTO secrets (created_by, updated_by, name, description, type, encrypted_secret, nonce, version, repo_id)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
      `,
      [user_id, name, description, type, encrypted_secret, nonce, version, repo_id]
    );

    await client.query("COMMIT");
    return secretResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating secret:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function deleteSecret({ secret_id }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deleteResult = await client.query(
      `
      DELETE FROM secrets
      WHERE id = $1
      RETURNING *;
      `,
      [secret_id]
    );

    await client.query("COMMIT");

    return deleteResult.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting secret:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function createUserSecret({
  secret_id,
  user_id,
  encrypted_secret_key,
  nonce,
  sender_public_key,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO user_secrets (
        secret_id,
        user_id,
        encrypted_secret_key,
        nonce,
        sender_public_key
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [secret_id, user_id, encrypted_secret_key, nonce, sender_public_key]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating user_secret:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createSecret, deleteSecret, createUserSecret };
