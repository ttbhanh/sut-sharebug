const mongoose = require("mongoose");

const testRunSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Version: { type: String },
  Browser: { type: String },
  Description: { type: String },
  Status: {
    type: String,
    enum: [
      "Passed",
      "Untested",
      "Blocked",
      "Retest",
      "Failed",
      "Not Applicable",
      "In Progress",
      "Hold",
    ],
  },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
  CreatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  AssignTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ReleaseID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Release",
    required: true,
  },
  ProjectID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
});

const TestRun = mongoose.model("TestRun", testRunSchema);

module.exports = TestRun;
