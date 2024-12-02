"use strict";

const controller = {};
const testRunModel = require("../models/testRunModel");
const releaseModel = require("../models/releaseModel");
const requirementModel = require("../models/requirementModel");
const testPlanModel = require("../models/testPlanModel");
const moduleModel = require("../models/moduleModel");
const testCaseModel = require("../models/testCaseModel");
const userModel = require("../models/userModel");
const issueModel = require("../models/issueModel");
const participationModel = require("../models/participationModel");
const testRunTestCaseModel = require("../models/testCaseTestRunModel");
const mongoose = require("mongoose");

const { sanitizeInput } = require("./shared");

controller.init = (req, res, next) => {
  res.locals.scripts = `
    <script src="/js/test-run-results-module.js"></script>
    `;
  next();
};

controller.show = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const user = req.user;

    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

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
        n6: "active border-danger",
        user,
        project: projectData,
      });
    }

    let testRunKeyword = sanitizeInput(req.query.testRunKeyword) || "";
    const allReleases = await releaseModel.find({ ProjectID: projectId });
    const selectedReleaseId = sanitizeInput(req.query.selectedReleaseId) || "";

    // Tìm tất cả các test run thuộc project thỏa điều kiện lọc
    let filter = {
      ProjectID: projectId,
      Name: { $regex: testRunKeyword, $options: "i" },
    };
    let selectedRelease;
    if (selectedReleaseId != "") {
      selectedRelease = await releaseModel.findById(selectedReleaseId);
      filter.ReleaseID = selectedRelease._id;
    }

    const testRuns = await testRunModel.find(filter);
    const testRunIds = testRuns.map((tr) => tr._id.toString());

    // Lấy danh sách TestRunTestCase
    const testRunTestCases = await testRunTestCaseModel.find({
      TestRunID: { $in: testRunIds },
    });

    const testCases = {};
    testRunIds.forEach((tRId) => {
      testCases[tRId] = testRunTestCases.filter(
        (trtc) => trtc.TestRunID == tRId
      );
    });

    // Tạo một danh sách các userId để tìm kiếm thông tin người được giao
    const assignToIds = testRuns.map((testRun) => testRun.AssignTo);
    // Tìm thông tin người được giao từ bảng user
    const userAssigns = await userModel.find({ _id: { $in: assignToIds } });
    const userAssignMap = userAssigns.reduce((map, userAssign) => {
      map[userAssign._id] = userAssign;
      return map;
    }, {});

    // Tìm thông tin người tạo TR từ bảng user
    const createdByIds = testRuns.map((testRun) => testRun.CreatedBy);
    const userCreates = await userModel.find({ _id: { $in: createdByIds } });
    const userCreatedMap = userCreates.reduce((map, userCreated) => {
      map[userCreated._id] = userCreated;
      return map;
    }, {});

    // Kết hợp dữ liệu test run với thông tin người được giao
    const testRunsWithUser = testRuns.map((testRun) => {
      return {
        ...testRun._doc, // spread the document properties
        AssignTo: userAssignMap[testRun.AssignTo]
          ? userAssignMap[testRun.AssignTo].Name
          : "Unknown", // Assuming 'name' is the field in userAssign model
        CreatedBy: userCreatedMap[testRun.CreatedBy]
          ? userCreatedMap[testRun.CreatedBy].Name
          : "Unknown", // Assuming 'name' is the field in userAssign model
        TestCases: testCases[testRun._id],
        Release: allReleases[testRun.ReleaseID],
      };
    });

    // Lấy tất cả các bản ghi từ bảng Participation có ProjectID tương ứng
    const participations = await participationModel.find({
      ProjectID: projectId,
    });
    // Lấy danh sách các UserID từ participations
    const userIds = participations.map((participation) => participation.UserID);

    // Lấy thông tin chi tiết của các User thông qua UserID
    const users = await userModel.find({
      _id: { $in: userIds },
      // Status: "Active",
    });

    // Pagination
    let total = testRunsWithUser.length;
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
        `/project/${projectId}/test-run?${new URLSearchParams(
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

    console.log(users);
    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
      releaseName: selectedRelease ? selectedRelease.Name : "",
      TestRuns: testRunsWithUser.slice(skip, skip + limit),
      TestRunsCount: testRunsWithUser.length,
      Releases: allReleases,
      Users: users,
      //TestCases: testCases,
    };

    // Gọi các view cần thiết và truyền dữ liệu vào
    res.render("test-run", {
      title: "ShareBug - Test Runs",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/test-runs-view-styles.css" />`,
      d2: "selected-menu-item",
      n6: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test runs:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Hàm getStatusColor để trả về màu tương ứng với trạng thái
