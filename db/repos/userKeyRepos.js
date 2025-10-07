const pool = require("../../db/index");

async function insertUserKey({
  user_id,
  public_key,
  encrypted_private_key,
  private_key_salt,
  private_key_nonce,
  kdf_alg = "argon2id",
  kdf_ops,
  kdf_mem,
}) {
  const result = await pool.query(
    `INSERT INTO user_keys (
      user_id, public_key, encrypted_private_key, private_key_salt,
      private_key_nonce, kdf_alg, kdf_ops, kdf_mem
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
    [
      user_id,
      public_key,
      encrypted_private_key,
      private_key_salt,
      private_key_nonce,
      kdf_alg,
      kdf_ops,
      kdf_mem,
    ]
  );

  return result.rows[0];
}

module.exports = { insertUserKey };
