const getAuthSecretOrRespond = (res) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    res.status(500).json({ message: "AUTH_SECRET is not configured." });
    return null;
  }
  return secret;
};

const getCredentialsOrRespond = (req, res, options) => {
  const opts = options || {};
  const { minPasswordLength } = opts;
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ message: "username and password are required." });
    return null;
  }

  if (minPasswordLength && password.length < minPasswordLength) {
    res.status(400).json({
      message: `password must be at least ${minPasswordLength} characters.`,
    });
    return null;
  }

  return { username, password };
};

const getBearerTokenOrRespond = (req, res) => {
  const header = req.headers.authorization || "";
  const [bearer, token] = header.split(" ");

  if (bearer != "Bearer" || !token) {
    res.status(401).json({ message: "Unauthorized. Missing bearer token." });
    return null;
  }

  return token;
};

module.exports = {
  getAuthSecretOrRespond,
  getCredentialsOrRespond,
  getBearerTokenOrRespond,
};
