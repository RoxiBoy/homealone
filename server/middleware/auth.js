const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function createAuthMiddleware({ allowExpired = false } = {}) {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);

      if (!token) {
        return res.status(401).json({
          code: 'AUTH_MISSING_TOKEN',
          message: 'No token, authorization denied',
        });
      }

      let decoded;
      let tokenExpired = false;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        if (!allowExpired || error.name !== 'TokenExpiredError') {
          const code = error.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_INVALID_TOKEN';
          return res.status(401).json({
            code,
            message: error.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Token is not valid',
          });
        }

        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          ignoreExpiration: true,
        });
        tokenExpired = true;
      }

      const user = await User.findById(decoded.id)
        .select('authTokenVersion loggedOutAt authSessionExpiresAt')
        .exec();

      if (!user) {
        return res.status(401).json({
          code: 'AUTH_USER_NOT_FOUND',
          message: 'Token is not valid',
        });
      }

      const expectedVersion = Number(user.authTokenVersion || 0);
      const tokenVersion = Number(decoded.tokenVersion || 0);

      if (!allowExpired && tokenVersion !== expectedVersion) {
        return res.status(401).json({
          code: 'AUTH_TOKEN_REVOKED',
          message: 'Session ended. Please log in again.',
        });
      }

      req.userId = decoded.id;
      req.auth = {
        decoded,
        tokenExpired,
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Token is not valid',
      });
    }
  };
}

const authMiddleware = createAuthMiddleware();
authMiddleware.allowExpired = createAuthMiddleware({ allowExpired: true });

module.exports = authMiddleware;
