const express = require('express');
const rateLimit = require('express-rate-limit');
const { ApiIntegration, ApiLog } = require('../models');
const ApiIntegrationManager = require('../services/ApiIntegrationManager');

const router = express.Router();

// Rate limiting for API management endpoints
const apiManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API management requests'
});

router.use(apiManagementLimiter);

// Get all integrations for user
router.get('/', async (req, res) => {
  try {
    const integrations = await ApiIntegration.find({ userId: req.user.id })
      .select('-config.accessToken -config.refreshToken -config.sessionId -config.apiKey')
      .sort({ createdAt: -1 });
    
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single integration
router.get('/:id', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).select('-config.accessToken -config.refreshToken -config.sessionId -config.apiKey');
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new integration
router.post('/', async (req, res) => {
  try {
    const integrationData = {
      ...req.body,
      userId: req.user.id
    };
    
    const integration = new ApiIntegration(integrationData);
    await integration.save();
    
    // Test connection immediately
    const connectionTest = await ApiIntegrationManager.testConnection(integration._id);
    
    res.status(201).json({
      integration: integration.toObject(),
      connectionTest
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update integration
router.put('/:id', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(integration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete integration
router.delete('/:id', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Clean up related logs
    await ApiLog.deleteMany({ integrationId: req.params.id });
    
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test connection
router.post('/:id/test', async (req, res) => {
  try {
    const result = await ApiIntegrationManager.testConnection(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync data
router.post('/:id/sync', async (req, res) => {
  try {
    const { syncType = 'orders' } = req.body;
    const result = await ApiIntegrationManager.syncData(req.params.id, syncType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Perform action
router.post('/:id/action', async (req, res) => {
  try {
    const { action, data } = req.body;
    const result = await ApiIntegrationManager.performAction(req.params.id, action, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get integration logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const query = { integrationId: req.params.id };
    
    if (level === 'errors') {
      query.error = { $exists: true };
    }
    
    const logs = await ApiLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-requestBody -responseBody'); // Exclude large fields for list view
    
    const total = await ApiLog.countDocuments(query);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed log entry
router.get('/:id/logs/:logId', async (req, res) => {
  try {
    const log = await ApiLog.findOne({
      _id: req.params.logId,
      integrationId: req.params.id
    });
    
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Diagnose connection issues
router.get('/:id/diagnose', async (req, res) => {
  try {
    const diagnostics = await ApiIntegrationManager.diagnoseConnection(req.params.id);
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get integration statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Get recent logs for trend analysis
    const recentLogs = await ApiLog.aggregate([
      { $match: { integrationId: integration._id } },
      { $sort: { timestamp: -1 } },
      { $limit: 1000 },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d %H:00",
              date: "$timestamp"
            }
          },
          requests: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $ne: ["$error", null] }, 1, 0]
            }
          },
          avgResponseTime: { $avg: "$responseTime" }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    res.json({
      ...integration.stats,
      status: integration.status,
      recentTrends: recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;