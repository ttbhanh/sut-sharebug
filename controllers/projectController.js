"use strict";

const controller = {};
const projectModel = require("../models/projectModel");
const userModel = require("../models/userModel");
const moduleModel = require("../models/moduleModel");
const testCaseModel = require("../models/testCaseModel");
const testRunModel = require("../models/testRunModel");
const issueModel = require("../models/issueModel");
const releaseModel = require("../models/releaseModel");
const activityModel = require("../models/activityModel");
const participationModel = require("../models/participationModel");
const testPlanModel = require("../models/testPlanModel");
const testCaseTestRunModel = require("../models/testCaseTestRunModel");

const { sanitizeInput } = require("./shared");

controller.initList = (req, res, next) => {
  res.locals.scripts = `
  <script src="/js/project-list.js"></script>
  `;
  next();
};

controller.initHome = (req, res, next) => {
  res.locals.scripts = `
  <script src="/js/project-home.js"></script>
  `;
  next();
};

controller.showList = async (req, res) => {
  try {
    let projectKeyword = sanitizeInput(req.query.projectKeyword) || "";

    // Lấy các tham số sắp xếp từ query params
    const sortField = req.query.sortField || "created-date";
    const sortOrder = req.query.sortOrder || "desc";
    const sortCriteria = {};
    if (sortField === "created-date") {
      sortCriteria.CreatedAt = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "title") {
      sortCriteria.Name = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "case-code") {
      sortCriteria._id = sortOrder === "desc" ? -1 : 1;
    }

    // Lấy thông tin user
    const user = req.user;

    // Lấy danh sách các project từ cơ sở dữ liệu
    let projects = [];
    // Nếu user là admin tìm project thỏa điều kiện lọc
    if (user.IsAdmin) {
      projects = await projectModel
        .find({ Name: { $regex: projectKeyword, $options: "i" } })
        .sort(sortCriteria);
    } else {
      // Nếu user không là admin, tìm project mà user tham gia hoặc user tạo thỏa điều kiện lọc
      // Lấy danh sách ProjectID mà user tham gia
      const participationProjects = await participationModel.find({
        UserID: user._id,
      });
      const participationProjectIds = participationProjects.map(
        (p) => p.ProjectID
      );
      // Lấy danh sách ProjectID mà user tạo
      const createdProjects = await projectModel.find({
        CreatedBy: user._id,
      });
      const createdProjectIds = createdProjects.map((p) => p._id);

      projects = await projectModel.find({
        _id: { $in: participationProjectIds.concat(createdProjectIds) },
        Name: { $regex: projectKeyword, $options: "i" },
      });
    }
    // Lấy thông tin chi tiết cho từng project
    const projectPromises = projects.map(async (project) => {
      const creator = await userModel.findById(project.CreatedBy);
      const testCases = await testCaseModel.find({ ProjectID: project._id });
      const testRuns = await testRunModel.find({ ProjectID: project._id });
      const issues = await issueModel.find({ ProjectID: project._id });

      return {
        ProjectID: project._id,
        Name: project.Name,
        ProjectImage: project.ProjectImage,
        CreatedAt: project.CreatedAt,
        CreatedBy: creator ? creator.Name : "Unknown",
        testCaseCount: testCases.length,
        testRunCount: testRuns.length,
        issueCount: issues.length,
      };
    });

    const projectsWithDetails = await Promise.all(projectPromises);

    // Pagination
    let total = projectsWithDetails.length;
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
        `/project/list?${new URLSearchParams(queryParams).toString()}`
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

    // Lấy danh sách tất cả user
    const users = await userModel.find();

    // Render view project-list với dữ liệu các project
    res.render("project-list", {
      title: "ShareBug - Project list",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/project-list.css" />`,
      d2: "selected-menu-item",
      user,
      users,
      projects: projectsWithDetails.slice(skip, skip + limit), // Truyền danh sách các project với thông tin chi tiết tới view
      sortField,
      sortOrder,

      messages: req.flash(),
    });
  } catch (error) {
    console.error("Error fetching project list:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showHome = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });
    const createrProject = await projectModel.findOne({
      _id: projectId,
      CreatedBy: user._id,
    });

    // Kiểm tra quyền truy cập của user
    if (!user.IsAdmin && !participation && !createrProject) {
      const projectData = {
        ProjectID: projectId, // Thêm ProjectID
      };
      return res.render("not-have-access", {
        title: "ShareBug - Not Have Access",
        header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                        <link rel="stylesheet" href="/css/not-have-access.css" />`,
        d2: "selected-menu-item",
        n1: "active border-danger",
        user,
        project: projectData,
      });
    }

    // Fetch the project details
    const project = await projectModel.findById(projectId);
    if (!project) {
      return res.status(404).render("error", { message: "Project not found" });
    }

    // Fetch the associated details
    const creator = await userModel.findById(project.CreatedBy);
    const modules = await moduleModel.find({ ProjectID: project._id });
    const moduleIds = modules.map((module) => module._id);

    const activities = await activityModel.find({
      ModuleID: { $in: moduleIds },
    });

    const testPlans = await testPlanModel.find({ ProjectID: project._id });
    const testRuns = await testRunModel.find({ ProjectID: project._id });
    const issues = await issueModel.find({ ProjectID: projectId });
    const testCases = await testCaseModel.find({ ProjectID: project._id });
    const releases = await releaseModel.find({ ProjectID: project._id });
    const releaseIds = releases.map((release) => release._id);
    // Đếm số lượng test run theo status
    const openReleaseStatus = [
      "Passed",
      "Untested",
      "Blocked",
      "Retest",
      "Failed",
      "Not Applicable",
      "In Progress",
      "Hold",
    ];
    const numOpenReleaseStatus = openReleaseStatus.map((status) => {
      return testRuns.filter((testRun) => testRun.Status === status).length;
    });

    const participations = await participationModel.find({
      ProjectID: projectId,
    });
    const assigneesIds = participations.map(
      (participation) => participation.UserID
    );
    const userAssigns = await userModel.find({ _id: { $in: assigneesIds } });
    const userAssignMap = userAssigns.reduce((map, userAssign) => {
      map[userAssign._id] = userAssign;
      return map;
    }, {});

    const participationsWithUserName = participations.map((participation) => {
      return {
        ...participation._doc, // spread the document properties
        Name: userAssignMap[participation.UserID]
          ? userAssignMap[participation.UserID].Name
          : "Unknown", // Assuming 'name' is the field in userAssign model
      };
    });

    // Prepare the data to be sent to the view
    const projectData = {
      ProjectID: project._id,
      Name: project.Name,
      ProjectImage: project.ProjectImage,
      CreatedAt: project.CreatedAt,
      CreatedBy: creator ? creator.Name : "Unknown",
      testCaseCount: testCases.length,
      testRunCount: testRuns.length,
      issueCount: issues.length,
      releaseCount: releases.length,
      testCases: testCases.map((testCase) => testCase._id),
      testCasesDetails: testCases,
      testRuns: testRuns.map((testRun) => testRun._id),
      issues: issues.map((issue) => issue._id),
      releases: releases.map((release) => release._id),
      activities: activities,
      numOpenReleaseStatus: numOpenReleaseStatus,
      Participations: participationsWithUserName,
    };

    // Render the project home view with the project data
    res.render("project-home", {
      title: "ShareBug - Project home",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/project-home.css" />`,
      d2: "selected-menu-item",
      n1: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.addProject = async (req, res) => {
  try {
    const projectName = req.body.projectName;
    const creator = req.user;

    const newProject = await projectModel.create({
      Name: projectName,
      CreatedBy: creator._id,
    });
    const projectId = newProject._id;

    res.redirect(`/project/${projectId}/`);
  } catch (error) {
    res.status(500).json({ message: "Error creating Project", error });
  }
};

controller.editProject = async (req, res) => {
  try {
    const newProjectName = req.body.projectNameEdit;
    const projectId = req.body.projectIdEdit;
    const canEdit = await isAllowed(req, projectId);
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: "You dont have permission to edit project.",
      });
    }
    const updatedProject = await projectModel.findByIdAndUpdate(projectId, {
      Name: newProjectName,
    });

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    } else {
      res.status(200).json({ message: "Project updated successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating Project", error });
  }
};

controller.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const canDelete = await isAllowed(req, projectId);
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You dont have permission to delete this project.",
      });
    }

    const deletedProject = await projectModel.findByIdAndDelete(projectId);

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project deleted successfully", deletedProject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete project", error });
  }
};

