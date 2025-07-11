const cron = require('node-cron');
const { ApiIntegration } = require('../models');
const ApiIntegrationManager = require('../services/ApiIntegrationManager');

class SyncScheduler {
  constructor() {
    this.scheduledJobs = new Map();
  }

  start() {
    console.log('Starting sync scheduler...');
    
    // Main scheduler runs every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.runScheduledSyncs();
    });

    // Cleanup old logs daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldLogs();
    });

    // Reset stats monthly
    cron.schedule('0 0 1 * *', async () => {
      await this.resetMonthlyStats();
    });
  }

  async runScheduledSyncs() {
    console.log('Running scheduled API syncs...');
    
    try {
      const activeIntegrations = await ApiIntegration.find({
        'syncSettings.enabled': true,
        'syncSettings.autoSync': true,
        'status.connected': true
      });
      
      for (const integration of activeIntegrations) {
        const lastSync = integration.status.lastSync || new Date(0);
        const syncIntervalMs = integration.syncSettings.frequency * 60 * 1000;
        
        if (Date.now() - lastSync.getTime() >= syncIntervalMs) {
          console.log(`Syncing integration: ${integration.name}`);
          
          try {
            // Determine sync type based on integration
            let syncType = 'orders';
            switch (integration.type) {
              case 'quickbooks':
                syncType = 'invoices';
                break;
              case 'bill.com':
                syncType = 'bills';
                break;
              case 'aftership':
                syncType = 'trackings';
                break;
            }
            
            const result = await ApiIntegrationManager.syncData(integration._id, syncType);
            
            if (result.success) {
              console.log(`Successfully synced ${result.count} ${syncType} for ${integration.name}`);
            } else {
              console.error(`Failed to sync ${integration.name}: ${result.message}`);
            }
          } catch (error) {
            console.error(`Error syncing ${integration.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  }

  async cleanupOldLogs() {
    console.log('Cleaning up old API logs...');
    
    try {
      const ApiLog = require('../models/ApiLog');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await ApiLog.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      console.log(`Deleted ${result.deletedCount} old log entries`);
    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }
  }

  async resetMonthlyStats() {
    console.log('Resetting monthly statistics...');
    
    try {
      await ApiIntegration.updateMany({}, {
        $set: {
          'stats.totalRequests': 0,
          'stats.successfulRequests': 0,
          'stats.failedRequests': 0,
          'stats.dataTransferred': 0,
          'stats.lastResetDate': new Date()
        }
      });
      
      console.log('Monthly statistics reset completed');
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  }

  // Dynamic scheduling for specific integrations
  scheduleIntegration(integrationId, cronExpression) {
    if (this.scheduledJobs.has(integrationId)) {
      this.scheduledJobs.get(integrationId).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      await ApiIntegrationManager.syncData(integrationId);
    });

    this.scheduledJobs.set(integrationId, job);
  }

  unscheduleIntegration(integrationId) {
    if (this.scheduledJobs.has(integrationId)) {
      this.scheduledJobs.get(integrationId).stop();
      this.scheduledJobs.delete(integrationId);
    }
  }

  stop() {
    // Stop all scheduled jobs
    for (const job of this.scheduledJobs.values()) {
      job.stop();
    }
    this.scheduledJobs.clear();
    console.log('Sync scheduler stopped');
  }
}

module.exports = new SyncScheduler();