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

module.exports = { createSecret };
