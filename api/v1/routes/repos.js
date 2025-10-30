const express = require("express");
const {
  createRepo,
  fetchUserRepos,
  fetchRepoDetails,
  fetchRepoDetailsJoin,
  createRepoInviteController,
  fetchUserRepoInvites,
  fetchRepoInvite,
  joinRepoController,
  fetchRepoUserKeys,
  fetchRepoSecrets,
} = require("../controllers/repoController");
const router = express.Router();
const { authenticateJWT } = require("../../../middlewares/authMiddleware");

router.post("/createRepo", authenticateJWT, createRepo);
router.get("/fetchRepos", authenticateJWT, fetchUserRepos);
router.post("/createRepoInvite", authenticateJWT, createRepoInviteController);
router.get("/fetchRepoInvites", authenticateJWT, fetchUserRepoInvites);
router.post("/join/submit/:id", authenticateJWT, joinRepoController);
router.get("/join/:id", authenticateJWT, fetchRepoInvite);
router.get("/:id/userKeys", authenticateJWT, fetchRepoUserKeys);
router.get("/:id/secrets", authenticateJWT, fetchRepoSecrets);
router.get("/:id", authenticateJWT, fetchRepoDetails);

module.exports = router;
