// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'attende', 'stock_management', 'diesel_management'],
    required: true,
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;
