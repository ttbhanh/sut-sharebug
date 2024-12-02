"use strict";

const controller = {};
const reportModel = require("../models/reportModel");
const userModel = require("../models/userModel");

const { sanitizeInput } = require("./shared");

controller.init = (req, res, next) => {
  res.locals.scripts = `
    <script src="/js/report-view.js"></script>
    `;
  next();
};

controller.show = async (req, res) => {
  try {
    let options = {};

    const projectId = req.params.projectId;
    let reportKeyword = sanitizeInput(req.query.reportKeyword) || "";

    // Tìm tất cả các báo cáo thuộc project đó
    // const reports = await reportModel.find({ ProjectID: projectId }, null, options);
    const reportsCount = await reportModel.countDocuments({
      ProjectID: projectId,
      Title: { $regex: reportKeyword, $options: "i" },
    });

    // Tìm tất cả các báo cáo thuộc project đó
    const reports = await reportModel.find(
      { ProjectID: projectId, Title: { $regex: reportKeyword, $options: "i" } },
      null,
      options
    );

    // Pagination
    let total = reportsCount;
    let limit = 10;
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
        `/project/${projectId}/report?${new URLSearchParams(
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
      Reports: reports.slice(skip, skip + limit),
    };

    const user = req.user;

    // Gọi view và truyền dữ liệu vào
    res.render("report", {
      title: "ShareBug - Reports",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/reports-view.css" />`,
      d2: "selected-menu-item",
      n9: "active border-danger",
      user,
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showAdd = (req, res) => {
  const projectId = req.params.projectId;

  // Gói dữ liệu trong projectData chỉ có projectID
  const projectData = {
    ProjectID: projectId,
  };

  // Gọi view và truyền dữ liệu vào
  res.render("report-add", {
    title: "ShareBug - Add Report",
    header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                <link rel="stylesheet" href="/css/reports-add.css" />`,
    d2: "selected-menu-item",
    n9: "active border-danger",
    project: projectData,
  });
};

controller.addReport = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const reportType = req.body.reportType;
    const title = req.body.title;
    const isScheduled = req.body.isScheduled == "on" ? true : false;
    const start = req.body.startDate ? new Date(req.body.startDate) : null;
    const end = req.body.endDate ? new Date(req.body.endDate) : null;

    const newReport = await reportModel.create({
      Type: reportType,
      Title: title,
      StartDate: start,
      EndDate: end,
      IsScheduled: isScheduled,
      ProjectID: projectId,
    });

    res.redirect(`/project/${projectId}/report`);
  } catch (error) {
    res.status(500).json({ message: "Error creating Report", error });
  }
};

controller.editReport = async (req, res) => {
  try {
    console.log("Data");
    console.log(req.body);
    const projectIdEdit = req.body.projectIdEdit;
    const reportIdEdit = req.body.reportIdEdit;

    const reportTypeEdit = sanitizeInput(req.body.reportTypeEdit);
    const titleEdit = sanitizeInput(req.body.titleEdit);
    const startDateEdit = req.body.startDateEdit
      ? req.body.startDateEdit
      : null;
    const endDateEdit = req.body.endDateEdit ? req.body.endDateEdit : null;
    const isScheduledEdit = req.body.isScheduledEdit == "on" ? true : false;

    const currentReport = await reportModel.findById(reportIdEdit);

    let start = startDateEdit ? new Date(startDateEdit) : null;
    let end = endDateEdit ? new Date(endDateEdit) : null;

    const updatedReport = await reportModel.findByIdAndUpdate(reportIdEdit, {
      Type: reportTypeEdit,
      Title: titleEdit,
      StartDate: start,
      EndDate: end,
      IsScheduled: isScheduledEdit,
      ProjectID: projectIdEdit,
    });

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found" });
    } else res.status(200).json({ message: "Report Updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error updating Report", error });
  }
};

controller.deleteReport = async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const deletedReport = await reportModel.findByIdAndDelete(reportId);

    if (!deletedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ message: "Report deleted successfully", deletedReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete report", error });
  }
};

module.exports = controller;
