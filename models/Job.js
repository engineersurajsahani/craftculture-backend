const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  companyId: { type: String, ref: "Company", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  idealFor: { type: String },
  skills: { type: [String], required: true },
  jobRole: { type: String, required: true },
  numberOfOpening: { type: Number, default: 1 },
});

module.exports = mongoose.model("Job", jobSchema);
