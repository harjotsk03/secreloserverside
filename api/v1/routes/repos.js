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
  approveRepoMemberController,
  declineRepoMemberController,
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
router.post(
  "/approve/:memberId/:repoId",
  authenticateJWT,
  approveRepoMemberController
);
router.post(
  "/decline/:memberId/:repoId",
  authenticateJWT,
  declineRepoMemberController
);
router.get("/:id", authenticateJWT, fetchRepoDetails);

module.exports = router;
