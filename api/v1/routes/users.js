const express = require("express");
const router = express.Router();
const { createUserController, loginController } = require("../controllers/usersController");

router.post("/register", createUserController);
router.post("/login", loginController);

module.exports = router;
