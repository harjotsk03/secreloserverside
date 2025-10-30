const express = require("express");
const {
  createSecretController,
  deleteSecretController,
} = require("../controllers/secretsController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createSecret", authenticateJWT, createSecretController);
router.delete("/:id", authenticateJWT, deleteSecretController);

module.exports = router;
