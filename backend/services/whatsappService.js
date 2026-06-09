const mongoose = require('mongoose');

/**
 * Sends a simulated WhatsApp notification to a client
 * @param {string} to - The recipient's phone number
 * @param {string} message - The message body to send
 */
const sendWhatsAppMessage = async (to, message) => {
  console.log(`\n==================================================`);
  console.log(`[WHATSAPP SIMULATOR] Dispatching Notification...`);
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

  /*
  // Twilio Production WhatsApp Integration Code:
  // (Install twilio package via: npm install twilio)
  
  const twilio = require('twilio');
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  try {
    const response = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, // e.g. +14155238886
      to: 'whatsapp:' + to,
      body: message
    });
    console.log('Twilio response SID:', response.sid);
  } catch (error) {
    console.error('Twilio dispatch error:', error);
  }
  */
};

module.exports = {
  sendWhatsAppMessage
};
