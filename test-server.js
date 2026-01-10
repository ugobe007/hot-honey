// Quick test to verify server can start
const http = require('http');

const testRequest = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
};

console.log('Testing server connection...');
testRequest()
  .then(result => {
    console.log('✅ Server is responding!', result);
    process.exit(0);
  })
  .catch(error => {
    console.log('❌ Server is not responding:', error.message);
    console.log('💡 Make sure to run: node server/index.js');
    process.exit(1);
  });
