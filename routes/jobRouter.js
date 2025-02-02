const express = require("express");
const Job = require("../models/Job");
const mongoose = require("mongoose");
const router = express.Router();

// Input validation middleware
const validateJobInput = (req, res, next) => {
  const { title, description, skills, jobRole, numberOfOpening } = req.body;

  if (
    !title?.trim() ||
    !description?.trim() ||
    !skills?.length ||
    !jobRole?.trim()
  ) {
    return res.status(400).json({
      message:
        "Required fields missing: title, description, skills, and jobRole are mandatory",
    });
  }

  if (numberOfOpening && (isNaN(numberOfOpening) || numberOfOpening < 1)) {
    return res.status(400).json({
      message: "Number of openings must be a positive number",
    });
  }

  next();
};

// Create Job
router.post("/", validateJobInput, async (req, res) => {
  try {
    const job = new Job(req.body);
    const savedJob = await job.save();
    const populatedJob = await Job.findById(savedJob._id).populate(
      "companyId",
      "name description image"
    );
    res.status(201).json({
      message: "Job created successfully",
      job: populatedJob,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating job",
      error: error.message,
    });
  }
});

// Get all Jobs
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("companyId", "name description image")
      .sort({ createdAt: -1 });
    res.json({
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching jobs",
      error: error.message,
    });
  }
});

// Get Jobs for Company with enhanced error handling
router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const jobs = await Job.find({ companyId })
      .populate("companyId", "name description image")
      .sort({ createdAt: -1 });

    res.json({
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching company jobs",
      error: error.message,
    });
  }
});

// Get a single Job by ID
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "companyId",
      "name description image"
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching job",
      error: error.message,
    });
  }
});

// Update Job
router.put("/:id", validateJobInput, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("companyId", "name description image");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating job",
      error: error.message,
    });
  }
});

// Delete Job
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID format" });
    }

    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job deleted successfully",
      deletedJob: job,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting job",
      error: error.message,
    });
  }
});

module.exports = router;
