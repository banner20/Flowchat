/**
 * FlowChat - Node-based conversational platform with Gemini AI
 * Client-side JavaScript
 */

// DOM Elements
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const canvasElement = document.getElementById('canvas');
const connectionsLayer = document.getElementById('connections-layer');
const nodeList = document.getElementById('node-list');
const centerViewBtn = document.getElementById('center-view');
const resetViewBtn = document.getElementById('reset-view');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const newNodeBtn = document.getElementById('new-node');
const modal = document.getElementById('node-create-modal');
const closeModal = document.querySelector('.close-modal');
const modalPromptInput = document.getElementById('modal-prompt-input');
const modalCreateNodeBtn = document.getElementById('modal-create-node');

// Canvas state
let nodes = [];
let connections = [];
let selectedNode = null;
let isDraggingNode = false;
let isDraggingCanvas = false;
let isConnecting = false;
let connectionSource = null;
let temporaryConnection = null;
let dragOffset = { x: 0, y: 0 };
let canvasOffset = { x: 0, y: 0 };
let canvasScale = 1;
let lastMousePosition = { x: 0, y: 0 };
let nextNodePosition = { x: 100, y: 100 };
let mousePosition = { x: 0, y: 0 };
let canvasContainerRect = null;
let clipboard = null; // For storing copied nodes

// Constants
const NODE_WIDTH = 250;
const NODE_SPACING = 50;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;  // Lower minimum zoom to allow more zooming out
const MAX_ZOOM = 3;
const DEFAULT_ZOOM = 1;
const DEFAULT_OFFSET = { x: 0, y: 0 };

// Initialize the application
function init() {
  setupEventListeners();
  initializeCanvas();
  // Initialize SVG for connections
  ensureSVG();
}

