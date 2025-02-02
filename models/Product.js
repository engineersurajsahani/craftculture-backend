const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  status: {
    type: String,
    enum: ["Available", "Not Available"],
    required: true,
  },
  category: {
    type: String,
    enum: [
      "Frames",
      "Wall Hanging",
      "Bag",
      "Pen Stand",
      "Jewellery",
      "Diyas",
      "Bottle Art",
    ],
    required: true,
  },
  offer: { type: Number, default: 0 },
});

module.exports = mongoose.model("Product", productSchema);
