const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  data: { type: Object, required: true },
  attendance: { type: Boolean, default: false } // <-- add attendance field
}, { timestamps: true });

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
