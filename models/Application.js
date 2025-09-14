const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  rollNumber: String,
  rounds: [
    { roundName: String, status: { type: String, enum: ['pending', 'selected', 'rejected'], default: 'pending' } }
  ]
});

module.exports = mongoose.model('Application', applicationSchema);
