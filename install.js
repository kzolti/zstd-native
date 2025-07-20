const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verify node-addon-api exists
try {
  const apiPath = path.dirname(require.resolve('node-addon-api'));
  console.log('Found node-addon-api at:', apiPath);
} catch (e) {
  console.error('node-addon-api not found! Installing dependencies...');
  execSync('npm install --production', { stdio: 'inherit' });
}

// Proceed with build
console.log('Building native module...');
execSync('npx node-gyp configure build', { stdio: 'inherit' });