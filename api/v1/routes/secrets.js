const express = require("express");
const {
  createSecretController,
  deleteSecretController,
  addNewUserDEKController,
  removeUserDEKController,
} = require("../controllers/secretsController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createSecret", authenticateJWT, createSecretController);
router.post("/addNewUserDEK/:userId", authenticateJWT, addNewUserDEKController);
router.delete(
  "/removeUserDEK/:userId",
  authenticateJWT,
  removeUserDEKController
);
router.delete("/:id", authenticateJWT, deleteSecretController);

module.exports = router;
