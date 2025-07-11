// This file provides a unified interface for models
// Currently using Supabase, but can be switched to MongoDB by changing imports

const USE_SUPABASE = process.env.USE_SUPABASE !== 'false'; // Default to Supabase

if (USE_SUPABASE) {
  // Export Supabase models
  module.exports = {
    Order: require('./supabase/Order'),
    User: require('./supabase/User'),
    Tag: require('./supabase/Tag'),
    TagCollection: require('./supabase/TagCollection'),
    ApiIntegration: require('./supabase/ApiIntegration'),
    ApiLog: require('./supabase/ApiLog'),
    AutomationRule: require('./supabase/AutomationRule')
  };
} else {
  // Export Mongoose models
  module.exports = {
    Order: require('./Order'),
    User: require('./User'),
    Tag: require('./Tag'),
    TagCollection: require('./TagCollection'),
    ApiIntegration: require('./ApiIntegration'),
    ApiLog: require('./ApiLog'),
    AutomationRule: require('./AutomationRule')
  };
}