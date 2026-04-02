const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../utils/pgClient");
const errorChecker = require("../utils/errorChecker");
const { getAuthSecretOrRespond, getCredentialsOrRespond } = require("../utils/authUtils");

const signToken = (user) => {
  const secret = process.env.AUTH_SECRET;
  return jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: "7d" });
};


const registerAuthRoutes = (app, basePath = "/auth") => {
  app.post(`${basePath}/register`, async (req, res) => {
    try {
      const credentials = getCredentialsOrRespond(req, res, { minPasswordLength: 6 });
      if (!credentials) return;
      const { username, password } = credentials;

      const secret = getAuthSecretOrRespond(res);
      if (!secret) return;

      const existing = await pool.query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1;",
        [username],
      );
      if (existing.rows[0]) {
        return res.status(409).json({ message: "username already exists." });
      }
      const salt = 12
      const passwordHash = await bcrypt.hash(password, salt);
      const created = await pool.query(
        "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username;",
        [username, passwordHash],
      );

      const user = created.rows[0];
      const token = signToken(user);

      return res.status(201).json({ message: "Registered successfully.", user, token });
    } catch (err) {
      errorChecker(err, res);
    }
  });

  app.post(`${basePath}/login`, async (req, res) => {
    try {
      const credentials = getCredentialsOrRespond(req, res);
      if (!credentials) return;
      const { username, password } = credentials;

      const secret = getAuthSecretOrRespond(res);
      if (!secret) return;

      const result = await pool.query(
        "SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1;",
        [username],
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const token = signToken(user);
      return res.json({ message: "Login successful.", user: { id: user.id, username: user.username }, token });
    } catch (err) {
      errorChecker(err, res);
    }
  });
};

module.exports = registerAuthRoutes;
