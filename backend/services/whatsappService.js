const mongoose = require('mongoose');

/**
 * Sends a WhatsApp notification to a client (using Twilio in production or simulating locally)
 * @param {string} to - The recipient's phone number
 * @param {string} message - The message body to send
 */
const sendWhatsAppMessage = async (to, message) => {
  console.log(`\n==================================================`);
  console.log(`[WHATSAPP SERVICE] Dispatching Notification...`);
  console.log(`Recipient: ${to}`);
  console.log(`Message: "${message}"`);
  console.log(`==================================================\n`);

  // Log to database dynamically
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.collection('whatsapp_logs').insertOne({
        to,
        message,
        status: 'sent',
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('Failed to save WhatsApp notification log in database:', err.message);
  }

  // Twilio Production WhatsApp Integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (accountSid && authToken && whatsappNumber) {
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      
      const response = await client.messages.create({
        from: 'whatsapp:' + whatsappNumber, // e.g. +14155238886 (Twilio Sandbox or Approved Sender)
        to: 'whatsapp:' + to,
        body: message
      });
      console.log('[TWILIO SUCCESS] Message SID:', response.sid);
    } catch (error) {
      console.error('[TWILIO ERROR] Dispatch failure:', error.message);
    }
  } else {
    console.log('[WHATSAPP SERVICE] Twilio credentials not fully configured. Operating in Simulation Mode.');
  }
};

module.exports = {
  sendWhatsAppMessage
};
