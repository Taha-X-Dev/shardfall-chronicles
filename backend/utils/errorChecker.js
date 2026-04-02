const { default: chalk } = require("chalk");

const errorChecker = (err, res) => {
  const status = err.statusCode || 500;
  const payload = {
    message: status == 500 ? "Internal server error." : err.message,
  };

  console.error(chalk.bgRed("API Error:"), err);
  if (res.headersSent) {
    return;
  }
  res.status(status).json(payload);
};

module.exports = errorChecker;
