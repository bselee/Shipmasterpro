#!/usr/bin/env node

require('dotenv').config();
const { getSupabaseManager } = require('./src/config/supabase');

async function verifyConnection() {
  console.log('🔍 Verifying Supabase connection...\n');
  
  const manager = getSupabaseManager();
  
  try {
    // Test connection
    const isHealthy = await manager.performHealthCheck();
    
    if (isHealthy) {
      console.log('✅ Connection successful!');
      
      // Get metrics
      const metrics = manager.getConnectionMetrics();
      console.log('\n📊 Connection Metrics:');
      console.log(`   Health Status: ${metrics.health}`);
      console.log(`   Last Check: ${new Date(metrics.lastHealthCheck).toLocaleString()}`);
      console.log(`   Success Rate: ${metrics.successRate.toFixed(2)}%`);
      
      // Test a simple query
      console.log('\n🧪 Testing database query...');
      const result = await manager.executeQuery(async (client) => {
        const { data, error } = await client
          .from('profiles')
          .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        return { count: data };
      });
      
      if (result.success) {
        console.log('✅ Database query successful!');
        console.log(`   Profiles table exists with ${result.data.count || 0} records`);
      }
      
      console.log('\n🎉 All systems operational!');
      console.log('\nYour ShipMaster Pro backend is ready to use.');
      console.log('Run "npm run dev" to start the server.');
      
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your .env file has correct Supabase credentials');
    console.error('2. Ensure you ran the schema.sql in Supabase SQL Editor');
    console.error('3. Verify your Supabase project is active (not paused)');
    console.error('\nRun "npm run setup" to reconfigure.');
    process.exit(1);
  }
}

verifyConnection();