const axios = require('axios');

async function testLocalApi() {
  try {
    console.log('Testing local API endpoint...');
    console.log('Sending request to: http://localhost:3002/api/ask');
    
    const response = await axios({
      method: 'post',
      url: 'http://localhost:3002/api/ask',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        prompt: "What is the capital of France?"
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.response) {
      console.log('AI response:', response.data.response);
    } else {
      console.log('No response data found');
    }
  } catch (error) {
    console.error('Error testing local API:', error.message || 'Unknown error');
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.syscall) {
      console.error('System call:', error.syscall);
    }
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Request was made but no response received');
      console.error('Request details:', error.request._currentUrl || error.request.path || 'No details available');
    } else {
      console.error('Error details:', error.toString());
    }
  }
}

console.log('Starting API test...');
testLocalApi().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Unhandled error:', err);
}); 