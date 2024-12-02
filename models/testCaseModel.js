const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  Priority: { type: String, enum: ["Critical", "High", "Medium", "Low"] },
  Precondition: { type: String },
  Description: { type: String },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
  ModuleID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
  },
  ProjectID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
});

const TestCase = mongoose.model("TestCase", testCaseSchema);

module.exports = TestCase;
