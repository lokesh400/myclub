const mongoose = require('mongoose');

const studentRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  branch: { type: String, required: true },
  semester: { type: String, required: true },
  rollNumber: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  recruitmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubRegistration', required: true },
  round: { type: Number, enum: [1, 2, 3], default: 1 },
  status: { type: String, enum: ['Pending', 'Selected', 'Rejected'], default: 'Pending' },
  rejectedAtRound: { type: Number, default: null }, // store round at which rejected
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);
