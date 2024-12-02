"use strict";

const controller = {};
const releaseModel = require("../models/releaseModel");
const requirementModel = require("../models/requirementModel");
const testPlanModel = require("../models/testPlanModel");
const testCaseModel = require("../models/testCaseModel");
const testRunModel = require("../models/testRunModel");
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
    const statusFilter = req.query.statusFilter
      ? req.query.statusFilter
      : "open";

    // Kiểm tra quyền truy cập của user
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
        n3: "active border-danger",
        user,
        project: projectData,
      });
    }

    const currentDate = new Date();

    // Tìm tất cả các release thuộc project đó
    // Vì lý do này mà xử lý pagination khó
    const releases = await releaseModel.find({ ProjectID: projectId });

    // Tạo các mảng để lưu các release theo loại
    const openReleases = [];
    const upcomingReleases = [];
    const completedReleases = [];

    // Lặp qua từng release và xác định loại của nó
    releases.forEach((release) => {
      // Convert các ngày trong release sang dạng Date object
      const startDate = new Date(release.StartDate);
      const endDate = new Date(release.EndDate);

      // Kiểm tra loại của release
      if (currentDate >= startDate && currentDate <= endDate) {
        openReleases.push(release);
      } else if (currentDate < startDate) {
        upcomingReleases.push(release);
      } else {
        completedReleases.push(release);
      }
    });

    // Pagination
    // Use statusFilter to determine which page to show
    let openReleasesCount = openReleases.length;
    let upcomingReleasesCount = upcomingReleases.length;
    let completedReleasesCount = completedReleases.length;
    let displayedReleases = [];
    let total = 0;
    if (statusFilter === "open") {
      total = openReleasesCount;
      displayedReleases = openReleases;
    } else if (statusFilter === "upcoming") {
      total = upcomingReleasesCount;
      displayedReleases = upcomingReleases;
    } else {
      total = completedReleasesCount;
      displayedReleases = completedReleases;
    }
    let limit = 6;
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
        `/project/${projectId}/release?${new URLSearchParams(
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

    // Tạo projectData với thông tin về các loại release và ProjectID
    const projectData = {
      OpenReleasesCount: openReleasesCount,
      UpcomingReleasesCount: upcomingReleasesCount,
      CompletedReleasesCount: completedReleasesCount,
      Releases: displayedReleases.slice(skip, skip + limit),
      ProjectID: projectId,
    };

    // Render view release với thông tin các release thuộc project và các loại release
    res.render("release", {
      title: "ShareBug - Release",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/release.css" />`,
      d2: "selected-menu-item",
      n3: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching releases:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showDetail = async (req, res) => {
  try {
    const releaseId = req.params.releaseId;
    const release = await releaseModel.findById(releaseId);
    const releaseDetail = {
      Name: release.Name,
      Description: release.Descrition,
      StartDate: release.StartDate,
      EndDate: release.EndDate,
      ProjectID: release.ProjectID.toString(),
    };

    const releaseTestPlans = await testPlanModel.find({
      ReleaseID: release._id,
    });
    const releaseTestPlanIds = releaseTestPlans.map((testPlan) => testPlan._id);

    const releaseTestRuns = await testRunModel.find({
      TestPlanID: { $in: releaseTestPlanIds },
    });
    // const releaseTestCaseDetail = await testCaseModel.find({
    //   TestPlanID: { $in: releaseTestPlanDetailIds },
    // });
    // const releaseTestCaseDetailIds = releaseTestCaseDetail.map(
    //   (testCase) => testCase._id
    // );

    // const releaseTestRunDetail = await testRunModel.find({
    //   TestCaseID: { $in: releaseTestCaseDetailIds },
    // });

    releaseDetail.TestRuns = releaseTestRuns;
    const statusCounts = {
      Passed: 0,
      Failed: 0,
      Untested: 0,
      Other: 0,
    };

    releaseTestRuns.forEach((testRun) => {
      switch (testRun.Status) {
        case "Passed":
          statusCounts.Passed++;
          break;
        case "Failed":
          statusCounts.Failed++;
          break;
        case "Untested":
          statusCounts.Untested++;
          break;
        default:
          statusCounts.Other++;
          break;
      }
    });
    releaseDetail.StatusCounts = statusCounts;
    res.json(releaseDetail);
  } catch (error) {
    console.error("Error fetching releases:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

controller.getReleaseNameById = async (req, res) => {
  try {
    const releaseId = req.params.releaseId;
    const release = await releaseModel.findById(releaseId);
    if (!release) {
      return res.status(404).json({ message: "Release not found" });
    }
    res.json({ ReleaseName: release.Name });
  } catch (error) {
    res.status(500).json({ message: "Error fetching release name", error });
  }
};

controller.addRelease = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const {
      name: nameBody,
      startDate,
      endDate,
      description: descriptionBody,
    } = req.body;

    // Sanitize input
    const name = sanitizeInput(nameBody);
    const description = sanitizeInput(descriptionBody);

    const startDay = startDate ? new Date(startDate) : null;
    const endDay = endDate ? new Date(endDate) : null;
    const formattedStartDate = startDay ? startDay.toISOString() : null;
    const formattedEndDate = endDay ? endDay.toISOString() : null;

    const newRelease = await releaseModel.create({
      Name: name,
      StartDate: formattedStartDate,
      EndDate: formattedEndDate,
      Description: description || null,
      ProjectID: projectId,
    });

    if (!newRelease) {
      return res.status(404).json({ message: "Release not found" });
    } else res.status(200).json({ message: "Release Added successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error adding Release", error });
  }
};

controller.editRelease = async (req, res) => {
  try {
    const {
      nameEdit: nameEditBody,
      startDateEdit: startDateEditBody,
      endDateEdit: endDateEditBody,
      descriptionEdit: descriptionEditBody,
      idEdit,
    } = req.body;

    // Sanitize inputs
    const nameEdit = sanitizeInput(nameEditBody);
    const startDateEdit = startDateEditBody;
    const endDateEdit = endDateEditBody;
    const descriptionEdit = sanitizeInput(descriptionEditBody);

    const startDay = startDateEdit ? new Date(startDateEdit) : null;
    const endDay = endDateEdit ? new Date(endDateEdit) : null;
    const formattedStartDate = startDay ? startDay.toISOString() : null;
    const formattedEndDate = endDay ? endDay.toISOString() : null;

    const updatedRelease = await releaseModel.findByIdAndUpdate(idEdit, {
      Name: nameEdit,
      StartDate: formattedStartDate,
      EndDate: formattedEndDate,
      Description: descriptionEdit || null,
      UpdatedAt: Date.now(),
      // RequirementID: if it is to be updated, include here
    });

    if (!updatedRelease) {
      return res.status(404).json({ message: "Release not found" });
    } else res.status(200).json({ message: "Release Updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error updating Release", error });
  }
};

controller.deleteRelease = async (req, res) => {
  try {
    const releaseId = req.params.releaseId;
    const deletedRelease = await releaseModel.findByIdAndDelete(releaseId);

    if (!deletedRelease) {
      return res.status(404).json({ message: "Release not found" });
    }

    res.json({ message: "Release deleted successfully", deletedRelease });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete Release", error });
  }
};

module.exports = controller;
