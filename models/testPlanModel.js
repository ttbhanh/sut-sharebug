const mongoose = require("mongoose");

const testPlanSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Description: { type: String },
  StartDate: { type: Date },
  EndDate: { type: Date },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
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

// Custom validation for EndDate > StartDate
testPlanSchema.pre("save", function (next) {
  if (this.StartDate && this.EndDate && this.EndDate <= this.StartDate) {
    const err = new Error("EndDate must be greater than StartDate");
    next(err);
  } else {
    next();
  }
});

const TestPlan = mongoose.model("TestPlan", testPlanSchema);

module.exports = TestPlan;
