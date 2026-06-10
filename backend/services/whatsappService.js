const mongoose = require('mongoose');

/**
 * Automatically formats a phone number to E.164 standard (e.g. +91XXXXXXXXXX)
 * @param {string} phone - The input phone number
 * @returns {string} - The sanitized phone number
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[-\s()]/g, ''); // Remove spaces, dashes, brackets

  if (!cleaned.startsWith('+')) {
    // If it's a standard 10-digit number, assume India (+91) as default for Indian testing
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned; // General fallback
    }
  }
  return cleaned;
};

/**
 * Sends a WhatsApp notification to a client (using Twilio in production or simulating locally)
 * @param {string} to - The recipient's phone number
 * @param {string} message - The message body to send
 */
const sendWhatsAppMessage = async (to, message) => {
  const formattedTo = formatPhoneNumber(to);

  console.log(`\n==================================================`);
  console.log(`[WHATSAPP SERVICE] Dispatching Notification...`);
  console.log(`Recipient: ${formattedTo} (Original: ${to})`);
  console.log(`Message: "${message}"`);
  console.log(`==================================================\n`);

  let status = 'sent';
  let twilioError = null;

  // Twilio Production WhatsApp Integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (accountSid && authToken && whatsappNumber) {
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      
      const response = await client.messages.create({
        from: 'whatsapp:' + formatPhoneNumber(whatsappNumber),
        to: 'whatsapp:' + formattedTo,
        body: message
      });
      console.log('[TWILIO SUCCESS] Message SID:', response.sid);
    } catch (error) {
      status = 'failed';
      twilioError = error.message;
      console.error('[TWILIO ERROR] Dispatch failure:', error.message);
    }
  } else {
    console.log('[WHATSAPP SERVICE] Twilio credentials not fully configured. Operating in Simulation Mode.');
  }

  // Log to database dynamically with actual status and error info
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.collection('whatsapp_logs').insertOne({
        to: formattedTo,
        message,
        status: status,
        error: twilioError,
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('Failed to save WhatsApp notification log in database:', err.message);
  }
};

module.exports = {
  sendWhatsAppMessage
};
