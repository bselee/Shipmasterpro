const express = require('express');
const router = express.Router();
const taggingService = require('../services/tagging/TaggingService');
const { Tag, TagCollection } = require('../models');
const { validateRequest } = require('../middleware/validation');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(requireAuth);

// Tag CRUD operations
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    
    const tags = await taggingService.getTags(filters);
    
    res.json({
      tags: tags.slice(offset, offset + limit),
      total: tags.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tag = await taggingService.getTag(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requirePermission('automation', 'create'), async (req, res) => {
  try {
    const tagData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        createdBy: req.user.id
      }
    };
    
    const tag = await taggingService.createTag(tagData);
    res.status(201).json(tag);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', requirePermission('automation', 'edit'), async (req, res) => {
  try {
    const tag = await taggingService.updateTag(req.params.id, req.body);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', requirePermission('automation', 'delete'), async (req, res) => {
  try {
    await taggingService.deleteTag(req.params.id);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Tag application endpoints
router.post('/apply', async (req, res) => {
  try {
    const { entityType, entityId, tagIds } = req.body;
    
    if (!entityType || !entityId || !tagIds || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const entity = await taggingService.applyTags(entityType, entityId, tagIds);
    res.json(entity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const { entityType, entityId, tagIds } = req.body;
    
    if (!entityType || !entityId || !tagIds || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const entity = await taggingService.removeTags(entityType, entityId, tagIds);
    res.json(entity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk operations
router.post('/bulk/apply', async (req, res) => {
  try {
    const { entityType, entityIds, tagIds } = req.body;
    
    if (!entityType || !entityIds || !Array.isArray(entityIds) || !tagIds || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const results = await taggingService.bulkTag(entityType, entityIds, tagIds);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/bulk/remove', async (req, res) => {
  try {
    const { entityType, entityIds, tagIds } = req.body;
    
    if (!entityType || !entityIds || !Array.isArray(entityIds) || !tagIds || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const results = await taggingService.bulkRemoveTags(entityType, entityIds, tagIds);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Tag suggestions
router.get('/suggest/:orderId', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      userId: req.user.id 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const suggestions = await taggingService.suggestTags(order);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tag analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);
    
    const analytics = await taggingService.getTagAnalytics(req.params.id, dateRange);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tag collections
router.get('/collections', async (req, res) => {
  try {
    const collections = await TagCollection.find({
      'metadata.isActive': true
    }).populate('tags');
    
    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/collections', requirePermission('automation', 'create'), async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        createdBy: req.user.id
      }
    };
    
    const collection = await taggingService.createCollection(collectionData);
    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/collections/:id', requirePermission('automation', 'edit'), async (req, res) => {
  try {
    const collection = await TagCollection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('tags');
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    res.json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/collections/:id', requirePermission('automation', 'delete'), async (req, res) => {
  try {
    const collection = await TagCollection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    if (collection.metadata.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system collection' });
    }
    
    await collection.remove();
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Most used tags
router.get('/analytics/most-used', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await Tag.findMostUsed(parseInt(limit));
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tag search
router.get('/search', async (req, res) => {
  try {
    const { q, category, excludeIds } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const query = {
      'metadata.isActive': true,
      $or: [
        { name: new RegExp(q, 'i') },
        { displayName: new RegExp(q, 'i') }
      ]
    };
    
    if (category) {
      query.category = category;
    }
    
    if (excludeIds && Array.isArray(excludeIds)) {
      query._id = { $nin: excludeIds };
    }
    
    const tags = await Tag.find(query)
      .limit(20)
      .sort({ 'metadata.usageCount': -1 });
    
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize system tags (admin only)
router.post('/system/initialize', requirePermission('admin'), async (req, res) => {
  try {
    await taggingService.initializeSystemTags();
    res.json({ message: 'System tags initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;