const express = require("express");
const { createSecretController } = require("../controllers/secretsController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createSecret", authenticateJWT, createSecretController);

module.exports = router;
