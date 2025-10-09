const express = require("express");
const {
  createRepo,
  fetchUserRepos,
  fetchRepoDetails,
} = require("../controllers/repoController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createRepo", authenticateJWT, createRepo);
router.get("/fetchRepos", authenticateJWT, fetchUserRepos);
router.get("/:id", authenticateJWT, fetchRepoDetails);

module.exports = router;
