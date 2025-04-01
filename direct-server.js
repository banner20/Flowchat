/**
 * FlowChat - Direct Server
 * Using the Vertex AI API for Gemini access
 */

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Get API key from environment variable
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// API endpoint for chatting with AI
app.post('/api/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Received prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    console.log(`Using model: ${modelName}`);
    
    // Use the latest API endpoint format
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
    console.log(`Using API URL: ${apiUrl}`);
    
    try {
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
                { text: prompt }
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
        console.log(`Generated response (${text.length} chars)`);
        
        return res.json({ response: text });
      } else {
        console.error('Unexpected response structure:', JSON.stringify(response.data).substring(0, 200));
        return res.status(500).json({ error: 'Unexpected response structure from API' });
      }
    } catch (apiError) {
      console.error('API Error:', apiError.message);
      
      // Log detailed error information
      if (apiError.response) {
        console.error('Error status:', apiError.response.status);
        console.error('Error data:', apiError.response.data);
      }
      
      let errorMessage = 'Failed to get response from AI';
      
      if (apiError.response?.data?.error?.message) {
        errorMessage = apiError.response.data.error.message;
      }
      
      return res.status(500).json({ error: errorMessage });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running with direct API integration',
    apiKeyConfigured: !!apiKey
  });
});

// Mock API for development/testing
app.post('/api/mock', (req, res) => {
  const { prompt } = req.body;
  console.log('Mock API received prompt:', prompt);
  
  // Return a mock response
  setTimeout(() => {
    res.json({
      response: `This is a mock response to: "${prompt}"\n\nThe mock API is working correctly.`
    });
  }, 500);
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`
FlowChat server running on port ${PORT}
- API endpoint: http://localhost:${PORT}/api/ask
- Mock endpoint: http://localhost:${PORT}/api/mock
- UI available at: http://localhost:${PORT}
- API key status: ${apiKey ? 'Configured' : 'NOT CONFIGURED'}
- Using model: ${modelName}
  `);
}); 