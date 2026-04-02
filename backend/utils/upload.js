const path = require("path");
const multer = require("multer");

const uploadsDir = path.join(__dirname, "..", "uploads");
const imagesDir = path.join(uploadsDir, "images");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    const now = new Date();
    const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const random = Math.floor(Math.random() * 1e4);
    const uniqueName = `${date}-${random}`;
    cb(null, `${file.fieldname}-${uniqueName}${path.extname(file.originalname)}`);
  },
});

const imageUpload = multer({ storage });

module.exports = {
  uploadsDir,
  imagesDir,
  imageUpload,
};
