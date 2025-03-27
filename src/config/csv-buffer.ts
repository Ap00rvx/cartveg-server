import multer from "multer";

const storage = multer.memoryStorage();

const uploadBuffer = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB
    }).single("file");


export default uploadBuffer;