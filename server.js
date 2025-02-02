const express = require("express");
const cors = require("cors");
const db = require("./db");
const userRouter = require("./routes/userRouter");
const productRouter = require("./routes/productRouter");
const orderRouter = require("./routes/orderRouter");
const companyRouter = require("./routes/companyRouter");
const jobRouter = require("./routes/jobRouter");
const donateMoneyRouter = require("./routes/donateMoneyRouter");
const donateProductRouter = require("./routes/donateProductRouter");
const applicantRouter = require("./routes/applicantRouter");
const dashboardRouter = require("./routes/dashboardRouter");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
  })
);

// Routes
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/companies", companyRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/applicants", applicantRouter);
app.use("/api/donate-money", donateMoneyRouter);
app.use("/api/donate-product", donateProductRouter);
app.use("/api/dashboard", dashboardRouter);

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
