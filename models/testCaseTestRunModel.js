const mongoose = require("mongoose");

const testCaseTestRunSchema = new mongoose.Schema({
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
  TestCaseID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestCase",
    required: true,
  },
  TestRunID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestRun",
    required: true,
  },
  IssueID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Issue",
    required: false,
  },
});

const TestCaseTestRun = mongoose.model(
  "TestCaseTestRun",
  testCaseTestRunSchema
);

module.exports = TestCaseTestRun;
