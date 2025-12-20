#!/usr/bin/env node
/**
 * PM2 Setup Checker
 * Checks PM2 installation and provides setup instructions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Checking PM2 Setup...\n');
console.log('═'.repeat(60));

// Check if PM2 is installed
let pm2Installed = false;
try {
  execSync('pm2 --version', { stdio: 'pipe' });
  pm2Installed = true;
  console.log('✅ PM2 is installed');
} catch (e) {
  console.log('❌ PM2 is NOT installed');
  console.log('\n📦 To install PM2:');
  console.log('   npm install -g pm2\n');
}

if (!pm2Installed) {
  process.exit(1);
}

// Check PM2 daemon status
let daemonRunning = false;
try {
  const status = execSync('pm2 ping', { stdio: 'pipe', encoding: 'utf-8' });
  daemonRunning = true;
  console.log('✅ PM2 daemon is running');
} catch (e) {
  console.log('⚠️  PM2 daemon is not running');
  console.log('\n🔧 To start PM2 daemon:');
  console.log('   pm2 kill  # Clean any existing daemon');
  console.log('   pm2 start ecosystem.config.js');
  console.log('   pm2 save  # Save process list');
  console.log('   pm2 startup  # Enable auto-start on reboot\n');
}

// Check if ecosystem.config.js exists
const ecosystemPath = path.join(process.cwd(), 'ecosystem.config.js');
if (fs.existsSync(ecosystemPath)) {
  console.log('✅ ecosystem.config.js found');
} else {
  console.log('❌ ecosystem.config.js NOT found');
  console.log('   Expected at:', ecosystemPath);
}

// Check PM2 process list
if (daemonRunning) {
  try {
    console.log('\n📋 Current PM2 Processes:');
    console.log('─'.repeat(60));
    execSync('pm2 list', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️  Could not list PM2 processes');
  }
}

console.log('\n' + '═'.repeat(60));
console.log('\n💡 Quick Commands:');
console.log('   pm2 status          - View process status');
console.log('   pm2 logs            - View all logs');
console.log('   pm2 logs <name>     - View specific process logs');
console.log('   pm2 restart all     - Restart all processes');
console.log('   pm2 stop all        - Stop all processes');
console.log('   pm2 monit           - Monitor processes in real-time');
console.log('   pm2 delete all      - Remove all processes');
console.log('\n');

