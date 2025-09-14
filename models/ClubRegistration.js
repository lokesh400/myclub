const mongoose = require('mongoose');

const ClubRegistrationSchema = new mongoose.Schema({
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',  // assumes you have a Club model
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // assumes you already have a User model
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// To prevent duplicate registrations for the same club in the same year
ClubRegistrationSchema.index({ clubId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ClubRegistration', ClubRegistrationSchema);
