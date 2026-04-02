require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { default: chalk } = require("chalk");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const registerHealthRoutes = require("./routes/healthRoute");
const registerAuthRoutes = require("./routes/authRoute");
const registerFactoryRoutes = require("./routes/factory");
const registerUploadRoutes = require("./routes/uploadRoute");
const registerGameplayRoutes = require("./routes/gameplayRoute");
const registerDerivedRoutes = require("./routes/derivedRoute");

const app = express();
const port = process.env.PORT || 8000;
const swaggerDocument = YAML.load(path.join(__dirname, "docs/openapi.yaml"));

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
registerHealthRoutes(app);
registerAuthRoutes(app);
registerFactoryRoutes(app, "/api");
registerGameplayRoutes(app, "/game");
registerDerivedRoutes(app, "/api");
registerUploadRoutes(app, "/upload");
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(port, () => {
  console.log(chalk.bgGreen(`Server is running on port: ${port}`));
  console.log(
    chalk.bgBlue(`Health check URL: http://localhost:${port}/health`),
  );
  console.log(chalk.bgMagenta(`Swagger docs URL: http://localhost:${port}/docs`));
});
