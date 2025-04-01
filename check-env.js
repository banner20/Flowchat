const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Environment variables check:');
console.log('--------------------------');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || '(not set, using default)');

// Check .env file
const fs = require('fs');
try {
  if (fs.existsSync('.env')) {
    console.log('\n.env file exists');
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('Contains GEMINI_MODEL:', envContent.includes('GEMINI_MODEL'));
  } else {
    console.log('\n.env file does not exist');
  }
} catch (err) {
  console.error('Error checking .env file:', err);
} 