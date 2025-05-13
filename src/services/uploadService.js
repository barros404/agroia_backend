const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Decidir qual armazenamento usar (S3 ou local)
const useS3 = process.env.STORAGE_TYPE === "s3";

// Configurar AWS S3
if (useS3) {
  aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
}

// Diretório local para uploads
const localUploadPath = path.resolve(__dirname, "..", "uploads");

// Garantir que a pasta de uploads existe
if (!useS3 && !fs.existsSync(localUploadPath)) {
  fs.mkdirSync(localUploadPath, { recursive: true });
}

// Definir configuração de armazenamento
const storageTypes = {
  // Armazenamento local
  local: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localUploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),

  // Armazenamento S3
  s3: multerS3({
    s3: new aws.S3(),
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const fileName = `uploads/${file.fieldname}-${uniqueSuffix}${ext}`;
      cb(null, fileName);
    },
  }),
};

// Configuração do Multer
const upload = multer({
  storage: storageTypes[useS3 ? "s3" : "local"],
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/pjpeg",
      "image/png",
      "image/gif",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo inválido."));
    }
  },
});

// Função para deletar um arquivo
const deleteFile = async (key) => {
  if (useS3) {
    const s3 = new aws.S3();
    return s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
      .promise();
  } else {
    // Se for armazenamento local, remover o arquivo
    return new Promise((resolve, reject) => {
      fs.unlink(path.resolve(localUploadPath, key), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

// Gerar URL para o arquivo
const getFileUrl = (filename) => {
  if (useS3) {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}`;
  } else {
    return `${process.env.APP_URL}/uploads/${filename}`;
  }
};

module.exports = {
  upload,
  deleteFile,
  getFileUrl,
};
