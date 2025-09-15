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
  status: { type: String, enum: ['Admitted', 'Selected', 'Rejected'], default: 'Selected' },
  rejectedAtRound: { type: Number, default: null },
   attendance: [
    {
      round: Number,
      present: Boolean
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentRegistration', studentRegistrationSchema);
