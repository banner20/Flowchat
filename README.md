# FlowChat

A node-based conversational platform that integrates with Google's Gemini AI. This MVP allows users to enter prompts that become "nodes" in a conversational flow, with AI-generated responses.

## Features

- Simple, clean UI for entering prompts and viewing responses
- Integration with Gemini AI's free tier API
- Node-based conversation history
- Responsive design

## Setup

### Prerequisites

- Node.js (v14 or newer)
- A Gemini API key (free tier)

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd mvp-project
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
   ```

4. Replace `your_gemini_api_key_here` with your actual Gemini API key.

### Running the Application

Start the server:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

The application will be accessible at http://localhost:3000

## Usage

1. Enter a prompt in the text area
2. Click "Send to AI" to submit the prompt
3. A new node will appear showing your prompt
4. Once the AI responds, the node will update with the response
5. Continue adding new prompts to build your conversational flow

## Project Structure

```
/mvp-project
  ├── server.js         // Express server with Gemini API integration
  ├── package.json      // Project dependencies and scripts
  ├── .env              // Environment variables (API keys)
  ├── public/           // Static files served by Express
  │    ├── index.html   // Main HTML interface
  │    ├── style.css    // CSS styling
  │    └── app.js       // Client-side JavaScript
  └── README.md         // This documentation file
```

## Future Enhancements

- Visual mind map display for nodes
- Node linking capabilities
- User authentication
- Saving and loading conversations
- Custom styling options for nodes
- Different AI model options

## License

MIT 