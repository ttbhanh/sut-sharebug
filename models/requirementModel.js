const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({
  Type: { type: String, required: true },
  Description: { type: String },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
  ProjectID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: false,
  },
  AssignTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  Creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: false,
  },
});

const Requirement = mongoose.model("Requirement", requirementSchema);

module.exports = Requirement;
