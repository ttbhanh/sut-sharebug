"use strict";

const controller = {};
const testPlanModel = require("../models/testPlanModel");
const requirementModel = require("../models/requirementModel");
const releaseModel = require("../models/releaseModel");
const userModel = require("../models/userModel");
const participationModel = require("../models/participationModel");

const { sanitizeInput } = require("./shared");

controller.show = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

    // Kiểm tra quyền truy cập của User
    if (
      !user.IsAdmin &&
      (!participation || (participation && participation.Role === "Developer"))
    ) {
      const projectData = {
        ProjectID: projectId, // Thêm ProjectID
      };
      return res.render("not-have-access", {
        title: "ShareBug - Not Have Access",
        header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                        <link rel="stylesheet" href="/css/not-have-access.css" />`,
        d2: "selected-menu-item",
        n7: "active border-danger",
        user,
        project: projectData,
      });
    }

    let testPlanKeyword = sanitizeInput(req.query.testPlanKeyword) || "";

    // Tìm release thuộc project đó
    const releases = await releaseModel.find({ ProjectID: projectId });

    // Tìm tất cả các test plan thuộc project
    const testPlans = await testPlanModel.find({
      ProjectID: projectId,
      Name: { $regex: testPlanKeyword, $options: "i" },
    });

    // Pagination
    let total = testPlans.length;
    let limit = 5;
    let page = 1;
    // Validate page query
    let invalidPage =
      isNaN(req.query.page) ||
      req.query.page < 1 ||
      (req.query.page > Math.ceil(total / limit) && total > 0) ||
      (req.query.page > 1 && total == 0);
    if (invalidPage) {
      // Change only the page parameter and reload page
      let queryParams = req.query;
      queryParams.page = 1;
      return res.redirect(
        `/project/${projectId}/test-plan?${new URLSearchParams(
          queryParams
        ).toString()}`
      );
    } else {
      page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
    }
    let skip = (page - 1) * limit;
    let showing = Math.min(total, skip + limit);
    res.locals.pagination = {
      page: page,
      limit: limit,
      showing: showing,
      totalRows: total,
      queryParams: req.query,
    };
    // end Pagination

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
      TestPlans: testPlans.slice(skip, skip + limit),
      TestPlansCount: testPlans.length,
      AllReleases: releases,
    };

    // Gọi view và truyền dữ liệu vào
    res.render("test-plan", {
      title: "ShareBug - Test Plans",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/test-runs-view-styles.css" />`,
      d2: "selected-menu-item",
      n7: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test plans:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.getTestPlanNameById = async (req, res) => {
  try {
    const testPlanId = req.params.testPlanId;
    const testPlan = await testPlanModel.findById(testPlanId);
    if (!testPlan) {
      return res.status(404).json({ message: "TestPlan not found" });
    }
    res.json({ TestPlanName: testPlan.Name });
  } catch (error) {
    res.status(500).json({ message: "Error fetching testPlan name", error });
  }
};

controller.addTestPlan = async (req, res) => {
  try {
    const {
      name: nameBody,
      startDate: startDateBody,
      endDate: endDateBody,
      description: descriptionBody,
      releaseId: releaseId,
    } = req.body;

    // Sanitize inputs
    const name = sanitizeInput(nameBody);
    const startDate = startDateBody;
    const endDate = endDateBody;
    const description = sanitizeInput(descriptionBody);

    const startDay = startDate ? new Date(startDate) : null;
    const endDay = endDate ? new Date(endDate) : null;
    const formattedStartDate = startDay ? startDay.toISOString() : null;
    const formattedEndDate = endDay ? endDay.toISOString() : null;

    const release = await releaseModel.findOne({ _id: releaseId });
    if (!release) {
      return res.status(404).json({ message: "Release not found" });
    }

    const newTestPlan = await testPlanModel.create({
      Name: name,
      StartDate: formattedStartDate,
      EndDate: formattedEndDate,
      Description: description || null,
      ReleaseID: release._id,
      ProjectID: release.ProjectID,
    });

    res.redirect(`/project/${req.body.projectId}/test-plan`);
  } catch (error) {
    res.status(500).json({ message: "Error adding Test Plan", error });
  }
};

controller.editTestPlan = async (req, res) => {
  try {
    const {
      nameEdit: nameBody,
      startDateEdit: startDateBody,
      endDateEdit: endDateBody,
      descriptionEdit: descriptionBody,
      releaseIdEdit: releaseIdBody,
      idEdit,
    } = req.body;

    // Sanitize inputs
    const nameEdit = sanitizeInput(nameBody);
    const startDateEdit = startDateBody;
    const endDateEdit = endDateBody;
    const descriptionEdit = sanitizeInput(descriptionBody);
    const releaseIdEdit = sanitizeInput(releaseIdBody);

    const startDay = startDateEdit ? new Date(startDateEdit) : null;
    const endDay = endDateEdit ? new Date(endDateEdit) : null;
    const formattedStartDate = startDay ? startDay.toISOString() : null;
    const formattedEndDate = endDay ? endDay.toISOString() : null;

    if (nameEdit == "") {
      return res.status(404).json({ message: "Test Plan name not filled" });
    }

    const release = await releaseModel.findById(releaseIdEdit);
    if (!release) {
      return res.status(404).json({ message: "Release not found" });
    }

    const updatedTestPlan = await testPlanModel.findByIdAndUpdate(idEdit, {
      Name: nameEdit,
      StartDate: formattedStartDate,
      EndDate: formattedEndDate,
      Description: descriptionEdit || null,
      UpdatedAt: Date.now(),
      ReleaseID: releaseIdEdit,
    });

    if (!updatedTestPlan) {
      return res.status(404).json({ message: "Test Plan not found" });
    } else res.status(200).json({ message: "Test Plan Updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error updating Test Plan", error });
  }
};

controller.deleteTestPlan = async (req, res) => {
  try {
    const testPlanId = req.params.testPlanId;
    const deletedTestPlan = await testPlanModel.findByIdAndDelete(testPlanId);

    if (!deletedTestPlan) {
      return res.status(404).json({ message: "Test plan not found" });
    }

    res.json({ message: "Test plan deleted successfully", deletedTestPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete test plan", error });
  }
};

module.exports = controller;