controller.assignUser = async (req, res) => {
  const { role, assignUser, projectId } = req.body;

  try {
    const canAssign = await isAllowed(req, projectId);
    if (!canAssign) {
      return res.status(403).json({
        success: false,
        message: "You dont have permission to assign user.",
      });
    }
    // Tạo mới participation
    const participation = new participationModel({
      Role: role,
      UserID: assignUser,
      ProjectID: projectId,
    });

    // Lưu vào database
    await participation.save();

    res
      .status(200)
      .json({ success: true, message: "User assigned successfully." });
  } catch (error) {
    console.error("Error assigning user:", error);
    res.status(500).json({ success: false, message: "Failed to assign user." });
  }
};

controller.removeAssignUser = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await participationModel.findByIdAndDelete(id);
    if (result) {
      res.status(200).json({ message: "Assign User removed successfully." });
    } else {
      res.status(404).json({ message: "Assign User not found." });
    }
  } catch (error) {
    console.error("Error remove assign user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

controller.checkUserRole = async (req, res) => {
  try {
    const { projectId } = req.body;
    const user = req.user;

    if (user.IsAdmin) {
      res.status(200).json({ role: "Admin" });
    } else {
      const participation = await participationModel.findOne({
        UserID: user._id,
        ProjectID: projectId,
      });

      if (!participation || participation.Role !== "Manager") {
        return res
          .status(404)
          .json({ message: "You do not have permission to do this action" });
      }

      res.status(200).json({ role: participation.Role });
    }
  } catch (error) {
    console.error("Error checking user role:", error);
    res.status(500).json({ message: "Error checking user role", error });
  }
};

async function isAllowed(req, projectId) {
  const user = req.user;
  const participation = await participationModel.findOne({
    UserID: user._id,
    ProjectID: projectId,
  });
  const project = await projectModel.findById(projectId);
  return (
    user.IsAdmin ||
    (participation && participation.Role == "Manager") ||
    (project && project.CreatedBy.toString() == user._id.toString())
  );
}

module.exports = controller;
