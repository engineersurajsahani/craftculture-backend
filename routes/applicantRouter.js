const express = require("express");
const router = express.Router();
const Applicant = require("../models/Applicant");
const mongoose = require("mongoose");

// Input validation middleware
const validateApplicantInput = (req, res, next) => {
  const { name, email, phoneNumber, companyId, jobId } = req.body;

  if (!name?.trim() || !email?.trim() || !phoneNumber?.trim()) {
    return res.status(400).json({
      message: "Name, email, and phone number are required",
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  // Basic phone validation (allows different formats but requires minimum length)
  const phoneRegex = /^\+?[\d\s-()]{8,}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({
      message: "Invalid phone number format",
    });
  }

  next();
};

// Create a new applicant
router.post("/", validateApplicantInput, async (req, res) => {
  try {
    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(req.body.companyId) ||
      !mongoose.Types.ObjectId.isValid(req.body.jobId)
    ) {
      return res.status(400).json({
        message: "Invalid company ID or job ID format",
      });
    }

    const applicant = new Applicant({
      companyId: req.body.companyId,
      jobId: req.body.jobId,
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      phoneNumber: req.body.phoneNumber.trim(),
    });

    const savedApplicant = await applicant.save();

    const populatedApplicant = await Applicant.findById(savedApplicant._id)
      .populate("companyId", "name")
      .populate("jobId", "title description skills jobRole");

    res.status(201).json({
      message: "Application submitted successfully",
      applicant: populatedApplicant,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error submitting application",
      error: error.message,
    });
  }
});

// Get all applicants with filtering and sorting
router.get("/", async (req, res) => {
  try {
    const { company, job, search, sortBy = "-createdAt" } = req.query;

    let query = {};

    // Apply company filter
    if (company) {
      query.companyId = company;
    }

    // Apply job filter
    if (job) {
      query.jobId = job;
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const applicants = await Applicant.find(query)
      .populate("companyId", "name")
      .populate("jobId", "title description skills jobRole")
      .sort(sortBy);

    res.json({
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching applicants",
      error: error.message,
    });
  }
});

// Get applicants by company ID
router.get("/company/:companyId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({
        message: "Invalid company ID format",
      });
    }

    const applicants = await Applicant.find({ companyId: req.params.companyId })
      .populate("companyId", "name")
      .populate("jobId", "title description skills jobRole")
      .sort("-createdAt");

    res.json({
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching applicants",
      error: error.message,
    });
  }
});

// Get applicants by job ID
router.get("/job/:jobId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
      return res.status(400).json({
        message: "Invalid job ID format",
      });
    }

    const applicants = await Applicant.find({ jobId: req.params.jobId })
      .populate("companyId", "name")
      .populate("jobId", "title description skills jobRole")
      .sort("-createdAt");

    res.json({
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching applicants",
      error: error.message,
    });
  }
});

// Get a single applicant by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid applicant ID format",
      });
    }

    const applicant = await Applicant.findById(req.params.id)
      .populate("companyId", "name")
      .populate("jobId", "title description skills jobRole");

    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found",
      });
    }

    res.json(applicant);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching applicant",
      error: error.message,
    });
  }
});

// Delete an applicant
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid applicant ID format",
      });
    }

    const applicant = await Applicant.findByIdAndDelete(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found",
      });
    }

    res.json({
      message: "Application deleted successfully",
      deletedApplicant: applicant,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting application",
      error: error.message,
    });
  }
});

module.exports = router;
