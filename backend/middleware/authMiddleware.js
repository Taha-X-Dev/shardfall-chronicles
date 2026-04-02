const jwt = require("jsonwebtoken");
const {
  getAuthSecretOrRespond,
  getBearerTokenOrRespond,
} = require("../utils/authUtils");

const getAdminUsernames = () => {
  const raw = process.env.ADMIN_USERNAMES || process.env.ADMIN_USERNAME || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const isAdminUser = (user) => {
  if (!user || !user.username) return false;
  const admins = getAdminUsernames();
  if (!admins.length) return false;
  return admins.includes(user.username);
};

const authMiddleware = (req, res, next) => {
  const token = getBearerTokenOrRespond(req, res);
  if (!token) return;

  const secret = getAuthSecretOrRespond(res);
  if (!secret) return;

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Invalid or expired token." });
  }
};

const requireAdmin = (req, res, next) => {
  if (isAdminUser(req.user)) return next();
  return res.status(403).json({ message: "Admin access required." });
};

const requireSelfOrAdmin = (getTargetId) => {
  return (req, res, next) => {
    if (isAdminUser(req.user)) return next();
    const targetId = getTargetId(req);
    if (!targetId) {
      return res.status(400).json({ message: "Invalid target id." });
    }
    if (Number(req.user?.id) == Number(targetId)) {
      return next();
    }
    return res.status(403).json({ message: "Access denied." });
  };
};

module.exports = {
  authMiddleware,
  requireAdmin,
  requireSelfOrAdmin,
  isAdminUser,
};
