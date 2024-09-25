const multer = require("multer");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// AWS S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Use memory storage since we are uploading to S3, not storing locally
const storage = multer.memoryStorage();

// File filter for allowed file types (jpeg, jpg, png, pdf)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedExtensions.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and PDFs are allowed"));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// Function to upload files to S3
const uploadToS3 = async (file) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME_Image, // Replace with your S3 bucket name
    Key: `${Date.now()}-${file.originalname}`, // Use timestamp to create unique file name
    Body: file.buffer, // File buffer from memory
    ContentType: file.mimetype, // File MIME type
  };

  const command = new PutObjectCommand(s3Params);
  await s3.send(command);

  // Return the public URL of the uploaded file
  return `https://${process.env.S3_BUCKET_NAME_Image}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`;
};

module.exports = { upload, uploadToS3 };
