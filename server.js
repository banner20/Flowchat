require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Gemini API endpoint
app.post('/api/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare request to Gemini API
    const geminiResponse = await axios.post(
      process.env.GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    // Extract the response text
    const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
    
    // Return the AI-generated response
    res.json({ 
      success: true, 
      response: responseText,
      prompt
    });
    
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get response from AI',
      details: error.response?.data || error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set your GEMINI_API_KEY in the .env file');
}); 