// Set up event listeners
function setupEventListeners() {
  // Form events
  promptForm.addEventListener('submit', handlePromptSubmit);
  
  // Canvas container for capturing wheel events
  const canvasContainer = document.querySelector('.canvas-container');
  canvasContainerRect = canvasContainer.getBoundingClientRect();
  
  // Handle window resize to update container rect
  window.addEventListener('resize', () => {
    canvasContainerRect = canvasContainer.getBoundingClientRect();
  });
  
  // Canvas events - important to use the container for zooming
  canvasContainer.addEventListener('wheel', handleCanvasZoom, { passive: false });
  canvasElement.addEventListener('mousedown', handleCanvasMouseDown);
  
  // Prevent context menu on canvas to allow right-click dragging
  canvasElement.addEventListener('contextmenu', e => e.preventDefault());
  
  // Window events for drag operations
  window.addEventListener('mousemove', handleWindowMouseMove);
  window.addEventListener('mouseup', handleWindowMouseUp);
  
  // Button events
  centerViewBtn.addEventListener('click', centerCanvasView);
  resetViewBtn.addEventListener('click', resetCanvasView);
  zoomInBtn.addEventListener('click', () => zoomCanvas(ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => zoomCanvas(-ZOOM_STEP));
  newNodeBtn.addEventListener('click', showCreateNodeModal);
  
  // Modal events
  closeModal.addEventListener('click', hideCreateNodeModal);
  modalCreateNodeBtn.addEventListener('click', handleModalCreateNode);
  
  // Keyboard events for copy/paste
  window.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts (copy/paste)
function handleKeyboardShortcuts(event) {
  // Check if Ctrl or Command key is pressed
  const isCtrlPressed = event.ctrlKey || event.metaKey;
  
  // Copy: Ctrl+C
  if (isCtrlPressed && event.key === 'c') {
    if (selectedNode) {
      copySelectedNode();
      event.preventDefault();
    }
  }
  
  // Paste: Ctrl+V
  if (isCtrlPressed && event.key === 'v') {
    if (clipboard) {
      pasteNode();
      event.preventDefault();
    }
  }
  
  // Delete: Delete key
  if (event.key === 'Delete') {
    if (selectedNode) {
      deleteSelectedNode();
      event.preventDefault();
    }
  }
}

// Copy the selected node to clipboard
function copySelectedNode() {
  if (!selectedNode) return;
  
  // Deep clone the node object
  clipboard = JSON.parse(JSON.stringify(selectedNode));
  
  // Adjust position slightly for paste operation
  clipboard.position = {
    x: selectedNode.position.x + 20,
    y: selectedNode.position.y + 20
  };
  
  // Visual feedback (optional)
  const nodeElement = document.getElementById(`node-${selectedNode.id}`);
  if (nodeElement) {
    nodeElement.classList.add('copied');
    setTimeout(() => {
      nodeElement.classList.remove('copied');
    }, 200);
  }
}

// Paste node from clipboard
function pasteNode() {
  if (!clipboard) return;
  
  // Create a new node from clipboard data
  const nodeId = Date.now().toString();
  const node = {
    id: nodeId,
    prompt: clipboard.prompt,
    response: clipboard.response,
    position: { ...clipboard.position },
    connections: []
  };
  
  // Add to nodes array
  nodes.push(node);
  
  // Create the node in UI
  createNodeElement(node);
  
  // Add to node list sidebar
  addNodeToList(node);
  
  // Select the new node
  selectNode(node);
  
  // Move clipboard position for next paste
  clipboard.position.x += 20;
  clipboard.position.y += 20;
}

// Delete the selected node (update for proper SVG connections)
function deleteSelectedNode() {
  if (!selectedNode) return;
  
  // Remove the node element from the DOM
  const nodeElement = document.getElementById(`node-${selectedNode.id}`);
  if (nodeElement) {
    canvasElement.removeChild(nodeElement);
  }
  
  // Remove connections involving this node
  const nodeConnections = connections.filter(c => 
    c.sourceId === selectedNode.id || c.targetId === selectedNode.id
  );
  
  // Remove connection lines from the DOM
  nodeConnections.forEach(connection => {
    const connectionLine = document.querySelector(`path[data-connection-id="${connection.id}"]`);
    if (connectionLine && connectionLine.parentNode) {
      connectionLine.parentNode.removeChild(connectionLine);
    }
  });
  
  // Filter out this node's connections from the connections array
  connections = connections.filter(c => 
    c.sourceId !== selectedNode.id && c.targetId !== selectedNode.id
  );
  
  // Remove from node list sidebar
  const listItem = document.querySelector(`.node-list-item[data-node-id="${selectedNode.id}"]`);
  if (listItem) {
    nodeList.removeChild(listItem);
  }
  
  // Remove from nodes array
  nodes = nodes.filter(n => n.id !== selectedNode.id);
  
  // Clear selected node
  selectedNode = null;
}

// Initialize canvas state
function initializeCanvas() {
  // Center canvas initially
  const canvasContainer = document.querySelector('.canvas-container');
  const containerWidth = canvasContainer.clientWidth;
  const containerHeight = canvasContainer.clientHeight;
  
  // Start in center of canvas
  canvasOffset.x = containerWidth / 2;
  canvasOffset.y = containerHeight / 2;
  
  // Create dynamic background grid
  updateCanvasGridPattern();
  
  updateCanvasTransform();
}

// Convert page coordinates to canvas coordinates
function pageToCanvasCoord(pageX, pageY) {
  return {
    x: (pageX - canvasContainerRect.left - canvasOffset.x) / canvasScale,
    y: (pageY - canvasContainerRect.top - canvasOffset.y) / canvasScale
  };
}

// Handle form submission
async function handlePromptSubmit(event) {
  event.preventDefault();
  const promptText = promptInput.value.trim();
  
  if (!promptText) {
    alert('Please enter a prompt');
    return;
  }
  
  createNodeFromPrompt(promptText);
}

// Create a node from the prompt
async function createNodeFromPrompt(promptText) {
  toggleFormState(true);
  
  // Create the node with a loading state
  const nodeId = Date.now().toString();
  const node = {
    id: nodeId,
    prompt: promptText,
    response: null,
    position: { ...nextNodePosition },
    connections: []
  };
  
  // Update next node position for future nodes
  nextNodePosition.x += NODE_WIDTH + NODE_SPACING;
  
  // Simple row-by-row layout logic 
  // No need to check against canvas bounds since it's unbounded
  if (nextNodePosition.x > 3000) { // Keep nodes within a reasonable viewing area
    nextNodePosition.x = 100;
    nextNodePosition.y += 300;
  }
  
  // Add to nodes array
  nodes.push(node);
  
  // Create the node in UI
  createNodeElement(node);
  
  // Add to node list sidebar
  addNodeToList(node);
  
  try {
    // Send the prompt to the API
    const response = await sendPromptToAPI(promptText);
    
    // Update node with response
    node.response = response.response;
    updateNodeWithResponse(nodeId, response.response);
    
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
  sendButton.textContent = isLoading ? 'Processing...' : 'Create Node';
}

// Create a canvas node element
function createNodeElement(node) {
  const nodeElement = document.createElement('div');
  nodeElement.classList.add('canvas-node');
  nodeElement.id = `node-${node.id}`;
  nodeElement.dataset.nodeId = node.id;
  nodeElement.style.left = `${node.position.x}px`;
  nodeElement.style.top = `${node.position.y}px`;
  
  const promptElement = document.createElement('div');
  promptElement.classList.add('node-prompt');
  promptElement.innerHTML = `<span class="node-prompt-label">Prompt</span>${node.prompt}`;
  
  const responseElement = document.createElement('div');
  responseElement.classList.add('node-response');
  
  if (node.response) {
    responseElement.textContent = node.response;
  } else {
    responseElement.classList.add('loading');
    responseElement.textContent = 'Waiting for AI response...';
  }
  
  // Add connection points
  const inputPoint = document.createElement('div');
  inputPoint.classList.add('connection-point', 'input');
  inputPoint.dataset.nodeId = node.id;
  inputPoint.dataset.type = 'input';
  
  const outputPoint = document.createElement('div');
  outputPoint.classList.add('connection-point', 'output');
  outputPoint.dataset.nodeId = node.id;
  outputPoint.dataset.type = 'output';
  
  // Add connection point event listeners
  outputPoint.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startConnection(node, 'output', e);
  });
  
  inputPoint.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startConnection(node, 'input', e);
  });
  
  // Add mousedown handler for node title bar dragging (node-prompt is the draggable area)
  promptElement.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    handleNodeDragStart(e, node);
  });
  
  // Entire node is selectable
  nodeElement.addEventListener('mousedown', (e) => {
    if (e.target === nodeElement || promptElement.contains(e.target) || responseElement.contains(e.target)) {
      // Select but don't start dragging unless on the prompt area
      e.stopPropagation();
      selectNode(node);
    }
  });
  
  // Double-click to copy
  nodeElement.addEventListener('dblclick', () => {
    selectNode(node);
    copySelectedNode();
    pasteNode();
  });
  
  // Assemble and add to the canvas
  nodeElement.appendChild(promptElement);
  nodeElement.appendChild(responseElement);
  nodeElement.appendChild(inputPoint);
  nodeElement.appendChild(outputPoint);
  canvasElement.appendChild(nodeElement);
  
  // If this is the first node, center the view on it
  if (nodes.length === 1) {
    centerOnNode(node);
  }
}

// Add a node to the sidebar list
function addNodeToList(node) {
  const listItem = document.createElement('div');
  listItem.classList.add('node-list-item');
  listItem.dataset.nodeId = node.id;
  listItem.textContent = node.prompt.length > 30 
    ? node.prompt.substring(0, 30) + '...' 
    : node.prompt;
  
  // Click to center view on this node
  listItem.addEventListener('click', () => {
    centerOnNode(node);
    selectNode(node);
  });
  
  nodeList.appendChild(listItem);
}

// Update node with AI response
function updateNodeWithResponse(id, responseText) {
  const nodeElement = document.getElementById(`node-${id}`);
  if (nodeElement) {
    const responseElement = nodeElement.querySelector('.node-response');
    responseElement.classList.remove('loading');
    responseElement.textContent = responseText;
  }
}

// Update node with error
function updateNodeWithError(id, errorMessage) {
  const nodeElement = document.getElementById(`node-${id}`);
  if (nodeElement) {
    const responseElement = nodeElement.querySelector('.node-response');
    responseElement.classList.remove('loading');
    responseElement.classList.add('error');
    
    // Check if it's an API key error and provide more helpful message
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY_INVALID')) {
      responseElement.innerHTML = `
        <strong>API Key Error</strong><br>
        The Gemini API key is not configured properly. Please:
        <ol>
          <li>Get a valid API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
          <li>Update the .env file with your key</li>
          <li>Restart the server</li>
        </ol>
      `;
    } else {
      responseElement.textContent = `Error: ${errorMessage}`;
    }
  }
}

// Send prompt to API
async function sendPromptToAPI(prompt) {
  try {
    // Try the real API first
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        // Try to get detailed error message from API
        let errorMessage = 'API request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Throw an error to trigger the fallback
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return { response: data.response };
    } catch (apiError) {
      console.warn('Main API failed, falling back to mock:', apiError.message);
      
      // Fall back to the mock API if the real one fails
      const mockResponse = await fetch('/api/mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!mockResponse.ok) {
        throw new Error('Mock API also failed');
      }
      
      const mockData = await mockResponse.json();
      return { response: mockData.response };
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Canvas interaction handlers
function handleCanvasMouseDown(event) {
  // Update mouse position
  mousePosition = { x: event.clientX, y: event.clientY };
  
  // Only handle direct canvas clicks (not nodes or connection points)
  if (event.target !== canvasElement) return;
  
  // We are directly clicking the canvas background
  // Start canvas dragging regardless of which mouse button
  isDraggingCanvas = true;
  lastMousePosition = { x: event.clientX, y: event.clientY };
  canvasElement.classList.add('active-drag');
}

// Starting to drag a node
function handleNodeDragStart(event, node) {
  // Always select the node when starting to drag
  selectNode(node);
  
  isDraggingNode = true;
  
  // Get node element for positioning
  const nodeElement = document.getElementById(`node-${node.id}`);
  const rect = nodeElement.getBoundingClientRect();
  
  // Calculate drag offset: Where in the node we clicked
  dragOffset = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  // Visual feedback
  nodeElement.classList.add('dragging');
  document.body.style.cursor = 'grabbing';
}

// Handle all mouse movements on window level
function handleWindowMouseMove(event) {
  // Always track the mouse position for various operations
  mousePosition = { x: event.clientX, y: event.clientY };
  
  // Handle node dragging - higher priority than canvas dragging
  if (isDraggingNode && selectedNode) {
    // Calculate position in canvas coordinates
    const canvasCoord = pageToCanvasCoord(event.clientX, event.clientY);
    
    // Adjust for the drag offset within the node
    const x = canvasCoord.x - dragOffset.x;
    const y = canvasCoord.y - dragOffset.y;
    
    // Update node position data - with NO boundaries
    selectedNode.position = { x, y };
    
    // Update visual position
    const nodeElement = document.getElementById(`node-${selectedNode.id}`);
    if (nodeElement) {
      nodeElement.style.left = `${x}px`;
      nodeElement.style.top = `${y}px`;
      
      // Check if this node has moved very far from center
      const distanceFromCenter = Math.sqrt(x*x + y*y);
      if (distanceFromCenter > 5000) {
        // If node is very far out, update background grid to ensure it extends that far
        updateCanvasGridPattern();
      }
    }
    
    // Update any connections
    updateNodeConnections(selectedNode);
    
    // Prevent any other dragging operations
    event.preventDefault();
    event.stopPropagation();
  } 
  // Handle canvas panning/dragging
  else if (isDraggingCanvas) {
    const dx = event.clientX - lastMousePosition.x;
    const dy = event.clientY - lastMousePosition.y;
    
    // Update canvas offset with NO boundaries
    canvasOffset.x += dx;
    canvasOffset.y += dy;
    
    // Store current position for next move calculation
    lastMousePosition = { x: event.clientX, y: event.clientY };
    updateCanvasTransform();
    
    // Prevent text selection during drag
    event.preventDefault();
  }
  // Handle connection drawing
  else if (isConnecting && connectionSource) {
    drawTemporaryConnection();
  }
}

// Handle mouseup to end any dragging operations
function handleWindowMouseUp(event) {
  // Handle completion of a connection
  if (isConnecting && connectionSource) {
    finishConnection(event);
  }
  
  // End node dragging
  if (isDraggingNode && selectedNode) {
    const nodeElement = document.getElementById(`node-${selectedNode.id}`);
    if (nodeElement) {
      nodeElement.classList.remove('dragging');
    }
    document.body.style.cursor = '';
  }
  
  // End canvas dragging
  if (isDraggingCanvas) {
    canvasElement.classList.remove('active-drag');
  }
  
  // Reset all dragging flags
  isDraggingNode = false;
  isDraggingCanvas = false;
}

// Zoom the canvas on mouse wheel
function handleCanvasZoom(event) {
  // Always prevent default scrolling
  event.preventDefault();
  
  // Get direction from wheel delta
  // Normalize for cross-browser compatibility
  const delta = -Math.sign(event.deltaY);
  const zoomFactor = delta * ZOOM_STEP;
  
  zoomCanvas(zoomFactor, event.clientX, event.clientY);
}

// Apply zoom to canvas
function zoomCanvas(zoomFactor, clientX, clientY) {
  // Calculate new scale
  const newScale = canvasScale * (1 + zoomFactor);
  
  // Enforce zoom limits
  if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) return;
  
  // Store old scale for reference in connection updates
  const oldScale = canvasScale;
  
  // If zooming with the mouse wheel, zoom toward cursor position
  if (clientX !== undefined && clientY !== undefined) {
    // Calculate zoom around cursor position
    const zoomOriginX = clientX - canvasContainerRect.left;
    const zoomOriginY = clientY - canvasContainerRect.top;
    
    // Adjust the offset to zoom toward the mouse position
    canvasOffset.x = zoomOriginX - ((zoomOriginX - canvasOffset.x) * (1 + zoomFactor));
    canvasOffset.y = zoomOriginY - ((zoomOriginY - canvasOffset.y) * (1 + zoomFactor));
  } else {
    // For button zooms, zoom toward the center of the container
    const containerWidth = canvasContainerRect.width;
    const containerHeight = canvasContainerRect.height;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Adjust the offset to zoom toward the center
    canvasOffset.x = centerX - ((centerX - canvasOffset.x) * (1 + zoomFactor));
    canvasOffset.y = centerY - ((centerY - canvasOffset.y) * (1 + zoomFactor));
  }
  
  // Update the scale
  canvasScale = newScale;
  
  // Apply the transform
  updateCanvasTransform();
}

// Update canvas transformation
function updateCanvasTransform() {
  const transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`;
  canvasElement.style.transform = transform;
  connectionsLayer.style.transform = transform;
  
  // Update grid position based on canvas transform
  updateCanvasGridPosition();
  
  // Force connection line update on zoom change
  updateAllConnections();
}

// Create a dynamic background grid pattern that gives the illusion of infinity
function updateCanvasGridPattern() {
  // Set pattern size based on zoom
  const patternSize = 20; // Base grid size
  
  // This ensures the grid pattern works at any zoom level
  canvasElement.style.backgroundSize = `${patternSize}px ${patternSize}px`;
  
  // Match the background color between canvas and container to avoid any visible boundaries
  const canvasContainer = document.querySelector('.canvas-container');
  if (canvasContainer) {
    canvasContainer.style.backgroundColor = '#f5f7fa';
  }
}

// Update the background grid position to give the impression of infinite scrolling
function updateCanvasGridPosition() {
  // Calculate offset for the background grid
  const offsetX = canvasOffset.x % 20;
  const offsetY = canvasOffset.y % 20;
  
  // Apply the background position
  canvasElement.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
}

// Center the canvas view on all nodes
function centerCanvasView() {
  if (nodes.length === 0) return;
  
  // Get canvas container dimensions
  const containerWidth = canvasContainerRect.width;
  const containerHeight = canvasContainerRect.height;
  
  // Calculate the bounding box of all nodes
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + 200); // Approximate node height
  });
  
  // Calculate the center of all nodes
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Calculate the width and height of all nodes
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Calculate the scale to fit all nodes with padding
  const scaleX = (containerWidth - 100) / (width + NODE_SPACING * 2);
  const scaleY = (containerHeight - 100) / (height + NODE_SPACING * 2);
  const newScale = Math.min(scaleX, scaleY, 1); // Limit zoom out to 1x
  
  // Update scale and center the view
  canvasScale = Math.max(newScale, 0.4); // Ensure minimum scale
  canvasOffset.x = containerWidth / 2 - centerX * canvasScale;
  canvasOffset.y = containerHeight / 2 - centerY * canvasScale;
  
  updateCanvasTransform();
}

// Reset canvas view to default
function resetCanvasView() {
  canvasScale = DEFAULT_ZOOM;
  
  // Center the view
  const containerWidth = canvasContainerRect.width;
  const containerHeight = canvasContainerRect.height;
  canvasOffset.x = containerWidth / 2;
  canvasOffset.y = containerHeight / 2;
  
  updateCanvasTransform();
}

// Center on a specific node
function centerOnNode(node) {
  if (!node) return;
  
  // Get canvas dimensions
  const containerWidth = canvasContainerRect.width;
  const containerHeight = canvasContainerRect.height;
  
  // Set zoom to 1 for consistent view
  canvasScale = 1;
  
  // Center the canvas on this node
  canvasOffset.x = containerWidth / 2 - (node.position.x + NODE_WIDTH / 2) * canvasScale;
  canvasOffset.y = containerHeight / 2 - (node.position.y + 100) * canvasScale; // Approximate node height / 2
  
  updateCanvasTransform();
}

// Select a node
function selectNode(node) {
  // Deselect previously selected node
  if (selectedNode) {
    const prevElement = document.getElementById(`node-${selectedNode.id}`);
    if (prevElement) {
      prevElement.classList.remove('selected');
    }
    
    // Remove active class from list item
    const prevListItem = document.querySelector(`.node-list-item[data-node-id="${selectedNode.id}"]`);
    if (prevListItem) {
      prevListItem.classList.remove('active');
    }
  }
  
  // Update selected node
  selectedNode = node;
  
  if (node) {
    // Add selected class to node
    const nodeElement = document.getElementById(`node-${node.id}`);
    if (nodeElement) {
      nodeElement.classList.add('selected');
    }
    
    // Add active class to list item
    const listItem = document.querySelector(`.node-list-item[data-node-id="${node.id}"]`);
    if (listItem) {
      listItem.classList.add('active');
      listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Connection handling
function startConnection(node, type, event) {
  isConnecting = true;
  
  // Store the source node and connection type
  connectionSource = {
    node: node,
    type: type,
    element: event.target
  };
  
  // Add active source class
  event.target.classList.add('active-source');
  
  // Create temporary connection
  drawTemporaryConnection();
}

// Update connection handling for unbounded canvas
function createConnectionLine(connection) {
  // Make sure SVG container exists
  const svg = ensureSVG();
  
  // Find the source and target nodes
  const sourceNode = nodes.find(n => n.id === connection.sourceId);
  const targetNode = nodes.find(n => n.id === connection.targetId);
  
  if (!sourceNode || !targetNode) return;
  
  // Create SVG path for the connection
  const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  connectionLine.classList.add('connection-line');
  connectionLine.dataset.connectionId = connection.id;
  
  // Calculate source and target points
  const sourceX = sourceNode.position.x + NODE_WIDTH; // Output is on right
  const sourceY = sourceNode.position.y + 15; // Aligned with connection point
  const targetX = targetNode.position.x; // Input is on left
  const targetY = targetNode.position.y + 15; // Aligned with connection point
  
  // Draw bezier curve path
  const path = buildConnectionPath(sourceX, sourceY, targetX, targetY, 'output');
  connectionLine.setAttribute('d', path);
  
  // Add to SVG container
  svg.appendChild(connectionLine);
}

// Make sure SVG is created and added properly
function ensureSVG() {
  // Check if SVG element already exists
  let svg = connectionsLayer.querySelector('svg');
  
  if (!svg) {
    // Create SVG element if it doesn't exist
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none'; // Ensure it doesn't block interactions
    connectionsLayer.appendChild(svg);
  }
  
  return svg;
}

// Override temporary connection creation
function drawTemporaryConnection() {
  // Make sure SVG container exists
  const svg = ensureSVG();
  
  // Remove any existing temporary connection
  if (temporaryConnection && temporaryConnection.parentNode) {
    temporaryConnection.parentNode.removeChild(temporaryConnection);
  }
  
  if (!connectionSource) return;
  
  // Create SVG path for the connection
  temporaryConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  temporaryConnection.classList.add('connection-line', 'active');
  
  // Calculate connection points
  const sourceNode = connectionSource.node;
  const sourceType = connectionSource.type;
  
  // Calculate source point in canvas coordinates
  const sourceX = sourceType === 'output' 
    ? (sourceNode.position.x + NODE_WIDTH)
    : sourceNode.position.x;
  const sourceY = sourceNode.position.y + 15; // Aligned with connection point
  
  // Calculate target point (mouse position) in canvas coordinates
  const canvasCoord = pageToCanvasCoord(mousePosition.x, mousePosition.y);
  
  // Draw bezier curve path
  const path = buildConnectionPath(sourceX, sourceY, canvasCoord.x, canvasCoord.y, sourceType);
  temporaryConnection.setAttribute('d', path);
  
  // Add to SVG
  svg.appendChild(temporaryConnection);
  
  // Check if mouse is over a valid connection point
  findPotentialConnectionTarget();
}

function findPotentialConnectionTarget() {
  // Reset any previously highlighted targets
  document.querySelectorAll('.connection-point.active-target').forEach(el => {
    el.classList.remove('active-target');
  });
  
  // If no connection is active, return
  if (!isConnecting || !connectionSource) return;
  
  // Validate that we can only connect output->input or input->output
  const validTargetType = connectionSource.type === 'output' ? 'input' : 'output';
  
  // Find all potential connection points
  const connectionPoints = document.querySelectorAll(`.connection-point.${validTargetType}`);
  
  // Check each connection point
  connectionPoints.forEach(point => {
    // Skip if it's the source node
    if (point.dataset.nodeId === connectionSource.node.id) return;
    
    // Check if mouse is over this point
    const rect = point.getBoundingClientRect();
    if (
      mousePosition.x >= rect.left &&
      mousePosition.x <= rect.right &&
      mousePosition.y >= rect.top &&
      mousePosition.y <= rect.bottom
    ) {
      // Highlight this point as a potential target
      point.classList.add('active-target');
    }
  });
}

// Clean up connection handling
function finishConnection(event) {
  // If no connection is active, return
  if (!isConnecting || !connectionSource) return;
  
  // Find target element under mouse
  const element = document.elementFromPoint(mousePosition.x, mousePosition.y);
  
  // Check if element is a connection point
  if (
    element && 
    element.classList.contains('connection-point') && 
    element !== connectionSource.element
  ) {
    // Get target node and connection type
    const targetNodeId = element.dataset.nodeId;
    const targetType = element.dataset.type;
    
    // Validate connection types (output->input or input->output)
    if (
      (connectionSource.type === 'output' && targetType === 'input') ||
      (connectionSource.type === 'input' && targetType === 'output')
    ) {
      // Find the source and target nodes
      const sourceNode = nodes.find(n => n.id === connectionSource.node.id);
      const targetNode = nodes.find(n => n.id === targetNodeId);
      
      if (sourceNode && targetNode) {
        // Create the connection
        const connection = {
          id: Date.now().toString(),
          sourceId: connectionSource.type === 'output' ? sourceNode.id : targetNode.id,
          targetId: connectionSource.type === 'output' ? targetNode.id : sourceNode.id
        };
        
        // Check if this connection already exists
        const connectionExists = connections.some(c => 
          (c.sourceId === connection.sourceId && c.targetId === connection.targetId) ||
          (c.sourceId === connection.targetId && c.targetId === connection.sourceId)
        );
        
        if (!connectionExists) {
          // Add connection to list
          connections.push(connection);
          
          // Create permanent connection line
          createConnectionLine(connection);
        }
      }
    }
  }
  
  // Cleanup
  if (temporaryConnection && temporaryConnection.parentNode) {
    temporaryConnection.parentNode.removeChild(temporaryConnection);
  }
  
  if (connectionSource && connectionSource.element) {
    connectionSource.element.classList.remove('active-source');
  }
  
  document.querySelectorAll('.connection-point.active-target').forEach(el => {
    el.classList.remove('active-target');
  });
  
  temporaryConnection = null;
  connectionSource = null;
  isConnecting = false;
}

function buildConnectionPath(sourceX, sourceY, targetX, targetY, sourceType) {
  // Calculate control points for the bezier curve
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  
  // Make control points scale with distance and zoom level
  // Use a percentage of distance rather than fixed value for better scaling
  const distance = Math.sqrt(dx * dx + dy * dy);
  const controlDistance = Math.min(dx * 0.5, distance * 0.5);
  
  // Adjust control points based on connection direction
  const sourceControlX = sourceType === 'output' 
    ? sourceX + controlDistance
    : sourceX - controlDistance;
  const targetControlX = sourceType === 'output'
    ? targetX - controlDistance
    : targetX + controlDistance;
  
  // Create the path
  return `M ${sourceX} ${sourceY} C ${sourceControlX} ${sourceY}, ${targetControlX} ${targetY}, ${targetX} ${targetY}`;
}

// Update node connections
function updateNodeConnections(node) {
  // Find all connections involving this node
  const nodeConnections = connections.filter(c => 
    c.sourceId === node.id || c.targetId === node.id
  );
  
  // Update each connection line
  nodeConnections.forEach(connection => {
    const connectionLine = document.querySelector(`path[data-connection-id="${connection.id}"]`);
    if (!connectionLine) return;
    
    // Find the source and target nodes
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    
    if (!sourceNode || !targetNode) return;
    
    // Calculate source and target points
    const sourceX = sourceNode.position.x + NODE_WIDTH; // Output is on right
    const sourceY = sourceNode.position.y + 15; // Aligned with connection point
    const targetX = targetNode.position.x; // Input is on left
    const targetY = targetNode.position.y + 15; // Aligned with connection point
    
    // Update path
    const path = buildConnectionPath(sourceX, sourceY, targetX, targetY, 'output');
    connectionLine.setAttribute('d', path);
  });
}

// Add a function to update all connections, useful for zoom changes
function updateAllConnections() {
  connections.forEach(connection => {
    const connectionLine = document.querySelector(`path[data-connection-id="${connection.id}"]`);
    if (!connectionLine) return;
    
    // Find the source and target nodes
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    
    if (!sourceNode || !targetNode) return;
    
    // Calculate source and target points
    const sourceX = sourceNode.position.x + NODE_WIDTH; // Output is on right
    const sourceY = sourceNode.position.y + 15; // Aligned with connection point
    const targetX = targetNode.position.x; // Input is on left
    const targetY = targetNode.position.y + 15; // Aligned with connection point
    
    // Update path
    const path = buildConnectionPath(sourceX, sourceY, targetX, targetY, 'output');
    connectionLine.setAttribute('d', path);
  });
}

// Modal functions
function showCreateNodeModal() {
  modal.style.display = 'block';
  modalPromptInput.focus();
}

function hideCreateNodeModal() {
  modal.style.display = 'none';
  modalPromptInput.value = '';
}

function handleModalCreateNode() {
  const promptText = modalPromptInput.value.trim();
  
  if (!promptText) {
    alert('Please enter a prompt');
    return;
  }
  
  hideCreateNodeModal();
  createNodeFromPrompt(promptText);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 