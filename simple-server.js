/**
 * FlowChat - Simple Server Version
 * Using direct axios calls to Gemini API
 */

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Get API key from environment variable
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-pro';

// API endpoint for chatting with AI
app.post('/api/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Received prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    try {
      // Make direct API call to Gemini using axios
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
      
      console.log('Received API response:', response.status);
      
      // Extract text from the response
      if (response.data && 
          response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content && 
          response.data.candidates[0].content.parts && 
          response.data.candidates[0].content.parts[0]) {
        
        const generatedText = response.data.candidates[0].content.parts[0].text;
        console.log(`Generated response (${generatedText.length} chars)`);
        
        // Return the response
        res.json({ response: generatedText });
      } else {
        console.error('Unexpected response structure:', JSON.stringify(response.data).substring(0, 200));
        res.status(500).json({ error: 'Unexpected response structure from Gemini API' });
      }
    } catch (apiError) {
      console.error('API Error:', apiError.message);
      console.error('Response data:', apiError.response?.data);
      
      let errorMessage = 'Failed to get response from AI';
      
      if (apiError.response?.data?.error?.message) {
        errorMessage = apiError.response.data.error.message;
      }
      
      res.status(500).json({ error: errorMessage });
    }
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    apiKeyConfigured: !!apiKey
  });
});

// Start the server
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`
FlowChat server running on port ${PORT}
- API endpoint: http://localhost:${PORT}/api/ask
- UI available at: http://localhost:${PORT}
- Using Gemini model: ${modelName}
- Using API version: v1beta
  `);
}); 