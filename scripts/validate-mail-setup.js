#!/usr/bin/env node

/**
 * MAIL Module Environment Validation Script
 * 
 * This script validates that all required environment variables
 * are properly configured for the MAIL module.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Required environment variables
const requiredVars = {
  'Core Infrastructure': [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QSTASH_TOKEN'
  ],
  'Email Delivery': [
    'ZEPTOMAIL_API_KEY',
    'ZEPTOMAIL_DOMAIN'
  ],
  'Billing System': [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ]
};

// Optional environment variables
const optionalVars = {
  'Email Features': [
    'ZEPTOMAIL_WEBHOOK_SECRET',
    'SMTP_HOST',
    'SMTP_PORT'
  ],
  'Billing Features': [
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_STARTER_PRICE_ID',
    'STRIPE_PROFESSIONAL_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID'
  ],
  'Domain Automation': [
    'CLOUDFLARE_API_TOKEN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ],
  'Security': [
    'ENCRYPTION_KEY',
    'JWT_SECRET'
  ]
};

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env.local file not found!${colors.reset}`);
    console.log(`${colors.yellow}💡 Copy .env.local.example to .env.local and fill in your values${colors.reset}`);
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (value && value !== 'your_value_here' && !value.startsWith('your_')) {
        env[key.trim()] = value;
      }
    }
  });

  return env;
}

function validateVariable(varName, value, isRequired = true) {
  const status = value ? '✅' : (isRequired ? '❌' : '⚠️');
  const statusText = value ? 'SET' : (isRequired ? 'MISSING' : 'OPTIONAL');
  const color = value ? colors.green : (isRequired ? colors.red : colors.yellow);
  
  console.log(`  ${status} ${varName.padEnd(35)} ${color}${statusText}${colors.reset}`);
  
  return value ? 1 : 0;
}

function validateSection(title, variables, env, isRequired = true) {
  console.log(`\n${colors.bold}${colors.blue}📋 ${title}${colors.reset}`);
  console.log('─'.repeat(50));
  
  let setCount = 0;
  let totalCount = variables.length;
  
  variables.forEach(varName => {
    setCount += validateVariable(varName, env[varName], isRequired);
  });
  
  const percentage = Math.round((setCount / totalCount) * 100);
  const color = percentage === 100 ? colors.green : (percentage >= 50 ? colors.yellow : colors.red);
  
  console.log(`\n${color}📊 ${setCount}/${totalCount} variables configured (${percentage}%)${colors.reset}`);
  
  return { setCount, totalCount, percentage };
}

function generateSetupInstructions(missingVars) {
  if (missingVars.length === 0) return;
  
  console.log(`\n${colors.bold}${colors.yellow}🔧 Setup Instructions for Missing Variables:${colors.reset}`);
  console.log('─'.repeat(60));
  
  const instructions = {
    'NEXT_PUBLIC_SUPABASE_URL': '1. Go to https://supabase.com → Create project → Settings → API',
    'SUPABASE_SERVICE_ROLE_KEY': '2. Copy Service Role Key from Supabase Settings → API',
    'UPSTASH_REDIS_REST_URL': '3. Go to https://console.upstash.com/redis → Create database',
    'UPSTASH_REDIS_REST_TOKEN': '4. Copy Redis REST Token from Upstash dashboard',
    'QSTASH_TOKEN': '5. Go to https://console.upstash.com/qstash → Copy token',
    'ZEPTOMAIL_API_KEY': '6. Go to https://zeptomail.zoho.com → Settings → API',
    'ZEPTOMAIL_DOMAIN': '7. Add and verify your domain in ZeptoMail',
    'STRIPE_SECRET_KEY': '8. Go to https://stripe.com → Developers → API keys',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': '9. Copy Publishable Key from Stripe dashboard'
  };
  
  missingVars.forEach(varName => {
    if (instructions[varName]) {
      console.log(`${colors.yellow}${instructions[varName]}${colors.reset}`);
    }
  });
}

function main() {
  console.log(`${colors.bold}${colors.blue}🚀 MAIL Module Environment Validation${colors.reset}`);
  console.log('═'.repeat(60));
  
  const env = loadEnvFile();
  
  if (Object.keys(env).length === 0) {
    console.log(`\n${colors.red}❌ No valid environment variables found${colors.reset}`);
    process.exit(1);
  }
  
  let totalRequired = 0;
  let totalRequiredSet = 0;
  let missingRequired = [];
  
  // Validate required variables
  Object.entries(requiredVars).forEach(([section, variables]) => {
    const result = validateSection(section, variables, env, true);
    totalRequired += result.totalCount;
    totalRequiredSet += result.setCount;
    
    variables.forEach(varName => {
      if (!env[varName]) {
        missingRequired.push(varName);
      }
    });
  });
  
  // Validate optional variables
  Object.entries(optionalVars).forEach(([section, variables]) => {
    validateSection(section, variables, env, false);
  });
  
  // Overall summary
  console.log(`\n${colors.bold}📊 OVERALL SUMMARY${colors.reset}`);
  console.log('═'.repeat(40));
  
  const overallPercentage = Math.round((totalRequiredSet / totalRequired) * 100);
  const summaryColor = overallPercentage === 100 ? colors.green : (overallPercentage >= 80 ? colors.yellow : colors.red);
  
  console.log(`${summaryColor}Required Variables: ${totalRequiredSet}/${totalRequired} (${overallPercentage}%)${colors.reset}`);
  
  if (overallPercentage === 100) {
    console.log(`\n${colors.green}🎉 All required environment variables are configured!${colors.reset}`);
    console.log(`${colors.green}✅ Your MAIL module is ready to use${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Missing ${missingRequired.length} required variables${colors.reset}`);
    generateSetupInstructions(missingRequired);
  }
  
  // Next steps
  console.log(`\n${colors.bold}🎯 Next Steps:${colors.reset}`);
  console.log('─'.repeat(20));
  
  if (overallPercentage < 100) {
    console.log(`${colors.yellow}1. Set missing environment variables${colors.reset}`);
    console.log(`${colors.yellow}2. Restart your development server${colors.reset}`);
    console.log(`${colors.yellow}3. Run this script again to verify${colors.reset}`);
  } else {
    console.log(`${colors.green}1. Run database migration: database/migrations/20250113_mail_module_setup.sql${colors.reset}`);
    console.log(`${colors.green}2. Start development server: npm run dev${colors.reset}`);
    console.log(`${colors.green}3. Visit http://localhost:3000/mail${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}📖 Full setup guide: docs/MAIL_MODULE_SETUP.md${colors.reset}`);
  
  process.exit(overallPercentage === 100 ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { loadEnvFile, validateVariable, validateSection };
