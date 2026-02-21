const http = require('http');

const data = JSON.stringify({
  name: "Test User",
  age: 25,
  email: "test@example.com",
  phone: "1234567890",
  tnElectricityId: "TN123",
  password: "test123"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
