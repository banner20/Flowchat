const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API key from environment variable
const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-1.5-flash';

console.log(`Testing ${model} API call...`);
console.log(`API Key configured: ${!!apiKey}`);

async function testGemini() {
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
    
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      data: {
        contents: [
          {
            parts: [
              { text: "Hello, how are you?" }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40
        }
      }
    });
    
    console.log('Response status:', response.status);
    
    // Extract the response
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts[0]) {
      
      const text = response.data.candidates[0].content.parts[0].text;
      console.log(`Generated response: "${text}"`);
    } else {
      console.error('Unexpected response structure:', JSON.stringify(response.data).substring(0, 200));
    }
  } catch (error) {
    console.error('API Error:', error.message);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGemini(); 