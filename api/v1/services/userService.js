const bcrypt = require("bcrypt");
const userRepo = require("../../../db/repos/userRepos");
const sodium = require("sodium-native");
const { nanoid } = require("nanoid");
const userKeysRepo = require("../../../db/repos/userKeyRepos");
const jwt = require("jsonwebtoken");

function toB64(buf) {
  return buf.toString("base64");
}

function generateToken(user) {
  const payload = { id: user.id, email: user.email };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

async function createUser({ full_name, email, password }) {
  const existing = await userRepo.getUserBy("email", email);
  if (existing) throw { code: "23505" };

  const password_hash = await bcrypt.hash(password, 12);
  const user = await userRepo.insertUser({ full_name, email, password_hash });

  // === KEY GENERATION ===
  const publicKey = Buffer.allocUnsafe(sodium.crypto_box_PUBLICKEYBYTES);
  const privateKey = Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES);
  sodium.crypto_box_keypair(publicKey, privateKey);

  const salt = Buffer.allocUnsafe(sodium.crypto_pwhash_SALTBYTES);
  sodium.randombytes_buf(salt);

  const symKey = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES
  );
  sodium.crypto_pwhash(
    symKey,
    Buffer.from(password),
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const nonce = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );
  sodium.randombytes_buf(nonce);

  const encryptedPriv = Buffer.allocUnsafe(
    privateKey.length + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
  );

  sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    encryptedPriv,
    privateKey,
    null,
    null,
    nonce,
    symKey
  );

  // === STORE KEYS ===
  await userKeysRepo.insertUserKey({
    user_id: user.id,
    public_key: toB64(publicKey),
    encrypted_private_key: toB64(encryptedPriv),
    private_key_salt: toB64(salt),
    private_key_nonce: toB64(nonce),
    kdf_ops: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    kdf_mem: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
  });

  // === GENERATE JWT ===
  const token = generateToken(user);
  return { user, token };
}

async function loginUser({ email, password }) {
  const user = await userRepo.getUserBySecure("email", email);
  if (!user) throw new Error("Invalid email or password");

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new Error("Invalid email or password");

  const token = generateToken(user);

  const { password_hash, ...userClean } = user;

  return { user: userClean, token };
}


module.exports = { createUser, loginUser };
