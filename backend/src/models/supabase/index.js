// Export all Supabase model adapters
module.exports = {
  Order: require('./Order'),
  User: require('./User'),
  Tag: require('./Tag'),
  TagCollection: require('./TagCollection'),
  ApiIntegration: require('./ApiIntegration'),
  ApiLog: require('./ApiLog'),
  AutomationRule: require('./AutomationRule')
};