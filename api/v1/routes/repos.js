const express = require("express");
const { createRepo, fetchUserRepos } = require("../controllers/repoController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createRepo", authenticateJWT, createRepo);
router.get("/fetchRepos", authenticateJWT, fetchUserRepos);

module.exports = router;
