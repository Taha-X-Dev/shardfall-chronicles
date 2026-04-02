const pool = require("../utils/pgClient");
const errorChecker = require("../utils/errorChecker");

const registerHealthRoutes = (app) => {
  app.get("/health", (_, res) => {
  res.json({ message: `Server is running on PORT: ${process.env.PORT || 8000}` });
  });

  app.get("/db_health", async (_, res) => {
    try {
      await pool.query("SELECT 1;");
      res.json({ message: "DB is active." });
    } catch (error) {
      errorChecker(error, res);
    }
  });
};

module.exports = registerHealthRoutes;
