const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  dateApplied: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Applicant", applicantSchema);
