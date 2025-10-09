const userService = require("../services/userService");

async function createUserController(req, res) {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const user = await userService.createUser({ full_name, email, password });
    console.log(user)
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Internal server error" });
  }
}


async function loginController(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing credentials" });

  try {
    const { user, accessToken, refreshToken } = await userService.loginUser({
      email,
      password,
    });
    res.json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ error: "Invalid email or password" });
  }
}

async function getUsersController(req, res) {
  try {
    const data = await userService.getAllUsers();
    res.json(data);
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ error: "Invalid email or password" });
  }
}

module.exports = { createUserController, loginController, getUsersController };
