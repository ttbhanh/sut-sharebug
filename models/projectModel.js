const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  ProjectImage: { type: String, default: "default-proj-image.png" },
  CreatedAt: { type: Date, default: Date.now },
  UpdatedAt: { type: Date, default: Date.now },
  CreatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

const projectModel = mongoose.model("Project", projectSchema);

module.exports = projectModel;
