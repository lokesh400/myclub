const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  title: { type: String, required: true },
  description: { type: String },
  fields: [
    {
      label: { type: String, required: true },
      type: { type: String, enum: ["text", "email", "number", "date"], required: true },
      required: { type: Boolean, default: false }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.models.Form || mongoose.model("Form", formSchema);
