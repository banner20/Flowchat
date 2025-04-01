# FlowChat

A node-based conversational platform that integrates with Google's Gemini AI. Create, arrange, and connect conversation nodes on an infinite canvas.

## Features

- Create nodes with AI-generated responses using Google's Gemini API
- Infinite canvas with zoom and pan capabilities
- Drag and arrange conversation nodes freely
- Connect nodes to form conversation threads
- Copy, paste, and duplicate nodes
- Beautiful, responsive user interface

## Setup

### Prerequisites

- Node.js (v14 or above)
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/flowchat.git
   cd flowchat
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your environment:
   - Copy the `.env.example` file to `.env`
   - Add your Gemini API key to the `.env` file:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. Start the server:
   ```
   npm start
   ```

5. Open your browser and go to:
   ```
   http://localhost:3000
   ```

## Usage

1. **Create a node**:
   - Enter a prompt in the sidebar and click "Create Node" or
   - Click the "+" button in the canvas controls and enter a prompt in the modal

2. **Move nodes**: Click and drag the title area of any node to move it around the canvas

3. **Connect nodes**: Drag from one node's connection point to another node's connection point

4. **Edit canvas view**:
   - Drag the canvas background to pan
   - Use the mouse wheel or zoom buttons to zoom in/out
   - Use the center view button to see all nodes
   - Use the reset view button to return to the default view

5. **Copy and duplicate nodes**:
   - Select a node and press Ctrl+C to copy, Ctrl+V to paste
   - Double-click a node to instantly duplicate it

## Development

For development with hot reloading:
```
npm run dev
```

## Technologies

- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express
- AI: Google Gemini API

## License

MIT 