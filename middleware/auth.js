const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const auth = (requiredRoles = []) => {
  return async (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!requiredRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Not authorized for this role' });
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  };
};

module.exports = auth;
