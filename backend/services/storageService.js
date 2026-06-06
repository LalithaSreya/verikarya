const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Saves a base64 image string directly to Cloudinary cloud storage.
 * 
 * @param {string} base64Data - Base64 image data (with or without data:image/jpeg;base64 prefix)
 * @param {string} prefix - Filename prefix (e.g. 'evidence', 'checkin')
 * @returns {Promise<string>} Secure cloud HTTPS URL of the uploaded image
 */
const saveImage = async (base64Data, prefix = 'verikarya') => {
  try {
    if (!base64Data) {
      throw new Error('No image data provided');
    }

    // Upload base64 string directly to Cloudinary under a specific folder
    const uploadResponse = await cloudinary.uploader.upload(base64Data, {
      folder: 'verikarya_evidence',
      public_id: `${prefix}-${Date.now()}`
    });

    // Return the secure URL to be stored in MongoDB
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error in storageService:', error);
    throw new Error(`Cloudinary Storage error: ${error.message}`);
  }
};

module.exports = {
  saveImage
};
