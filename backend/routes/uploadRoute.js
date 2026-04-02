const { imageUpload } = require("../utils/upload");
const basePath = "/upload";

const registerUploadRoutes = (app) => {
  app.post(`${basePath}/image`, imageUpload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const publicPath = `uploads/images/${req.file.filename}`;

    return res.status(201).json({
      message: "Image uploaded successfully.",
      filename: req.file.filename,
      path: publicPath,
    });
  });
};

module.exports = registerUploadRoutes;
