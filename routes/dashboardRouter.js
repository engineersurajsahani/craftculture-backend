const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Job = require("../models/Job");
const Company = require("../models/Company");
const Applicant = require("../models/Applicant");
const DonateMoney = require("../models/DonateMoney");
const DonateProduct = require("../models/DonateProduct");

// Get all dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    // Get basic counts
    const [
      userCount,
      productCount,
      orderCount,
      jobCount,
      companyCount,
      applicantCount,
      moneyDonationCount,
      productDonationCount,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Job.countDocuments(),
      Company.countDocuments(),
      Applicant.countDocuments(),
      DonateMoney.countDocuments(),
      DonateProduct.countDocuments(),
    ]);

    // Get revenue statistics
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
        },
      },
    ]);

    // Get product statistics
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          outOfStock: {
            $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
    ]);

    // Get donation statistics
    const moneyDonationStats = await DonateMoney.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          averageDonation: { $avg: "$amount" },
        },
      },
    ]);

    const productDonationStats = await DonateProduct.aggregate([
      {
        $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    // Get recent activities
    const recentOrders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(5)
      .select("username totalAmount status orderDate");

    const recentApplications = await Applicant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("companyId", "name")
      .populate("jobId", "title");

    res.json({
      counts: {
        users: userCount,
        products: productCount,
        orders: orderCount,
        jobs: jobCount,
        companies: companyCount,
        applicants: applicantCount,
        moneyDonations: moneyDonationCount,
        productDonations: productDonationCount,
      },
      orderStats: orderStats[0] || {
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
      },
      productStats: productStats[0] || {
        totalValue: 0,
        outOfStock: 0,
      },
      donationStats: {
        money: moneyDonationStats[0] || {
          totalAmount: 0,
          averageDonation: 0,
        },
        products: productDonationStats,
      },
      recentActivity: {
        orders: recentOrders,
        applications: recentApplications,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
});

// Get recent orders
router.get("/recent-orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(10)
      .select("username fullName totalAmount status orderDate");

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recent orders",
      error: error.message,
    });
  }
});

// Get recent applications
router.get("/recent-applications", async (req, res) => {
  try {
    const applications = await Applicant.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("companyId", "name")
      .populate("jobId", "title");

    res.json(applications);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching recent applications",
      error: error.message,
    });
  }
});

// Get donation statistics
router.get("/donation-stats", async (req, res) => {
  try {
    const moneyStats = await DonateMoney.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          averageDonation: { $avg: "$amount" },
          totalDonors: { $sum: 1 },
        },
      },
    ]);

    const productStats = await DonateProduct.aggregate([
      {
        $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
          donorCount: { $sum: 1 },
        },
      },
    ]);

    res.json({
      moneyDonations: moneyStats[0] || {
        totalAmount: 0,
        averageDonation: 0,
        totalDonors: 0,
      },
      productDonations: productStats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching donation statistics",
      error: error.message,
    });
  }
});

module.exports = router;
