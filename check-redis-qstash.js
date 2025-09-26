#!/usr/bin/env node

// Simple script to check Redis and QStash configuration
// Run with: node check-redis-qstash.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Redis and QStash Configuration...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('📋 Please create .env.local based on .env.example');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('\n📄 .env.example content:');
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    const redisLines = exampleContent.split('\n').filter(line => 
      line.includes('UPSTASH') || line.includes('QSTASH') || line.startsWith('#')
    );
    redisLines.forEach(line => console.log(`   ${line}`));
  }
  
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

console.log('📋 Environment Variables Status:');
console.log('================================');

// Check Redis configuration
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log(`🔴 Redis URL: ${redisUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`🔴 Redis Token: ${redisToken ? '✅ Set' : '❌ Missing'}`);

if (redisUrl) {
  console.log(`   URL: ${redisUrl.substring(0, 30)}...`);
}

// Check QStash configuration
const qstashToken = process.env.QSTASH_TOKEN;
const qstashCurrentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const qstashNextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

console.log(`🟡 QStash Token: ${qstashToken ? '✅ Set' : '❌ Missing'}`);
console.log(`🟡 QStash Current Key: ${qstashCurrentKey ? '✅ Set' : '❌ Missing'}`);
console.log(`🟡 QStash Next Key: ${qstashNextKey ? '✅ Set' : '❌ Missing'}`);

// Test Redis connection if configured
if (redisUrl && redisToken) {
  console.log('\n🔄 Testing Redis Connection...');
  testRedisConnection(redisUrl, redisToken);
} else {
  console.log('\n❌ Cannot test Redis - missing configuration');
}

// Test QStash if configured
if (qstashToken) {
  console.log('\n🔄 Testing QStash Connection...');
  testQStashConnection(qstashToken);
} else {
  console.log('\n❌ Cannot test QStash - missing token');
}

async function testRedisConnection(url, token) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test basic Redis operation
    const testKey = 'health_check_' + Date.now();
    const testValue = 'test_value';
    
    // SET operation
    const setResponse = await fetch(`${url}/set/${testKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testValue)
    });
    
    if (!setResponse.ok) {
      throw new Error(`SET failed: ${setResponse.status} ${setResponse.statusText}`);
    }
    
    // GET operation
    const getResponse = await fetch(`${url}/get/${testKey}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const result = await getResponse.json();
    
    // DELETE operation
    await fetch(`${url}/del/${testKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (result.result === testValue) {
      console.log('✅ Redis connection successful!');
      console.log('   - SET operation: ✅');
      console.log('   - GET operation: ✅');
      console.log('   - DELETE operation: ✅');
    } else {
      console.log('❌ Redis test failed - value mismatch');
    }
    
  } catch (error) {
    console.log('❌ Redis connection failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('   💡 Check your Redis token');
    } else if (error.message.includes('404')) {
      console.log('   💡 Check your Redis URL');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   💡 Check your internet connection');
    }
  }
}

async function testQStashConnection(token) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test QStash API access
    const response = await fetch('https://qstash.upstash.io/v2/queues', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ QStash connection successful!');
      console.log('   - API access: ✅');
      
      const queues = await response.json();
      console.log(`   - Available queues: ${queues.length || 0}`);
    } else {
      throw new Error(`QStash API failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log('❌ QStash connection failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('   💡 Check your QStash token');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   💡 Check your internet connection');
    }
  }
}

// Check package.json dependencies
console.log('\n📦 Checking Dependencies...');
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    '@upstash/redis',
    '@upstash/ratelimit', 
    '@upstash/qstash'
  ];
  
  requiredDeps.forEach(dep => {
    if (deps[dep]) {
      console.log(`✅ ${dep}: ${deps[dep]}`);
    } else {
      console.log(`❌ ${dep}: Not installed`);
      console.log(`   Run: npm install ${dep}`);
    }
  });
}

console.log('\n🎯 Summary:');
console.log('===========');

const redisConfigured = redisUrl && redisToken;
const qstashConfigured = qstashToken;

if (redisConfigured && qstashConfigured) {
  console.log('✅ Both Redis and QStash are configured');
  console.log('🚀 Your app should work with caching and background jobs');
} else if (redisConfigured) {
  console.log('⚠️  Redis configured, QStash missing');
  console.log('📝 You\'ll have caching but no background job processing');
} else if (qstashConfigured) {
  console.log('⚠️  QStash configured, Redis missing');
  console.log('📝 You\'ll have background jobs but no caching');
} else {
  console.log('❌ Neither Redis nor QStash configured');
  console.log('📝 App will work but without performance optimizations');
}

console.log('\n💡 Next Steps:');
if (!redisConfigured) {
  console.log('1. Get Redis credentials from https://console.upstash.com/redis');
  console.log('2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local');
}
if (!qstashConfigured) {
  console.log('1. Get QStash credentials from https://console.upstash.com/qstash');
  console.log('2. Add QSTASH_TOKEN to .env.local');
}

console.log('\n🔧 To test the health endpoint when server is running:');
console.log('   curl http://localhost:3000/api/health/redis');
