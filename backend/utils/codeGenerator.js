/**
 * Generates a verification code in the format VK-XXXX where XXXX is a 4-digit number.
 * @returns {string} Verification code
 */
const generateVerificationCode = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `VK-${num}`;
};

module.exports = {
  generateVerificationCode
};
