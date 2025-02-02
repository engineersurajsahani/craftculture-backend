const express = require("express");
const router = express.Router();
const DonateProduct = require("../models/DonateProduct");
const mongoose = require("mongoose");

// Input validation middleware
const validateProductDonationInput = (req, res, next) => {
  const { name, phone, category, quantity } = req.body;

  if (!name?.trim() || !phone?.trim() || !category) {
    return res.status(400).json({
      message: "Name, phone number, and category are required",
    });
  }

  // Basic phone validation
  const phoneRegex = /^\+?[\d\s-()]{8,}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Invalid phone number format",
    });
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: "Quantity must be a positive integer",
    });
  }

  // Validate category against enum values
  const validCategories = [
    "Frames",
    "Wall Hanging",
    "Bag",
    "Pen Stand",
    "Jewellery",
    "Diyas",
    "Bottle Art",
  ];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      message: "Invalid product category",
      validCategories,
    });
  }

  next();
};

// Create a new product donation
router.post("/donate", validateProductDonationInput, async (req, res) => {
  try {
    const { name, phone, category, quantity } = req.body;
    const newDonation = new DonateProduct({
      name: name.trim(),
      phone: phone.trim(),
      category,
      quantity: Math.abs(quantity),
    });

    await newDonation.save();

    res.status(201).json({
      message: "Product donation received successfully!",
      donation: newDonation,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error processing product donation",
      error: error.message,
    });
  }
});

// Get all product donations with filtering and sorting
router.get("/donations", async (req, res) => {
  try {
    const { search, category, sortBy = "-createdAt", minQuantity } = req.query;

    let query = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Apply category filter
    if (category) {
      query.category = category;
    }

    // Apply minimum quantity filter
    if (minQuantity) {
      query.quantity = { $gte: Number(minQuantity) };
    }

    const donations = await DonateProduct.find(query).sort(sortBy);

    // Get category statistics
    const categoryStats = await DonateProduct.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      count: donations.length,
      categoryStats,
      donations,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product donations",
      error: error.message,
    });
  }
});

// Get product donation statistics
router.get("/statistics", async (req, res) => {
  try {
    const stats = await DonateProduct.aggregate([
      {
        $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
          averageQuantity: { $avg: "$quantity" },
          maxQuantity: { $max: "$quantity" },
          totalDonors: { $sum: 1 },
        },
      },
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product donation statistics",
      error: error.message,
    });
  }
});

// Get a specific product donation by ID
router.get("/donation/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid donation ID format" });
    }

    const donation = await DonateProduct.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: "Product donation not found" });
    }

    res.json(donation);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product donation",
      error: error.message,
    });
  }
});

// Delete a product donation by ID
router.delete("/donation/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid donation ID format" });
    }

    const deletedDonation = await DonateProduct.findByIdAndDelete(
      req.params.id
    );

    if (!deletedDonation) {
      return res.status(404).json({ message: "Product donation not found" });
    }

    res.json({
      message: "Product donation record deleted successfully",
      deletedDonation,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product donation",
      error: error.message,
    });
  }
});

module.exports = router;
