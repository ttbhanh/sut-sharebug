"use strict";

const controller = {};
const csv = require("csv-parser");
const path = require("path");
const fs = require("fs");
const ObjectsToCsv = require("objects-to-csv");
const detect = require("detect-csv");
const projectModel = require("../models/projectModel");
const releaseModel = require("../models/releaseModel");
const requirementModel = require("../models/requirementModel");
const participationModel = require("../models/participationModel");
const userModel = require("../models/userModel");

const { sanitizeInput } = require("./shared");

controller.init = (req, res, next) => {
  res.locals.scripts = `
  <script src="/js/requirement.js"></script>
  `;
  next();
};

controller.show = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    // Fetch the project details
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).render("error", { message: "Project not found" });
    }

    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

    // Kiểm tra quyền truy cập của user
    const canRead =
      user.IsAdmin ||
      participation ||
      project.Creater.toString() == user._id.toString();
    if (!canRead) {
      const projectData = {
        ProjectID: projectId, // Thêm ProjectID
      };
      return res.render("not-have-access", {
        title: "ShareBug - Not Have Access",
        header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                        <link rel="stylesheet" href="/css/not-have-access.css" />`,
        d2: "selected-menu-item",
        n2: "active border-danger",
        user,
        project: projectData,
        messages: req.flash(),
      });
    }

    // Lấy RequirementTypes từ query params và tách thành danh sách
    const requirementTypesQuery = req.query.RequirementTypes;
    const selectedRequirementTypes = requirementTypesQuery
      ? requirementTypesQuery.split(",")
      : [];
    // Lấy requirementKeyword
    let requirementKeyword = sanitizeInput(req.query.requirementKeyword) || "";
    let requirementTypeKeyword =
      sanitizeInput(req.query.requirementTypeKeyword) || "";
    // Lấy assignToKeyword
    let assignToKeyword = sanitizeInput(req.query.assignedTo) || "";

    // Lấy các tham số sắp xếp từ query params
    const sortField = req.query.sortField || "created-date";
    const sortOrder = req.query.sortOrder || "desc";
    const sortCriteria = {};
    if (sortField === "created-date") {
      sortCriteria.CreatedAt = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "title") {
      sortCriteria.Description = sortOrder === "desc" ? -1 : 1;
    } else if (sortField === "case-code") {
      sortCriteria._id = sortOrder === "desc" ? -1 : 1;
    }

    const options = {
      ProjectID: projectId,
    };
    // Lấy tất cả requirements có ProjectID tương ứng
    const allRequirements = await requirementModel.find(options);

    // Lấy tất cả các bản ghi từ bảng Participation có ProjectID tương ứng
    const participations = await participationModel.find({
      ProjectID: projectId,
    });

    // Lấy danh sách các UserID từ participations
    const userIds = participations.map((participation) => participation.UserID);

    // Lấy thông tin chi tiết của các User thông qua UserID
    const users = await userModel.find({ _id: { $in: userIds } });

    // Lọc danh sách Users theo assignToKeyword
    let filteredUserIds = [];
    if (assignToKeyword.trim() != "") {
      const filteredUsers = users.filter((user) =>
        user.Name.toLowerCase().includes(assignToKeyword.toLowerCase())
      );
      // Lấy ra các _id của Users thỏa mãn điều kiện
      filteredUserIds = filteredUsers.map((user) => user._id);
    }

    if (filteredUserIds.length) {
      options.AssignTo = { $in: filteredUserIds };
    }

    // Lọc các requirements theo RequirementTypes được chọn
    if (selectedRequirementTypes.length > 0) {
      options.Type = { $in: selectedRequirementTypes };
    }

    // Lọc các requirements theo Requirement keyword được chọn
    if (requirementKeyword.trim() != "") {
      options.Description = { $regex: requirementKeyword, $options: "i" };
    }

    // Join requirement with users
    let requirements = await requirementModel.find(options).sort(sortCriteria);
    requirements = requirements.map((requirement) => {
      const user = users.find((user) => user._id.equals(requirement.AssignTo));
      return {
        ...requirement.toObject(),
        AssigneeName: user ? user.Name : "Unknown User",
        AssigneeEmail: user ? user.Email : "Unknown Email",
      };
    });

    // Lấy tất cả requirementTypes
    let requirementTypes = [
      ...new Set(allRequirements.map((requirement) => requirement.Type)),
    ];
    if (requirementTypeKeyword) {
      requirementTypes = requirementTypes.filter((type) =>
        type.toLowerCase().includes(requirementTypeKeyword.toLowerCase())
      );
    }
    // Pagination
    let total = requirements.length;
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
        `/project/${projectId}/requirement?${new URLSearchParams(
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

    // Prepare the data to be sent to the view
    const projectData = {
      ProjectID: project._id,
      Users: users,
      requirementCount: requirements.length,
      requirementTotal: allRequirements.length,
      Requirements: requirements.slice(skip, skip + limit),
      RequirementTypes: requirementTypes,
      sortField,
      sortOrder,
    };

    // Only get the requirements for the current page
    res.locals.pagination = {
      page: page,
      limit: limit,
      showing: projectData.Requirements.length,
      totalRows: requirements.length,
      queryParams: req.query,
    };

    res.render("requirement", {
      title: "ShareBug - Requirement",
      header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                    <link rel="stylesheet" href="/css/dashboard-styles.css" />
                    <link rel="stylesheet" href="/css/requirement-styles.css" />`,
      d2: "selected-menu-item",
      n2: "active border-danger",
      user,
      project: projectData,

      messages: req.flash(),
    });
  } catch (error) {
    console.error("Error fetching requirements:", error);
    res.status(500).send("Internal Server Error");
  }
};

controller.showImport = async (req, res) => {
  const projectId = req.params.projectId;

  if (!projectId) {
    return res.status(404).render("error", { message: "Project not found" });
  }

  const user = req.user;

  const projectData = {
    ProjectID: projectId,
  };

  res.render("requirement-import", {
    title: "ShareBug - Requirement Import",
    header: `<link rel="stylesheet" href="/css/shared-styles.css" />
                <link rel="stylesheet" href="/css/dashboard-styles.css" />
                <link rel="stylesheet" href="/css/requirement-styles.css" />`,
    d2: "selected-menu-item",
    n2: "active border-danger",
    project: projectData,
    user,
  });
};

controller.addRequirement = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { type: typeBody, description: descriptionBody } = req.body;

    // Sanitize each input
    const type = sanitizeInput(typeBody);
    const description = sanitizeInput(descriptionBody);

    const user = req.user;
    const newRequirement = await requirementModel.create({
      Type: type,
      Description: description || null,
      ProjectID: projectId,
      Creator: user._id,
    });

    res.redirect(`/project/${projectId}/requirement`);
  } catch (error) {
    res.status(500).json({ message: "Error creating Requirement", error });
  }
};

controller.editRequirement = async (req, res) => {
  try {
    const {
      typeEdit: typeEditBody,
      descriptionEdit: descriptionEditBody,
      assignToEdit: assignToEditBody,
      idEdit,
    } = req.body;

    // Sanitize each input
    const typeEdit = sanitizeInput(typeEditBody);
    const descriptionEdit = sanitizeInput(descriptionEditBody);
    const assignToEdit = sanitizeInput(assignToEditBody);

    // Kiểm tra requirement tồn tại
    const currentRequirement = await requirementModel.findById(idEdit);
    if (!currentRequirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    // Kiểm tra quyền truy cập của user
    const projectId = currentRequirement.ProjectID;
    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

    const canEdit =
      user.IsAdmin ||
      (participation && participation.Role == "Manager") ||
      (currentRequirement.Creator &&
        currentRequirement.Creator.toString() == user._id.toString());

    if (!canEdit) {
      return res
        .status(403)
        .json({ message: "You dont have permission to edit this requirement" });
    }

    const typeChanged = currentRequirement.Type !== typeEdit;
    const updatedRequirement = await requirementModel.findByIdAndUpdate(
      idEdit,
      {
        Type: typeEdit,
        Description: descriptionEdit || null,
        UpdatedAt: Date.now(),
        AssignTo: assignToEdit || null,
      }
    );

    res.status(200).json({
      message: "Requirement Updated successfully!",
      typeChanged: typeChanged,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating Requirement", error });
  }
};

controller.deleteRequirement = async (req, res) => {
  try {
    const requirementId = req.params.requirementId;

    // Kiểm tra requirement tồn tại
    const currentRequirement = await requirementModel.findById(requirementId);
    if (!currentRequirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    // Kiểm tra quyền truy cập của user
    const projectId = currentRequirement.ProjectID;
    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

    const canDelete =
      user.IsAdmin ||
      (participation && participation.Role == "Manager") ||
      (currentRequirement.Creator &&
        currentRequirement.Creator.toString() == user._id.toString());

    if (!canDelete) {
      return res.status(403).json({
        message: "You dont have permission to delete this requirement",
      });
    }

    const deletedRequirement = await requirementModel.findByIdAndDelete(
      requirementId
    );

    return res.json({
      message: "Requirement deleted successfully",
      deletedRequirement,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete requirement", error });
  }
};

controller.importRequirement = async (req, res) => {
  const projectId = req.params.projectId;

  try {
    // Fetch the project details
    const project = await projectModel.findById(projectId);

    if (!project) {
      return res.status(404).render("error", { message: "Project not found" });
    }

    // Lấy thông tin user
    const user = req.user;
    const participation = await participationModel.findOne({
      UserID: user._id,
      ProjectID: projectId,
    });

    // Kiểm tra quyền truy cập của user
    const canImport =
      user.IsAdmin ||
      participation ||
      project.Creater.toString() == user._id.toString();
    if (!canImport) {
      return res.status(403).render("error", {
        message: "You dont have permission to import requirements",
      });
    }

    // Kiểm tra xem file đã được tải lên chưa
    if (!req.file) {
      return res.status(400).send("No files were uploaded.");
    }

    // Kiểm tra xem file có phải là CSV không
    if (req.file.mimetype !== "text/csv") {
      return res.status(400).send("Select CSV files only.");
    }

    // Đường dẫn đến file CSV đã tải lên
    const filePath = req.file.path;

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const delimiter = detect(fileContent).delimiter;

    // Đọc dữ liệu từ file CSV
    let requirements = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator: delimiter }))
      .on("data", (row) => {
        // Tạo đối tượng Requirement từ dữ liệu trong file CSV
        const newRequirement = new requirementModel({
          Type: row.Type,
          Description: row.Description,
          ProjectID: projectId,
          AssignTo: row.AssignTo || null, // Giả sử đang có thông tin user từ req.user
          Creator: user._id,
        });
        requirements.push(newRequirement);
      })
      .on("end", async () => {
        // Lưu các đối tượng Requirement vào MongoDB
        try {
          const createdRequirements = await requirementModel.insertMany(
            requirements
          );
          res.redirect(`/project/${projectId}/requirement`);
        } catch (error) {
          console.error("Error importing requirements:", error);
          res.status(500).send("Internal server error");
        }
      });
  } catch (error) {
    console.error("Error in importRequirement:", error);
    res.status(500).send("Internal server error");
  }
};

controller.exportRequirement = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Fetch the project details
    const project = await projectModel.findById(projectId);
    if (!project) {
      return res.status(404).render("error", { message: "Project not found" });
    }

    const requirements = await requirementModel.find({
      ProjectID: projectId,
    });

    // Chuyển đổi dữ liệu thành mảng các đối tượng chỉ chứa các thuộc tính cần xuất
    const csvData = requirements.map((req) => ({
      Type: req.Type,
      Description: req.Description,
      AssignTo: req.AssignTo ? req.AssignTo.toString() : "", // Chuyển ObjectId sang chuỗi
    }));

    // Tạo đối tượng ObjectsToCsv với mảng dữ liệu đã được chuyển đổi
    const csv = new ObjectsToCsv(csvData);

    // Đường dẫn và tên file CSV để lưu trữ
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `requirementFileExport-${uniqueSuffix}`;
    const filePath = path.join(__dirname, `../public/files/${fileName}.csv`);

    // Ghi dữ liệu xuống file CSV
    await csv.toDisk(filePath);

    // Chuẩn bị phản hồi để tải xuống file CSV
    res.download(filePath, "requirements_export.csv", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Internal server error");
      } else {
        // Xóa file sau khi tải xuống thành công (tùy chọn)
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error("Error exporting requirements:", error);
    res.status(500).send("Internal server error");
  }
};

controller.downloadSampleRequirement = async (req, res) => {
  try {
    // Đường dẫn và tên file CSV để lưu trữ
    const filePath = path.join(
      __dirname,
      "../public/files/testImportRequirement.csv"
    );

    // Chuẩn bị phản hồi để tải xuống file CSV
    res.download(filePath, "sample_requirements.csv", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Internal server error");
      }
    });
  } catch (error) {
    console.error("Error exporting requirements:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = controller;
