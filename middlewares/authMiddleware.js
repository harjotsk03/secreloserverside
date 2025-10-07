// authMiddleware.js
require("dotenv").config();
const jwt = require("jsonwebtoken");

/**
 * Middleware to protect routes and validate JWT
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info from token to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      full_name: decoded.full_name,
    };
    next(); // proceed to the route
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticateJWT };
