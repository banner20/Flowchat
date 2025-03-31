/**
 * FlowChat - Node-based conversational platform with Gemini AI
 * Client-side JavaScript
 */

// DOM Elements
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const nodesContainer = document.getElementById('nodes-container');

// Store conversation nodes
let nodes = [];

// Initialize the application
function init() {
  // Remove empty state if nodes exist
  if (nodes.length > 0) {
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }

  // Add event listeners
  promptForm.addEventListener('submit', handlePromptSubmit);
}

// Handle form submission
async function handlePromptSubmit(event) {
  event.preventDefault();
  
  // Get the prompt text
  const promptText = promptInput.value.trim();
  
  // Validate input
  if (!promptText) {
    alert('Please enter a prompt');
    return;
  }
  
  // Disable the form during submission
  toggleFormState(true);
  
  // Create a new node for this prompt
  const nodeId = Date.now().toString();
  createNode(nodeId, promptText);
  
  try {
    // Send the prompt to the API
    const response = await sendPromptToAPI(promptText);
    
    // Update the node with the response
    updateNodeWithResponse(nodeId, response.response);
    
    // Add to nodes array
    nodes.push({
      id: nodeId,
      prompt: promptText,
      response: response.response
    });
    
    // Clear the input form
    promptInput.value = '';
  } catch (error) {
    // Handle errors
    updateNodeWithError(nodeId, error.message || 'Failed to get a response');
    console.error('Error:', error);
  } finally {
    // Re-enable the form
    toggleFormState(false);
  }
}

// Toggle form input state (enabled/disabled)
function toggleFormState(isLoading) {
  promptInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  sendButton.textContent = isLoading ? 'Sending...' : 'Send to AI';
}

// Create a new node in the UI
function createNode(id, promptText) {
  // Remove empty state if it exists
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  // Create node elements
  const nodeElement = document.createElement('div');
  nodeElement.classList.add('node');
  nodeElement.id = `node-${id}`;
  
  const promptElement = document.createElement('div');
  promptElement.classList.add('node-prompt');
  promptElement.innerHTML = `<span class="node-prompt-label">Prompt</span>${promptText}`;
  
  const responseElement = document.createElement('div');
  responseElement.classList.add('node-response', 'loading');
  responseElement.textContent = 'Waiting for AI response...';
  
  // Assemble and add to the DOM
  nodeElement.appendChild(promptElement);
  nodeElement.appendChild(responseElement);
  nodesContainer.prepend(nodeElement); // Add newest nodes at the top
  
  // Scroll into view
  nodeElement.scrollIntoView({ behavior: 'smooth' });
}

// Update a node with the AI response
function updateNodeWithResponse(id, responseText) {
  const node = document.getElementById(`node-${id}`);
  if (node) {
    const responseElement = node.querySelector('.node-response');
    responseElement.classList.remove('loading');
    responseElement.textContent = responseText;
  }
}

// Update a node with an error message
function updateNodeWithError(id, errorMessage) {
  const node = document.getElementById(`node-${id}`);
  if (node) {
    const responseElement = node.querySelector('.node-response');
    responseElement.classList.remove('loading');
    responseElement.classList.add('error');
    responseElement.textContent = `Error: ${errorMessage}`;
  }
}

// Send the prompt to the backend API
async function sendPromptToAPI(prompt) {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'API request failed');
  }
  
  return response.json();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init); 