"use strict";

const express = require("express");
const controller = require("../controllers/testRunController");
const router = express.Router({ mergeParams: true });

router.use("/", controller.init);
router.get("/", controller.show);
router.get("/:id", controller.showResult);
// router.put("/result/changeStatus/:testCaseId", controller.changeStatus);
// router.put("/result/updateAssignTo/:testCaseId", controller.updateAssignTo);
// router.put("/result/bulkActions", controller.bulkActions);

// router.post("/", controller.addTestRun);
// router.put("/:id", controller.editTestRun);
// router.delete("/:id", controller.deleteTestRun);

module.exports = router;
