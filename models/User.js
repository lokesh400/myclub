const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: false },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'student'], 
    default: 'student' 
  },
  club: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Club', 
    default: null 
  }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
