const express = require("express");
const router = express.Router();
const {
  createUserController,
  loginController,
  getUsersController,
} = require("../controllers/usersController");

router.post("/register", createUserController);
router.post("/login", loginController);
router.get("/getUsers", getUsersController);

module.exports = router;
