"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
/**
 * Uploads a file to Cloudinary from a local path or a URL.
 * If the path is already a Cloudinary URL, it returns it as is.
 */
const uploadToCloudinary = async (filePath, folder) => {
    try {
        // If it's already a URL, no need to upload again
        if (filePath.startsWith('http')) {
            return filePath;
        }
        const result = await cloudinary_1.v2.uploader.upload(filePath, {
            folder: `abu_tutors/${folder}`,
            resource_type: 'auto'
        });
        // Delete local file after upload
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        return result.secure_url;
    }
    catch (error) {
        logger_1.default.error(`[CLOUDINARY_UPLOAD_ERROR] ${error.message}`);
        throw error;
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
//# sourceMappingURL=cloudinaryHelper.js.map