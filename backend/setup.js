#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupShipMasterPro() {
  console.clear();
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     Welcome to ShipMaster Pro Setup Wizard! 🚀               ║
║                                                               ║
║     This wizard will help you configure your environment      ║
║     and connect to your database.                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n${colors.yellow}📋 Prerequisites:${colors.reset}`);
  console.log('  • Node.js 16+ installed');
  console.log('  • Supabase account (free tier works)');
  console.log('  • About 5 minutes of your time\n');

  await question(`Press ${colors.green}Enter${colors.reset} to continue...`);

  // Step 1: Check if .env exists
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log(`\n${colors.cyan}Creating .env file from template...${colors.reset}`);
    fs.copyFileSync(envExamplePath, envPath);
  }

  // Step 2: Supabase Setup
  console.log(`\n${colors.bright}${colors.green}Step 1: Supabase Configuration${colors.reset}`);
  console.log('\nFirst, let\'s set up your Supabase connection.');
  console.log(`\n${colors.yellow}Need a Supabase account?${colors.reset}`);
  console.log(`Visit: ${colors.blue}https://supabase.com${colors.reset} (it's free!)\n`);

  const hasSupabase = await question(`Do you have a Supabase project ready? (${colors.green}y${colors.reset}/${colors.red}n${colors.reset}): `);
  
  if (hasSupabase.toLowerCase() !== 'y') {
    console.log(`\n${colors.yellow}📝 Quick Supabase Setup Guide:${colors.reset}`);
    console.log('1. Go to https://supabase.com and sign up');
    console.log('2. Click "New Project"');
    console.log('3. Choose a name and password');
    console.log('4. Wait for project to be ready (~2 minutes)');
    console.log('5. Go to Settings > API to find your credentials\n');
    
    await question(`Press ${colors.green}Enter${colors.reset} when you have your Supabase project ready...`);
  }

  console.log(`\n${colors.cyan}Enter your Supabase credentials:${colors.reset}`);
  console.log(`(Find these in Supabase Dashboard > Settings > API)\n`);

  const supabaseUrl = await question(`Supabase URL (https://xxxxx.supabase.co): `);
  const supabaseAnonKey = await question(`Supabase Anon Key: `);
  const supabaseServiceKey = await question(`Supabase Service Role Key: `);

  // Step 3: Generate secure JWT secret
  console.log(`\n${colors.bright}${colors.green}Step 2: Security Configuration${colors.reset}`);
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  console.log(`${colors.green}✓${colors.reset} Generated secure JWT secret`);

  // Step 4: Optional configurations
  console.log(`\n${colors.bright}${colors.green}Step 3: Optional Services${colors.reset}`);
  const configureOptional = await question(`\nConfigure optional services now? (${colors.green}y${colors.reset}/${colors.red}n${colors.reset}): `);
  
  let shopifyApiVersion = '2023-07';
  let smtpHost = '';
  let smtpPort = '587';
  let smtpUser = '';
  let smtpPass = '';

  if (configureOptional.toLowerCase() === 'y') {
    console.log(`\n${colors.cyan}Shopify Configuration (press Enter to skip):${colors.reset}`);
    const shopifyVersion = await question(`Shopify API Version [${shopifyApiVersion}]: `);
    if (shopifyVersion) shopifyApiVersion = shopifyVersion;

    console.log(`\n${colors.cyan}Email Configuration (for notifications):${colors.reset}`);
    smtpHost = await question(`SMTP Host (e.g., smtp.gmail.com): `);
    if (smtpHost) {
      smtpPort = await question(`SMTP Port [587]: `) || '587';
      smtpUser = await question(`SMTP Username: `);
      smtpPass = await question(`SMTP Password: `);
    }
  }

  // Step 5: Write configuration
  console.log(`\n${colors.cyan}Writing configuration...${colors.reset}`);
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update Supabase settings
  envContent = envContent.replace(/SUPABASE_URL=.*/g, `SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/SUPABASE_ANON_KEY=.*/g, `SUPABASE_ANON_KEY=${supabaseAnonKey}`);
  envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, `SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}`);
  envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
  
  // Update optional settings
  if (shopifyApiVersion) {
    envContent = envContent.replace(/SHOPIFY_API_VERSION=.*/g, `SHOPIFY_API_VERSION=${shopifyApiVersion}`);
  }
  if (smtpHost) {
    envContent = envContent.replace(/SMTP_HOST=.*/g, `SMTP_HOST=${smtpHost}`);
    envContent = envContent.replace(/SMTP_PORT=.*/g, `SMTP_PORT=${smtpPort}`);
    envContent = envContent.replace(/SMTP_USER=.*/g, `SMTP_USER=${smtpUser}`);
    envContent = envContent.replace(/SMTP_PASS=.*/g, `SMTP_PASS=${smtpPass}`);
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`${colors.green}✓${colors.reset} Configuration saved to .env`);

  // Step 6: Database Schema
  console.log(`\n${colors.bright}${colors.green}Step 4: Database Setup${colors.reset}`);
  console.log('\nNow we need to create the database tables.');
  console.log(`\n${colors.yellow}Instructions:${colors.reset}`);
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Click on "SQL Editor" in the left sidebar');
  console.log('3. Click "New Query"');
  console.log(`4. Copy ALL contents from: ${colors.cyan}backend/src/models/supabase/schema.sql${colors.reset}`);
  console.log('5. Paste into the SQL editor');
  console.log('6. Click "Run" to create all tables\n');

  const schemaPath = path.join(__dirname, 'src/models/supabase/schema.sql');
  const openSchema = await question(`Open schema.sql file now? (${colors.green}y${colors.reset}/${colors.red}n${colors.reset}): `);
  
  if (openSchema.toLowerCase() === 'y') {
    try {
      if (process.platform === 'win32') {
        execSync(`start ${schemaPath}`);
      } else if (process.platform === 'darwin') {
        execSync(`open ${schemaPath}`);
      } else {
        execSync(`xdg-open ${schemaPath}`);
      }
      console.log(`${colors.green}✓${colors.reset} Opened schema.sql file`);
    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Please manually open: ${schemaPath}`);
    }
  }

  await question(`\nPress ${colors.green}Enter${colors.reset} after you've run the SQL in Supabase...`);

  // Step 7: Test Connection
  console.log(`\n${colors.bright}${colors.green}Step 5: Testing Connection${colors.reset}`);
  console.log('\nTesting your Supabase connection...');
  
  // Import and test connection
  try {
    require('dotenv').config();
    const { getSupabaseManager } = require('./src/config/supabase');
    const manager = getSupabaseManager();
    
    console.log(`${colors.cyan}Connecting to Supabase...${colors.reset}`);
    const isHealthy = await manager.performHealthCheck();
    
    if (isHealthy) {
      console.log(`${colors.green}✓ Successfully connected to Supabase!${colors.reset}`);
      const metrics = manager.getConnectionMetrics();
      console.log(`${colors.green}✓ Database health: ${metrics.health}${colors.reset}`);
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Connection failed: ${error.message}${colors.reset}`);
    console.log(`\n${colors.yellow}Please check:${colors.reset}`);
    console.log('1. Your Supabase credentials are correct');
    console.log('2. The database schema was created successfully');
    console.log('3. Your Supabase project is active (not paused)\n');
    
    const retry = await question(`Retry connection? (${colors.green}y${colors.reset}/${colors.red}n${colors.reset}): `);
    if (retry.toLowerCase() === 'y') {
      rl.close();
      return setupShipMasterPro();
    }
  }

  // Step 8: Start Server
  console.log(`\n${colors.bright}${colors.green}Step 6: Start the Server${colors.reset}`);
  const startServer = await question(`\nStart the server now? (${colors.green}y${colors.reset}/${colors.red}n${colors.reset}): `);
  
  if (startServer.toLowerCase() === 'y') {
    console.log(`\n${colors.cyan}Starting ShipMaster Pro...${colors.reset}`);
    console.log('Server will start on http://localhost:3002');
    console.log(`Press ${colors.yellow}Ctrl+C${colors.reset} to stop the server\n`);
    
    rl.close();
    
    // Start the server
    require('./src/index.js');
  } else {
    console.log(`\n${colors.bright}${colors.green}🎉 Setup Complete!${colors.reset}`);
    console.log('\nTo start the server later, run:');
    console.log(`  ${colors.cyan}npm run dev${colors.reset}`);
    console.log('\nTo initialize system tags:');
    console.log(`  ${colors.cyan}curl -X POST http://localhost:3002/api/system/initialize${colors.reset}`);
    console.log(`\n${colors.green}Happy shipping! 🚢${colors.reset}\n`);
    rl.close();
  }
}

// Run the setup
setupShipMasterPro().catch(error => {
  console.error(`\n${colors.red}Setup failed:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});