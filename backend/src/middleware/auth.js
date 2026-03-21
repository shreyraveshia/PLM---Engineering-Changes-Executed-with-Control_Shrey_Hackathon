const jwt = require('jsonwebtoken');
require('dotenv').config();

//JWT verification middleware. Every protected route imports `verifyToken` from this file. 
//It reads the Authorization header, verifies the JWT, and attaches `req.user = 
// {id, email, role, name}` for downstream use.


const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Access denied. No authorization header provided.'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. Authorization header must start with "Bearer ".'
    });
  }

  const token = authHeader.substring(7);

  if (!token || token.trim() === '') {
    return res.status(401).json({
      error: 'Access denied. Token is empty.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    return res.status(401).json({ error: 'Token verification failed.' });
  }
};

module.exports = { verifyToken };
