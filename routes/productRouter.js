const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Input validation middleware
const validateProductInput = (req, res, next) => {
  const { name, price, quantity, category, status } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      message: "Product name is required",
    });
  }

  if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({
      message: "Price must be a positive number",
    });
  }

  if (typeof quantity !== "number" || quantity < 0) {
    return res.status(400).json({
      message: "Quantity must be a non-negative number",
    });
  }

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

  if (!["Available", "Not Available"].includes(status)) {
    return res.status(400).json({
      message: "Invalid product status",
    });
  }

  if (
    req.body.offer &&
    (typeof req.body.offer !== "number" ||
      req.body.offer < 0 ||
      req.body.offer > 100)
  ) {
    return res.status(400).json({
      message: "Offer must be a number between 0 and 100",
    });
  }

  next();
};

// Create Product
router.post("/", validateProductInput, async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      name: req.body.name.trim(),
      offer: req.body.offer || 0,
    });

    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating product",
      error: error.message,
    });
  }
});

// Get All Products with filtering and sorting
router.get("/", async (req, res) => {
  try {
    const {
      category,
      status,
      minPrice,
      maxPrice,
      inStock,
      search,
      sortBy = "name",
      sortOrder = "asc",
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    if (inStock === "true") {
      query.quantity = { $gt: 0 };
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit),
      // .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    // Get category statistics
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          averagePrice: { $avg: "$price" },
          inStock: {
            $sum: { $cond: [{ $gt: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      products,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      categoryStats,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
});

// Get Product Statistics
router.get("/statistics", async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          averagePrice: { $avg: "$price" },
          outOfStock: {
            $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
    ]);

    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
    ]);

    res.json({
      overview: stats[0] || {
        totalProducts: 0,
        totalValue: 0,
        averagePrice: 0,
        outOfStock: 0,
      },
      categoryDistribution,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product statistics",
      error: error.message,
    });
  }
});

// Get Product By ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
});

// Update Product
router.put("/:id", validateProductInput, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        name: req.body.name.trim(),
        offer: req.body.offer || 0,
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating product",
      error: error.message,
    });
  }
});

// Delete Product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product has any pending orders
    // This would require access to the Order model and checking for pending orders
    // Add this functionality if needed

    await product.remove();

    res.json({
      message: "Product deleted successfully",
      deletedProduct: product,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message,
    });
  }
});

// Update Product Stock
router.patch("/:id/stock", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity value" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.quantity = quantity;
    product.status = quantity > 0 ? "Available" : "Not Available";

    await product.save();

    res.json({
      message: "Product stock updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating product stock",
      error: error.message,
    });
  }
});

module.exports = router;
