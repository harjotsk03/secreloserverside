const jwt = require("jsonwebtoken");
const userRepo = require("../repos/userRepos");

async function refreshTokenController(req, res) {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await userRepo.getUserBy("id", payload.id);
    if (!user) return res.status(401).json({ error: "Invalid refresh token" });

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

module.exports = { refreshTokenController };