function getStatusColor(status) {
  switch (status) {
    case "Passed":
      return "rgb(92, 184, 92)";
    case "Untested":
      return "rgb(70, 191, 189)";
    case "Blocked":
      return "rgb(77, 83, 96)";
    case "Retest":
      return "rgb(253, 180, 92)";
    case "Failed":
      return "rgb(247, 70, 74)";
    case "Not Applicable":
      return "rgb(147, 119, 85)";
    case "In Progress":
      return "rgb(87, 147, 243)";
    case "Hold":
      return "rgb(23, 162, 184)";
    default:
      return "rgb(0, 0, 0)"; // Màu mặc định nếu không có trạng thái nào khớp
  }
}

controller.showResult = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

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
        n6: "active border-danger",
        user,
        project: projectData,
      });
    }

    const moduleId = req.query.ModuleID ? req.query.ModuleID : 0;
    let testCaseCount = req.query.TestCaseCount ? req.query.TestCaseCount : 0;
    let testCaseKeyword = sanitizeInput(req.query.testCaseKeyword) || "";
    let moduleKeyword = sanitizeInput(req.query.moduleKeyword) || "";

    // Lấy các tham số sắp xếp từ query params
    const sortField = req.query.sortField || "created-date";
    const sortOrder = req.query.sortOrder || "desc";
    const sortCriteria = {};
    if (sortField === "created-date") {
      sortCriteria.CreatedAt = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "title") {
      sortCriteria.Title = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "case-code") {
      sortCriteria._id = sortOrder === "desc" ? -1 : 1;
    }

    let modules = await moduleModel.find({
      ProjectID: projectId,
      Name: { $regex: moduleKeyword, $options: "i" },
    });

    const moduleIds = modules.map((module) => module._id);

    const allTestCases = await testCaseModel.find({
      ModuleID: { $in: moduleIds },
    });
    const allTestCaseIds = allTestCases.map((allTestCase) => allTestCase._id);

    let testCases, moduleName;
    if (moduleId !== 0) {
      // Nếu moduleId khác 0, chỉ lấy các test case có moduleId tương ứng
      testCases = await testCaseModel
        .find({
          ModuleID: moduleId,
          Title: { $regex: testCaseKeyword, $options: "i" },
        })
        .sort(sortCriteria);
      const module = await moduleModel.findById(moduleId).select("Name");
      moduleName = module.Name;
    } else {
      // Nếu moduleId là 0, lấy tất cả các test case
      testCases = await testCaseModel
        .find({ Title: { $regex: testCaseKeyword, $options: "i" } })
        .sort(sortCriteria);
      moduleName = "All Test Cases";
      testCaseCount = allTestCases.length;
    }

    const testCaseIds = testCases.map((testCase) => testCase._id);

    // Tìm tất cả các test run thuộc các test case thuộc project đó
    const testRuns = await testRunModel.find({
      TestCaseID: { $in: testCaseIds },
    });

    // Lấy danh sách các TestCaseID từ testRuns
    const testRunCaseIds = new Set(
      testRuns.map((testRun) => testRun.TestCaseID.toString())
    );

    // Lọc lại testCases để chỉ lấy các testCase có testRun tương ứng
    const filteredTestCases = testCases.filter((testCase) =>
      testRunCaseIds.has(testCase._id.toString())
    );
    testCases = filteredTestCases;

    // Lấy số lượng test case cho mỗi module
    const testCaseCounts = await testCaseModel.aggregate([
      { $match: { ModuleID: { $in: moduleIds } } },
      { $group: { _id: "$ModuleID", count: { $sum: 1 } } },
    ]);

    const testCaseCountsMap = testCaseCounts.reduce((map, testCaseCount) => {
      map[testCaseCount._id] = testCaseCount;
      return map;
    }, {});

    const modulesWithTestCaseCount = modules.map((module) => {
      return {
        ...module._doc, // spread the document properties
        TestCaseCount: testCaseCountsMap[module._id]
          ? testCaseCountsMap[module._id].count
          : 0, // Assuming 'name' is the field in userAssign model
      };
    });

    // Tạo một danh sách các userId để tìm kiếm thông tin người được giao
    const assignToIds = testRuns.map((testRun) => testRun.AssignTo);

    // Tìm thông tin người được giao từ bảng user
    const usersFull = await userModel.find({});
    const users = await userModel.find({ _id: { $in: assignToIds } });
    const userMap = users.reduce((map, user) => {
      map[user._id] = user;
      return map;
    }, {});

    // Kết hợp dữ liệu test case với thông tin test run và người được giao
    const testCasesFull = testCases.map((testCase) => {
      const runs = testRuns.filter(
        (run) => run.TestCaseID.toString() === testCase._id.toString()
      );
      const testRunsInfo = runs.map((run) => ({
        Status: run.Status,
        AssignTo: userMap[run.AssignTo]
          ? userMap[run.AssignTo].Name
          : "Unknown", // Assuming 'Name' is the field in user model
      }));

      // Lấy thông tin người được giao và trạng thái từ testRunsInfo
      const assignTo =
        testRunsInfo.length > 0 ? testRunsInfo[0].AssignTo : "Unknown";
      const status =
        testRunsInfo.length > 0 ? testRunsInfo[0].Status : "Untested";

      // Trả lại testCase đã được cập nhật
      return {
        ...testCase._doc, // spread the document properties
        AssignTo: assignTo,
        Status: status,
        StatusColor: getStatusColor(status), // Lấy màu cho trạng thái
      };
    });

    const allTestRuns = await testRunModel.find({
      TestCaseID: { $in: allTestCaseIds },
    });
    // Đếm số lượng test run theo status
    const projectStatus = [
      "Passed",
      "Untested",
      "Blocked",
      "Retest",
      "Failed",
      "Not Applicable",
      "In Progress",
      "Hold",
    ];
    const numProjectStatus = projectStatus.map((status) => {
      return allTestRuns.filter((allTestRun) => allTestRun.Status === status)
        .length;
    });

    const allTestRunIds = allTestRuns.map((allTestRun) => allTestRun._id);

    const allIssues = await issueModel.find({
      TestRunID: { $in: allTestRunIds },
    });
    // Đếm số lượng test run theo status
    const issueStatus = [
      "New",
      "Assigned",
      "Open",
      "Fixed",
      "Retest",
      "Verified",
      "Reopen",
      "Closed",
      "Duplicate",
      "Invalid",
      "Deferred",
    ];
    const numIssueStatus = issueStatus.map((status) => {
      return allIssues.filter((allIssue) => allIssue.Status === status).length;
    });

    // Pagination
    let page = isNaN(req.query.page)
      ? 1
      : Math.max(1, parseInt(req.query.page));
    let limit = 5;
    let skip = (page - 1) * limit;
    let total = testCasesFull.length;
    let showing = Math.min(total, skip + limit);
    res.locals.pagination = {
      page: page,
      limit: limit,
      showing: showing,
      totalRows: total,
      queryParams: req.query,
    };

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
      Users: usersFull,
      TestCases: testCasesFull.slice(skip, skip + limit),
      TotalTestCase: allTestCases.length,
      ModuleID: moduleId,
      moduleName: moduleName,
      testCaseCount: testCasesFull.length,
      Modules: JSON.stringify(modulesWithTestCaseCount),
      numProjectStatus: numProjectStatus,
      numIssueStatus: numIssueStatus,
      sortField,
      sortOrder,
      projectStatus,
    };

    // Gọi các view cần thiết và truyền dữ liệu vào
    res.render("test-run-result", {
      title: "ShareBug - Test Runs & Results",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/test-runs-results-styles.css" />`,
      d2: "selected-menu-item",
      n6: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test runs:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.addTestRun = async (req, res) => {
  try {
    const {
      name: nameBody,
      version: versionBody,
      browser: browserBody,
      assignToName: assignToNameBody,
      testcase: testcaseBody,
      description: descriptionBody,
      createdBy,
    } = req.body;

    // Sanitize inputs
    const name = sanitizeInput(nameBody);
    const version = sanitizeInput(versionBody);
    const browser = sanitizeInput(browserBody);
    const assignToName = sanitizeInput(assignToNameBody);
    const testcase = sanitizeInput(testcaseBody);
    const description = sanitizeInput(descriptionBody);

    // Tìm kiếm user và testcase từ cơ sở dữ liệu
    const assignTo = await userModel.findOne({ Name: assignToName });

    if (!assignTo) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const testCase = await testCaseModel.findOne({ Title: testcase });

    if (!testCase) {
      return res.status(404).json({ message: "Test Case not found" });
    }

    const newTestRun = new testRunModel({
      Name: name,
      Version: version || null,
      Browser: browser || null,
      Description: description || null,
      Status: "Untested",
      CreatedBy: createdBy, // Assuming you have user info in req.user
      AssignTo: assignTo._id,
      TestCaseID: testcase ? testCase._id : null,
    });

    await newTestRun.save();
    res
      .status(201)
      .json({ message: "Test run added successfully", testRun: newTestRun });

    // res.redirect(`/project/${projectID}/test-run`); // Redirect back to the admin page
  } catch (error) {
    console.error("Error adding test run:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.editTestRun = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name: nameBody,
      version: versionBody,
      browser: browserBody,
      assignToName: assignToNameBody,
      testcase: testcaseBody,
      description: descriptionBody,
      status: statusBody,
      createdBy,
    } = req.body;

    // Sanitize inputs
    const name = sanitizeInput(nameBody);
    const version = sanitizeInput(versionBody);
    const browser = sanitizeInput(browserBody);
    const assignToName = sanitizeInput(assignToNameBody);
    const testcase = sanitizeInput(testcaseBody);
    const description = sanitizeInput(descriptionBody);
    const status = sanitizeInput(statusBody);
    // Tìm kiếm user và testcase từ cơ sở dữ liệu
    const assignTo = await userModel.findOne({ Name: assignToName });
    const testCase = testcase
      ? await testCaseModel.findOne({ Title: testcase })
      : null;

    if (!assignTo || !testCase) {
      return res.status(400).send("Invalid assign-to user or testcase");
    }

    const updatedTestRun = await testRunModel.findByIdAndUpdate(id, {
      Name: name,
      Version: version || null,
      Browser: browser || null,
      Description: description || null,
      Status: status,
      CreatedBy: createdBy,
      AssignTo: assignTo._id,
      TestCaseID: testCase ? testCase._id : null,
      UpdatedAt: Date.now(),
    });

    if (!updatedTestRun) {
      return res.status(404).json({ message: "Test run not found" });
    }
    res.status(200).json({
      message: "Test run updated successfully",
      testRun: updatedTestRun,
    });
  } catch (error) {
    console.error("Error editing test run:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.deleteTestRun = async (req, res) => {
  try {
    const testRunId = req.params.id;
    const result = await testRunModel.findByIdAndDelete(testRunId);
    if (result) {
      res.status(200).json({ message: "Test run deleted successfully." });
    } else {
      res.status(404).json({ message: "Test run not found." });
    }
  } catch (error) {
    console.error("Error deleting test run:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

controller.changeStatus = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { status: statusBody } = req.body;

    const status = sanitizeInput(statusBody);

    const testRun = await testRunModel.findOne({ TestCaseID: testCaseId });
    // console.log(testRun)

    if (!testRun) {
      return res.status(404).json({ message: "Test run not found" });
    }

    const updatedTestRun = await testRunModel.findByIdAndUpdate(testRun._id, {
      Status: status,
      UpdatedAt: Date.now(),
    });

    if (!updatedTestRun) {
      return res.status(404).json({ message: "Test run not found" });
    }
    res.status(200).json({
      message: "Test run updated successfully",
      testRun: updatedTestRun,
    });
  } catch (error) {
    console.error("Error editing test run:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.updateAssignTo = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { assignTo } = req.body;

    const testRun = await testRunModel.findOne({ TestCaseID: testCaseId });
    // console.log(testRun)

    if (!testRun) {
      return res.status(404).json({ message: "Test run not found" });
    }

    const updatedTestRun = await testRunModel.findByIdAndUpdate(testRun._id, {
      AssignTo: assignTo,
      UpdatedAt: Date.now(),
    });

    if (!updatedTestRun) {
      return res.status(404).json({ message: "Test run not found" });
    }
    res.status(200).json({
      message: "Test run updated successfully",
      testRun: updatedTestRun,
    });
  } catch (error) {
    console.error("Error editing test run:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.bulkActions = async (req, res) => {
  try {
    const { caseCodes, status: statusBody, assignTo } = req.body;

    const status = sanitizeInput(statusBody);

    // Find the user by name to get the user ID
    const user = await userModel.findOne({ Name: assignTo });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const userId = user._id;

    // Find and update the testRun entries
    await testRunModel.updateMany(
      { TestCaseID: { $in: caseCodes } },
      { $set: { Status: status, AssignTo: userId } }
    );

    res.status(200).send("Cases updated successfully");
  } catch (error) {
    console.error("Error updating bulk actions:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = controller;
