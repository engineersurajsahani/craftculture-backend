const express = require("express");
const Company = require("../models/Company");
const router = express.Router();
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "your-secret-key";

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

// Input validation middleware
const validateCompanyInput = (req, res, next) => {
  const { name, description } = req.body;

  if (!name?.trim() || !description?.trim()) {
    return res.status(400).json({
      message: "Company name and description are required",
    });
  }

  next();
};

// Create Company
router.post("/", validateCompanyInput, async (req, res) => {
  try {
    const company = new Company(req.body);
    const savedCompany = await company.save();
    res.status(201).json({
      message: "Company created successfully",
      company: savedCompany,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating company",
      error: error.message,
    });
  }
});

// Get All Companies with optional search and pagination
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Company.countDocuments(query),
    ]);

    res.json({
      companies,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching companies",
      error: error.message,
    });
  }
});

// Get Company Count
router.get("/count", async (req, res) => {
  try {
    const count = await Company.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({
      message: "Error getting company count",
      error: error.message,
    });
  }
});

// Get Company By ID
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching company",
      error: error.message,
    });
  }
});

// Update Company
router.put("/:id", validateCompanyInput, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating company",
      error: error.message,
    });
  }
});

// Delete Company
router.delete("/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company deleted successfully",
      deletedCompany: company,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting company",
      error: error.message,
    });
  }
});

module.exports = router;
