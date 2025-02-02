const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const SECRET = "engineersurajsahani";

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).send({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send({ message: "Invalid token" });
  }
};

// Admin Authorization Middleware
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.userRole !== "ADMIN") {
      return res.status(403).send({ message: "Access denied. Admin only." });
    }
    next();
  } catch (error) {
    res.status(403).send({ message: "Access denied" });
  }
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).send({ message: "Username is already taken" });
      }
      if (existingUser.email === email) {
        return res.status(400).send({ message: "Email is already registered" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    // Check if password is valid
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(403).send({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, userRole: user.userRole },
      SECRET,
      { expiresIn: "7d" }
    );
    res.send({
      token,
      username: user.username,
      userRole: user.userRole,
      email: user.email,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// User Profile
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).send({ message: "User not found" });

    res.send(user);
  } catch (error) {
    res.status(401).send({ message: "Unauthorized" });
  }
});

// Get all users (Admin only)
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get user count (Admin only)
router.get("/count", authenticateToken, isAdmin, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.send(count.toString());
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Get user by ID (Admin only)
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Update user (Admin only)
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };

    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Check if username or email is being updated
    if (updates.username || updates.email) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [{ username: updates.username }, { email: updates.email }],
      });

      if (existingUser) {
        if (existingUser.username === updates.username) {
          return res.status(400).send({ message: "Username is already taken" });
        }
        if (existingUser.email === updates.email) {
          return res
            .status(400)
            .send({ message: "Email is already registered" });
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Delete user (Admin only)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Prevent deletion of the last admin account
    if (req.params.id === req.user.id) {
      const adminCount = await User.countDocuments({ userRole: "ADMIN" });
      if (adminCount <= 1) {
        return res.status(400).send({
          message: "Cannot delete the last admin account",
        });
      }
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send({ message: "User not found" });
    res.send({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Change password (for users)
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).send({ message: "Current password is incorrect" });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.send({ message: "Password updated successfully" });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;
