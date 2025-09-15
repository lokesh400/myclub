const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  jsec: { type: [String], required: true },
});

module.exports = mongoose.model('Club', clubSchema);
