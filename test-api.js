/**
 * Test script to check Gemini API connectivity
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API key
const apiKey = process.env.GEMINI_API_KEY;

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API connectivity...');
    console.log('API Key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));
    
    // First try to list available models
    console.log('\nTrying to list available models...');
    const modelsResponse = await axios.get(
      'https://generativelanguage.googleapis.com/v1/models',
      {
        headers: {
          'x-goog-api-key': apiKey
        }
      }
    );
    
    console.log('Available models:');
    if (modelsResponse.data && modelsResponse.data.models) {
      modelsResponse.data.models.forEach(model => {
        console.log(`- ${model.name}: ${model.displayName}`);
      });
    }
    
    // Next, try a simple gemini-pro generation
    console.log('\nTrying to generate content with gemini-pro...');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
      {
        contents: [{ parts: [{ text: 'Hello world!' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        }
      }
    );
    
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts[0]) {
      console.log('Response:');
      console.log(response.data.candidates[0].content.parts[0].text);
    } else {
      console.log('Unexpected response structure:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testGeminiAPI(); 