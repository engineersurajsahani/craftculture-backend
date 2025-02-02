const mongoose = require("mongoose");

const donateProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
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
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DonateProduct", donateProductSchema);
