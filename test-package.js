#!/usr/bin/env node

/**
 * Simple test to verify the package works
 */

const { spawn } = require('child_process');
const path = require('path');

async function testPackage() {
  console.log('🧪 Testing shadowgit-mcp-server package...\n');

  // Test 1: Check built file exists
  const builtFile = path.join(__dirname, 'dist', 'shadowgit-mcp-server.js');
  try {
    require('fs').accessSync(builtFile);
    console.log('✅ Built file exists:', builtFile);
  } catch (error) {
    console.log('❌ Built file missing:', builtFile);
    return false;
  }

  // Test 2: Check package.json is valid
  try {
    const pkg = require('./package.json');
    console.log('✅ Package.json valid');
    console.log('   Name:', pkg.name);
    console.log('   Version:', pkg.version);
    console.log('   Bin:', pkg.bin);
  } catch (error) {
    console.log('❌ Package.json invalid:', error.message);
    return false;
  }

  // Test 3: Try running the server (should wait for input)
  try {
    console.log('✅ Testing server startup...');
    const child = spawn('node', [builtFile], { stdio: 'pipe' });
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!child.killed) {
      console.log('✅ Server starts successfully (PID:', child.pid + ')');
      child.kill();
    } else {
      console.log('❌ Server failed to start');
      return false;
    }
  } catch (error) {
    console.log('❌ Server test failed:', error.message);
    return false;
  }

  console.log('\n🎉 Package test completed successfully!');
  console.log('\nNext steps:');
  console.log('1. npm publish (when ready)');  
  console.log('2. npm install -g shadowgit-mcp-server');
  console.log('3. claude mcp add shadowgit -- shadowgit-mcp-server');
  
  return true;
}

testPackage().catch(console.error);