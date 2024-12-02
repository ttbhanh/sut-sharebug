"use strict";

const express = require("express");
const controller = require("../controllers/projectController");
const router = express.Router();

router.use("/list", controller.initList);

router.get("/list", controller.showList);
router.get("/list/:page", controller.showList);
router.get("/:projectId", controller.initHome, controller.showHome);
router.post("/", controller.addProject);
router.put("/:projectId", controller.editProject);
router.delete("/:projectId", controller.deleteProject);

router.post("/list/assignUser", controller.assignUser);
router.post("/list/check-role", controller.checkUserRole);
router.delete("/removeAssignUser/:id", controller.removeAssignUser);

router.use("/:projectId/requirement", require("./requirementRouter"));
router.use("/:projectId/release", require("./releaseRouter"));
router.use("/:projectId/module", require("./moduleRouter"));
router.use("/:projectId/test-case", require("./testCaseRouter"));
router.use("/:projectId/test-run", require("./testRunRouter"));
router.use("/:projectId/test-plan", require("./testPlanRouter"));
router.use("/:projectId/issue", require("./issueRouter"));
router.use("/:projectId/report", require("./reportRouter"));
router.use("/:projectId/tag", require("./tagRouter"));
router.use("/:projectId/not-have-access", require("./notHaveAccessRouter"));

module.exports = router;
