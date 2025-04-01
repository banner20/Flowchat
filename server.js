/**
 * FlowChat - Node-based conversational platform
 * Server for Gemini API integration
 */

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini API with the key from .env
const apiKey = process.env.GEMINI_API_KEY;

// Check for valid API key
if (!apiKey || apiKey === 'your_api_key_here') {
  console.error(`
-------------------------------------------------------
ERROR: INVALID GEMINI API KEY
-------------------------------------------------------
Please follow these steps:

1. Get a valid API key from: https://makersuite.google.com/app/apikey
2. Open the .env file in the project root
3. Replace "your_api_key_here" with your actual API key
4. Restart the server

For more information, see the README.md file.
-------------------------------------------------------
`);
  // Continue running so the user can see the error in the browser
}

// Create the Gemini API client with proper configuration
const genAI = new GoogleGenerativeAI(apiKey || 'invalid-placeholder-key');
const modelName = process.env.GEMINI_MODEL || 'gemini-pro';

// Direct API call using axios as a fallback
async function callGeminiDirectly(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        }
      }
    );
    
    // Extract text from the response
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts[0]) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected response structure from Gemini API');
    }
  } catch (error) {
    console.error('Direct API call error:', error.message);
    throw error;
  }
}

// API endpoint for chatting with AI
app.post('/api/ask', async (req, res) => {
  try {
    // Check API key again when a request is made
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({ 
        error: 'Invalid API key. Please update your .env file with a valid Gemini API key.'
      });
    }
    
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Received prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    // Try with the Google library first
    try {
      // Get the generative model
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
      
      // Generate content
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      console.log(`Generated response (${response.length} chars)`);
      
      // Return the response
      res.json({ response });
    } catch (apiError) {
      console.error('Gemini API Error:', apiError);
      
      // If library fails, try direct API call as fallback
      console.log('Attempting direct API call as fallback...');
      try {
        const directResponse = await callGeminiDirectly(prompt);
        console.log(`Generated response via direct API (${directResponse.length} chars)`);
        res.json({ response: directResponse });
      } catch (directError) {
        // Check if it's an API key error
        if (directError.message && directError.message.includes('API_KEY_INVALID')) {
          return res.status(500).json({ 
            error: 'The Gemini API key is invalid. Please update your .env file with a valid key.'
          });
        }
        
        // Other API errors
        res.status(500).json({ 
          error: `Error from Gemini API: ${directError.message || 'Unknown error'}`
        });
      }
    }
  } catch (error) {
    console.error('Server Error:', error);
    
    // Provide a specific error message if possible
    const errorMessage = error.message || 'Failed to get response from AI';
    res.status(500).json({ error: errorMessage });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthy = !!apiKey && apiKey !== 'your_api_key_here';
  res.json({ 
    status: healthy ? 'ok' : 'error',
    message: healthy ? 'Server is running' : 'Invalid API key',
    apiKeyConfigured: healthy
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
FlowChat server running on port ${PORT}
- API endpoint: http://localhost:${PORT}/api/ask
- UI available at: http://localhost:${PORT}
- Using Gemini model: ${modelName}
- API key status: ${(!apiKey || apiKey === 'your_api_key_here') ? 'NOT CONFIGURED ⚠️' : 'Configured ✓'}
  `);
}); 