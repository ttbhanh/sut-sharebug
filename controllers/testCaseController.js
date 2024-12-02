"use strict";

const controller = {};
const csv = require("csv-parser");
const path = require("path");
const fs = require("fs");
const detect = require("detect-csv");
const ObjectsToCsv = require("objects-to-csv");
const moduleModel = require("../models/moduleModel");
const testCaseModel = require("../models/testCaseModel");
const requirementModel = require("../models/requirementModel");
const releaseModel = require("../models/releaseModel");
const testPlanModel = require("../models/testPlanModel");
const testRunModel = require("../models/testRunModel");
const tagModel = require("../models/tagModel");
const userModel = require("../models/userModel");
const participationModel = require("../models/participationModel");

const { sanitizeInput } = require("./shared");

controller.init = (req, res, next) => {
  res.locals.scripts = `
    <script src="/js/test-cases.js"></script>
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
        n5: "active border-danger",
        user,
        project: projectData,
        messages: req.flash(),
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

    // Lấy tất cả module của project
    let modules = await moduleModel.find({
      ProjectID: projectId,
      Name: { $regex: moduleKeyword, $options: "i" },
    });

    const moduleIds = modules.map((module) => module._id);

    // Lấy tất cả test case thuộc các module của project
    const allTestCases = await testCaseModel.find({
      ModuleID: { $in: moduleIds },
    });

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

    // Pagination
    let total = testCases.length;
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
        `/project/${projectId}/test-case?${new URLSearchParams(
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

    const allModules = await moduleModel.find({ ProjectID: projectId });
    const allReleases = await releaseModel.find({ ProjectID: projectId });
    const releaseIds = allReleases.map((r) => r._id);
    const allTestPlans = await testPlanModel.find({
      ReleaseID: { $in: releaseIds },
    });

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
      TotalTestCase: testCases.length,
      ModuleID: moduleId,
      moduleName: moduleName,
      testCaseCount: testCaseCount,
      testCaseTotal: allTestCases.length,
      TestCases: testCases.slice(skip, skip + limit),
      Modules: JSON.stringify(modulesWithTestCaseCount),
      AllModules: allModules,
      AllTestPlan: allTestPlans,
      sortField,
      sortOrder,
    };

    // Gọi view và truyền dữ liệu vào
    res.render("test-case", {
      title: "ShareBug - Test Cases",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/test-runs-results-styles.css" />`,
      d2: "selected-menu-item",
      n5: "active border-danger",
      user,
      project: projectData,
      // modules: JSON.stringify(modulesWithTestCaseCount)

      messages: req.flash(),
    });
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showDetail = async (req, res) => {
  try {
    const testCaseId = req.params.testCaseId;
    const testCaseDetail = await testCaseModel.findOne({ _id: testCaseId });

    const moduleDetail = await moduleModel.findOne({
      _id: testCaseDetail.ModuleID,
    });
    const tags = await tagModel.find({ TestCaseID: testCaseId });
    const user = await userModel.findById(testCaseDetail.CreatedBy);
    testCaseDetail.Module = moduleDetail;
    testCaseDetail.Tags = tags;
    testCaseDetail.Creator = user;
    return res.json(testCaseDetail);
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

controller.showAddBDD = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
    };

    // Gọi các view cần thiết và truyền dữ liệu vào
    res.render("test-case-add-case-BDD", {
      title: "ShareBug - Add Case BDD",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/dashboard-styles.css" />
                    <link rel="stylesheet" href="/css/test-cases-BDD-styles.css" />`,
      d2: "selected-menu-item",
      n5: "active border-danger",
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showImport = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
    };

    // Gọi các view cần thiết và truyền dữ liệu vào
    res.render("test-case-import", {
      title: "ShareBug - Add Case BDD",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/dashboard-styles.css" />
                    <link rel="stylesheet" href="/css/requirement-styles.css" />`,
      d2: "selected-menu-item",
      n5: "active border-danger",
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showImportCategory = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Gói dữ liệu trong projectData
    const projectData = {
      ProjectID: projectId,
    };

    // Gọi các view cần thiết và truyền dữ liệu vào
    res.render("test-case-import-category", {
      title: "ShareBug - Add Case BDD",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/dashboard-styles.css" />
                    <link rel="stylesheet" href="/css/requirement-styles.css" />`,
      d2: "selected-menu-item",
      n5: "active border-danger",
      project: projectData,
    });
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.addTestCaseStep = async (req, res) => {
  try {
    const {
      nameModule: nameModuleBody,
      nameTestCase: nameTestCaseBody,
      nameTestPlan: nameTestPlanBody,
      descriptionTestCase: descriptionTestCaseBody,
      typeTestCase: typeTestCaseBody,
      priorityTestCase: priorityTestCaseBody,
      preconditionTestCase: preconditionTestCaseBody,
    } = req.body;

    // Sanitize inputs
    const nameModule = sanitizeInput(nameModuleBody);
    const nameTestCase = sanitizeInput(nameTestCaseBody);
    const nameTestPlan = sanitizeInput(nameTestPlanBody);
    const descriptionTestCase = sanitizeInput(descriptionTestCaseBody);
    const typeTestCase = sanitizeInput(typeTestCaseBody);
    const priorityTestCase = sanitizeInput(priorityTestCaseBody);
    const preconditionTestCase = sanitizeInput(preconditionTestCaseBody);

    const testPlan = await testPlanModel.findOne({ Name: nameTestPlan });
    if (!testPlan) {
      return res.status(404).json({ message: "Test Plan not found" });
    }

    // Tìm Module dựa trên tên
    const module = await moduleModel.findOne({ Name: nameModule });
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    const newTestCase = await testCaseModel.create({
      Title: nameTestCase,
      Priority: priorityTestCase || null,
      Precondition: preconditionTestCase || null,
      Description: descriptionTestCase || null,
      ModuleID: module._id,
      TestPlanID: testPlan._id,
    });

    if (!newTestCase) {
      return res.status(404).json({ message: "Test Case not found" });
    } else
      res.status(200).json({
        message: "Test Case Added successfully!",
        TestCaseID: newTestCase._id,
      });
  } catch (error) {
    res.status(500).json({ message: "Error adding Test Case", error });
  }
};

controller.editTestCase = async (req, res) => {
  try {
    const {
      idEdit,
      nameModuleEdit: nameModuleEditBody,
      nameTestCaseEdit: nameTestCaseEditBody,
      descriptionTestCaseEdit: descriptionTestCaseEditBody,
      priorityTestCaseEdit: priorityTestCaseEditBody,
      preconditionTestCaseEdit: preconditionTestCaseEditBody,
    } = req.body;

    // Sanitize inputs
    const nameModuleEdit = sanitizeInput(nameModuleEditBody);
    const nameTestCaseEdit = sanitizeInput(nameTestCaseEditBody);
    const descriptionTestCaseEdit = sanitizeInput(descriptionTestCaseEditBody);
    const priorityTestCaseEdit = sanitizeInput(priorityTestCaseEditBody);
    const preconditionTestCaseEdit = sanitizeInput(
      preconditionTestCaseEditBody
    );

    const module = await moduleModel.findOne({ Name: nameModuleEdit });
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    const updatedTestCase = await testCaseModel.findByIdAndUpdate(idEdit, {
      Title: nameTestCaseEdit,
      Priority: priorityTestCaseEdit || null,
      Precondition: preconditionTestCaseEdit || null,
      Description: descriptionTestCaseEdit || null,
      ModuleID: module._id,
      UpdatedAt: Date.now(),
    });

    if (!updatedTestCase) {
      return res.status(404).json({ message: "Test Case not found" });
    } else res.status(200).json({ message: "Test Case Updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error updating Test Case", error });
  }
};

controller.deleteTestCase = async (req, res) => {
  try {
    const testCaseId = req.params.testCaseId;
    const deletedTestCase = await testCaseModel.findByIdAndDelete(testCaseId);

    if (!deletedTestCase) {
      return res.status(404).json({ message: "Test case not found" });
    }

    res.json({ message: "Test case deleted successfully", deletedTestCase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete test case", error });
  }
};

controller.exportTestCase = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    let modules = await moduleModel.find({ ProjectID: projectId });
    const moduleIds = modules.map((module) => module._id);

    const testCases = await testCaseModel.find({
      ModuleID: { $in: moduleIds },
    });

    // Chuyển đổi dữ liệu thành mảng các đối tượng chỉ chứa các thuộc tính cần xuất
    const csvData = testCases.map((testCase) => ({
      Title: testCase.Title,
      Priority: testCase.Priority,
      Precondition: testCase.Precondition,
      Description: testCase.Description,
      CreatedAt: new Date(testCase.CreatedAt).toISOString().split("T")[0],
      UpdatedAt: new Date(testCase.UpdatedAt).toISOString().split("T")[0],
      ModuleID: testCase.ModuleID.toString(), // Convert ObjectId to string
    }));

    // Tạo đối tượng ObjectsToCsv với mảng dữ liệu đã được chuyển đổi
    const csv = new ObjectsToCsv(csvData);

    // Đường dẫn và tên file CSV để lưu trữ
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `testCaseExport-${uniqueSuffix}`;
    const filePath = path.join(__dirname, `../public/files/${fileName}.csv`);

    // Ghi dữ liệu xuống file CSV
    await csv.toDisk(filePath);

    // Chuẩn bị phản hồi để tải xuống file CSV
    res.download(filePath, "test_cases_export.csv", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Internal server error");
      } else {
        // Optionally delete the file after download
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error("Error exporting requirements:", error);
    res.status(500).send("Internal server error");
  }
};

controller.importTestCase = async (req, res) => {
  const projectId = req.params.projectId;

  try {
    // Check if a file has been uploaded
    if (!req.file) {
      return res.status(400).send("No files were uploaded.");
    }

    // Check if the file is a CSV
    if (req.file.mimetype !== "text/csv") {
      return res.status(400).send("Select CSV files only.");
    }

    // Path to the uploaded CSV file
    const filePath = req.file.path;

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const delimiter = detect(fileContent).delimiter;

    // Read data from the CSV file
    let testCases = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator: delimiter }))
      .on("data", (row) => {
        // Create a TestCase object from the CSV data
        const newTestCase = new testCaseModel({
          Title: row.Title,
          Priority: row.Priority,
          Precondition: row.Precondition || null,
          Description: row.Description || null,
          ModuleID: row.ModuleID || "666017adf902bdf00016abc0",
          TestPlanID: row.TestPlanID || "66601d7f32c5408430429d19",
        });
        testCases.push(newTestCase);
      })
      .on("end", async () => {
        // Save the TestCase objects to MongoDB
        try {
          await testCaseModel.insertMany(testCases);
          res.redirect(`/project/${projectId}/test-case`);
        } catch (error) {
          console.error("Error importing test cases:", error);
          res.status(500).send("Internal server error");
        }
      });
  } catch (error) {
    console.error("Error in importTestCase:", error);
    res.status(500).send("Internal server error");
  }
};

controller.downloadSampleTestCase = async (req, res) => {
  try {
    // Đường dẫn và tên file CSV để lưu trữ
    const filePath = path.join(
      __dirname,
      "../public/files/testImportTestCase.csv"
    );

    // Chuẩn bị phản hồi để tải xuống file CSV
    res.download(filePath, "sample_test_cases.csv", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Internal server error");
      }
    });
  } catch (error) {
    console.error("Error exporting issues:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = controller;
