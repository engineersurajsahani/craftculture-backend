const express = require("express");
const router = express.Router();
const DonateMoney = require("../models/DonateMoney");
const mongoose = require("mongoose");

// Input validation middleware
const validateDonationInput = (req, res, next) => {
  const { name, phone, amount } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({
      message: "Name and phone number are required",
    });
  }

  // Basic phone validation (allows different formats but requires minimum length)
  const phoneRegex = /^\+?[\d\s-()]{8,}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Invalid phone number format",
    });
  }

  // Validate amount for money donations
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      message: "Amount must be a positive number",
    });
  }

  next();
};

// Create a new donation
router.post("/donate", validateDonationInput, async (req, res) => {
  try {
    const { name, phone, amount } = req.body;
    const newDonation = new DonateMoney({
      name: name.trim(),
      phone: phone.trim(),
      amount: Math.abs(amount),
    });

    await newDonation.save();

    res.status(201).json({
      message: "Donation received successfully!",
      donation: newDonation,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error processing donation",
      error: error.message,
    });
  }
});

// Get all donations with filtering and sorting
router.get("/donations", async (req, res) => {
  try {
    const { search, sortBy = "-createdAt", minAmount, maxAmount } = req.query;

    let query = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Apply amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    const donations = await DonateMoney.find(query).sort(sortBy);

    const total = await DonateMoney.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      count: donations.length,
      totalAmount: total[0]?.total || 0,
      donations,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching donations",
      error: error.message,
    });
  }
});

// Get donation statistics
router.get("/statistics", async (req, res) => {
  try {
    const stats = await DonateMoney.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          averageAmount: { $avg: "$amount" },
          maxAmount: { $max: "$amount" },
          totalDonors: { $sum: 1 },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalAmount: 0,
        averageAmount: 0,
        maxAmount: 0,
        totalDonors: 0,
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Error fetching donation statistics",
      error: error.message,
    });
  }
});

// Get a specific donation by ID
router.get("/donation/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid donation ID format" });
    }

    const donation = await DonateMoney.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    res.json(donation);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching donation",
      error: error.message,
    });
  }
});

// Delete a donation by ID
router.delete("/donation/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid donation ID format" });
    }

    const deletedDonation = await DonateMoney.findByIdAndDelete(req.params.id);

    if (!deletedDonation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    res.json({
      message: "Donation record deleted successfully",
      deletedDonation,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting donation",
      error: error.message,
    });
  }
});

module.exports = router;
