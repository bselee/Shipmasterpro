import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Eye, 
  EyeOff, 
  TestTube,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Shield,
  Key,
  Globe,
  Code,
  Database,
  LineChart,
  AlertCircle,
  Info,
  Download,
  Upload,
  Play,
  Pause,
  Trash2,
  Edit3,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

const ApiManagementInterface = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState({});
  const [logsData, setLogsData] = useState([]);
  const [statsData, setStatsData] = useState({});
  const [realTimeStats, setRealTimeStats] = useState({});

  // Sample data for demonstration
  useEffect(() => {
    setIntegrations([
      {
        id: 'int-001',
        name: 'Main Shopify Store',
        type: 'shopify',
        status: {
          connected: true,
          lastConnected: new Date(),
          lastSync: new Date(Date.now() - 5 * 60 * 1000),
          lastError: null,
          consecutiveErrors: 0
        },
        config: {
          shopUrl: 'mystore',
          apiVersion: '2023-07'
        },
        syncSettings: {
          enabled: true,
          frequency: 15,
          autoSync: true,
          syncDirection: 'bidirectional'
        },
        stats: {
          totalRequests: 1247,
          successfulRequests: 1189,
          failedRequests: 58,
          avgResponseTime: 245,
          dataTransferred: 45632123
        }
      },
      {
        id: 'int-002',
        name: 'QuickBooks Integration',
        type: 'quickbooks',
        status: {
          connected: true,
          lastConnected: new Date(Date.now() - 10 * 60 * 1000),
          lastSync: new Date(Date.now() - 30 * 60 * 1000),
          lastError: 'Token refresh required',
          consecutiveErrors: 0
        },
        config: {
          companyId: 'comp-123456'
        },
        syncSettings: {
          enabled: true,
          frequency: 60,
          autoSync: true,
          syncDirection: 'export'
        },
        stats: {
          totalRequests: 456,
          successfulRequests: 445,
          failedRequests: 11,
          avgResponseTime: 892,
          dataTransferred: 12456789
        }
      },
      {
        id: 'int-003',
        name: 'AfterShip Tracking',
        type: 'aftership',
        status: {
          connected: false,
          lastConnected: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastError: 'API key invalid',
          consecutiveErrors: 5
        },
        config: {},
        syncSettings: {
          enabled: false,
          frequency: 30,
          autoSync: false,
          syncDirection: 'export'
        },
        stats: {
          totalRequests: 234,
          successfulRequests: 189,
          failedRequests: 45,
          avgResponseTime: 156,
          dataTransferred: 5678901
        }
      },
      {
        id: 'int-004',
        name: 'Custom Warehouse API',
        type: 'custom',
        status: {
          connected: true,
          lastConnected: new Date(Date.now() - 1 * 60 * 1000),
          lastSync: new Date(Date.now() - 5 * 60 * 1000),
          lastError: null,
          consecutiveErrors: 0
        },
        config: {
          baseUrl: 'https://api.warehouse.com/v1'
        },
        syncSettings: {
          enabled: true,
          frequency: 10,
          autoSync: true,
          syncDirection: 'import'
        },
        stats: {
          totalRequests: 789,
          successfulRequests: 776,
          failedRequests: 13,
          avgResponseTime: 312,
          dataTransferred: 23456789
        }
      }
    ]);

    // Simulate real-time stats
    setRealTimeStats({
      totalActiveConnections: 3,
      requestsPerMinute: 47,
      averageResponseTime: 398,
      errorRate: 4.2,
      dataTransferRate: '2.3 MB/min'
    });
  }, []);

  const handleTestConnection = async (integrationId) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update integration status
      setIntegrations(prev => prev.map(int => 
        int.id === integrationId 
          ? { 
              ...int, 
              status: { 
                ...int.status, 
                connected: Math.random() > 0.3,
                lastConnected: new Date(),
                lastError: Math.random() > 0.7 ? 'Connection timeout' : null
              }
            }
          : int
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostics = async (integrationId) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDiagnosticsData({
        [integrationId]: {
          integration: 'Shopify Store',
          type: 'shopify',
          status: true,
          issues: [
            {
              severity: 'warning',
              type: 'rate_limiting',
              message: 'Approaching rate limit',
              details: 'Current usage: 85% of hourly limit'
            }
          ],
          recommendations: [
            'Consider reducing sync frequency during peak hours',
            'Implement exponential backoff for failed requests'
          ],
          details: {
            lastConnected: new Date(),
            errorRate: '4.2%',
            avgResponseTime: '245ms'
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const StatusIndicator = ({ status, size = 'sm' }) => {
    const sizeClasses = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4'
    };

    return (
      <div className={`${sizeClasses[size]} rounded-full ${
        status.connected 
          ? 'bg-green-500' 
          : status.lastError 
            ? 'bg-red-500' 
            : 'bg-yellow-500'
      }`} />
    );
  };

  const IntegrationCard = ({ integration }) => {
    const [expanded, setExpanded] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);

    const errorRate = integration.stats.totalRequests > 0 
      ? (integration.stats.failedRequests / integration.stats.totalRequests * 100).toFixed(1)
      : '0';

    const getTypeIcon = (type) => {
      const icons = {
        shopify: '🛍️',
        quickbooks: '📊',
        'bill.com': '💰',
        aftership: '📦',
        custom: '🔧'
      };
      return icons[type] || '🔌';
    };

    const getStatusColor = (status) => {
      if (status.connected) return 'text-green-600';
      if (status.lastError) return 'text-red-600';
      return 'text-yellow-600';
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="text-2xl">{getTypeIcon(integration.type)}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                <StatusIndicator status={integration.status} size="md" />
                <span className={`text-sm font-medium capitalize ${getStatusColor(integration.status)}`}>
                  {integration.status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center space-x-4">
                  <span>Type: <span className="font-medium capitalize">{integration.type}</span></span>
                  <span>Sync: {integration.syncSettings.enabled ? 'Enabled' : 'Disabled'}</span>
                  <span>Frequency: {integration.syncSettings.frequency}min</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>Last sync: {integration.status.lastSync ? new Date(integration.status.lastSync).toLocaleString() : 'Never'}</span>
                  <span>Error rate: {errorRate}%</span>
                </div>
              </div>

              {integration.status.lastError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{integration.status.lastError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTestConnection(integration.id)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span className="ml-1">Test</span>
            </button>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Configuration */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(integration.config).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-medium">
                        {key.toLowerCase().includes('token') || key.toLowerCase().includes('key') ? (
                          <div className="flex items-center space-x-2">
                            <span>{showCredentials ? value : '••••••••'}</span>
                            <button
                              onClick={() => setShowCredentials(!showCredentials)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {showCredentials ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        ) : (
                          value
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-gray-900">{integration.stats.totalRequests}</div>
                    <div className="text-xs text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-green-600">{integration.stats.successfulRequests}</div>
                    <div className="text-xs text-gray-600">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-gray-900">{integration.stats.avgResponseTime}ms</div>
                    <div className="text-xs text-gray-600">Avg Response</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-semibold text-blue-600">{(integration.stats.dataTransferred / 1024 / 1024).toFixed(1)}MB</div>
                    <div className="text-xs text-gray-600">Data Transfer</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => handleRunDiagnostics(integration.id)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Activity className="h-4 w-4 mr-1" />
                Run Diagnostics
              </button>
              <button
                onClick={() => {
                  setSelectedIntegration(integration);
                  setActiveTab('logs');
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                <Database className="h-4 w-4 mr-1" />
                View Logs
              </button>
              <button
                onClick={() => {
                  setSelectedIntegration(integration);
                  setShowConfigModal(true);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Configure
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DiagnosticsPanel = ({ integrationId }) => {
    const diagnostics = diagnosticsData[integrationId];
    
    if (!diagnostics) {
      return (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Run Diagnostics</h3>
          <p className="text-gray-600 mb-4">Analyze connection health and identify potential issues</p>
          <button
            onClick={() => handleRunDiagnostics(integrationId)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Start Diagnostics
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overall Status */}
        <div className={`p-4 rounded-lg border ${
          diagnostics.status 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            {diagnostics.status ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">
                {diagnostics.status ? 'Connection Healthy' : 'Issues Detected'}
              </h3>
              <p className="text-sm text-gray-600">
                {diagnostics.integration} ({diagnostics.type})
              </p>
            </div>
          </div>
        </div>

        {/* Issues */}
        {diagnostics.issues.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Issues Found</h4>
            <div className="space-y-3">
              {diagnostics.issues.map((issue, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  issue.severity === 'error' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {issue.severity === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{issue.message}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          issue.severity === 'error' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Type: {issue.type}</div>
                      {issue.details && (
                        <div className="text-sm text-gray-600 mt-1">{issue.details}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {diagnostics.recommendations.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2">
                {diagnostics.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-900">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Connection Details */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">Connection Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(diagnostics.details).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="font-medium text-gray-900">
                  {value instanceof Date ? value.toLocaleString() : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LogsViewer = ({ integrationId }) => {
    const [logFilter, setLogFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Sample log data
    const sampleLogs = [
      {
        id: 'log-001',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        method: 'GET',
        endpoint: '/orders.json',
        responseStatus: 200,
        responseTime: 245,
        error: null
      },
      {
        id: 'log-002',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        method: 'POST',
        endpoint: '/orders/123/fulfillments.json',
        responseStatus: 201,
        responseTime: 892,
        error: null
      },
      {
        id: 'log-003',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        method: 'GET',
        endpoint: '/products.json',
        responseStatus: 429,
        responseTime: 1250,
        error: 'Rate limit exceeded'
      },
      {
        id: 'log-004',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        method: 'GET',
        endpoint: '/orders.json',
        responseStatus: 500,
        responseTime: 5000,
        error: 'Internal server error'
      }
    ];

    const filteredLogs = sampleLogs.filter(log => {
      if (logFilter === 'errors' && !log.error) return false;
      if (logFilter === 'success' && log.error) return false;
      if (searchTerm && !log.endpoint.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const getStatusColor = (status, error) => {
      if (error) return 'text-red-600';
      if (status >= 200 && status < 300) return 'text-green-600';
      if (status >= 400) return 'text-red-600';
      return 'text-yellow-600';
    };

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Logs</option>
            <option value="success">Success Only</option>
            <option value="errors">Errors Only</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      log.method === 'POST' ? 'bg-green-100 text-green-800' :
                      log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                    {log.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(log.responseStatus, log.error)}`}>
                      {log.responseStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.responseTime}ms
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    {log.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CreateIntegrationModal = () => {
    const [integrationType, setIntegrationType] = useState('');
    const [config, setConfig] = useState({});

    const integrationTypes = [
      { 
        id: 'shopify', 
        name: 'Shopify', 
        icon: '🛍️', 
        description: 'Connect your Shopify store for order management',
        fields: [
          { name: 'shopUrl', label: 'Shop URL', type: 'text', placeholder: 'mystore' },
          { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'shpat_...' },
          { name: 'apiVersion', label: 'API Version', type: 'select', options: ['2023-07', '2023-04', '2023-01'] }
        ]
      },
      { 
        id: 'quickbooks', 
        name: 'QuickBooks', 
        icon: '📊', 
        description: 'Sync financial data with QuickBooks',
        fields: [
          { name: 'companyId', label: 'Company ID', type: 'text', placeholder: 'Company ID from QuickBooks' },
          { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'OAuth Client ID' },
          { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'OAuth Client Secret' }
        ]
      },
      { 
        id: 'bill.com', 
        name: 'Bill.com', 
        icon: '💰', 
        description: 'Automate bill payments and accounting',
        fields: [
          { name: 'organizationId', label: 'Organization ID', type: 'text', placeholder: 'Your Bill.com organization ID' },
          { name: 'devKey', label: 'Developer Key', type: 'password', placeholder: 'Developer key from Bill.com' },
          { name: 'username', label: 'Username', type: 'text', placeholder: 'Bill.com username' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Bill.com password' }
        ]
      },
      { 
        id: 'aftership', 
        name: 'AfterShip', 
        icon: '📦', 
        description: 'Track shipments and notify customers',
        fields: [
          { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AfterShip API Key' }
        ]
      },
      { 
        id: 'custom', 
        name: 'Custom API', 
        icon: '🔧', 
        description: 'Connect to any REST API',
        fields: [
          { name: 'name', label: 'Integration Name', type: 'text', placeholder: 'My Custom API' },
          { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com/v1' },
          { name: 'authType', label: 'Authentication', type: 'select', options: ['none', 'api_key', 'bearer', 'basic'] },
          { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'API Key (if applicable)' },
          { name: 'apiKeyHeader', label: 'API Key Header', type: 'text', placeholder: 'X-API-Key' }
        ]
      }
    ];

    const selectedType = integrationTypes.find(type => type.id === integrationType);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Integration</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {!integrationType ? (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Choose Integration Type</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrationTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setIntegrationType(type.id)}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{type.icon}</div>
                        <div>
                          <div className="font-medium text-gray-900">{type.name}</div>
                          <div className="text-sm text-gray-600">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{selectedType.icon}</div>
                  <div>
                    <h4 className="text-md font-medium text-gray-900">{selectedType.name}</h4>
                    <p className="text-sm text-gray-600">{selectedType.description}</p>
                  </div>
                </div>
                
                <form className="space-y-4">
                  {selectedType.fields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={config[field.name] || ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={config[field.name] || ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </form>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIntegrationType('')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      // Handle creation
                      setShowCreateModal(false);
                      setIntegrationType('');
                      setConfig({});
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Integration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OverviewView = () => (
    <div className="space-y-6">
      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">{realTimeStats.totalActiveConnections}</p>
            </div>
            <Wifi className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Requests/Min</p>
              <p className="text-2xl font-bold text-gray-900">{realTimeStats.requestsPerMinute}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">{realTimeStats.averageResponseTime}ms</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{realTimeStats.errorRate}%</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Transfer</p>
              <p className="text-2xl font-bold text-gray-900">{realTimeStats.dataTransferRate}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">API Integrations</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </button>
        </div>
        
        <div className="space-y-6">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Globe },
    { id: 'diagnostics', name: 'Diagnostics', icon: Activity },
    { id: 'logs', name: 'Logs', icon: Database },
    { id: 'performance', name: 'Performance', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
          <p className="text-sm text-gray-600">Manage integrations, monitor connections, and troubleshoot issues</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live monitoring</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Connection Diagnostics</h2>
            {selectedIntegration ? (
              <DiagnosticsPanel integrationId={selectedIntegration.id} />
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Integration</h3>
                <p className="text-gray-600">Choose an integration from the overview to run diagnostics</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">API Logs</h2>
            {selectedIntegration ? (
              <LogsViewer integrationId={selectedIntegration.id} />
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Integration</h3>
                <p className="text-gray-600">Choose an integration from the overview to view logs</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Time Chart */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Trends</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {Array.from({length: 24}, (_, i) => (
                    <div 
                      key={i} 
                      className="bg-blue-500 rounded-t" 
                      style={{height: `${Math.random() * 80 + 20}%`, width: '100%'}}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>
              
              {/* Error Rate Chart */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Error Rate</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {Array.from({length: 24}, (_, i) => (
                    <div 
                      key={i} 
                      className="bg-red-500 rounded-t" 
                      style={{height: `${Math.random() * 30 + 5}%`, width: '100%'}}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateIntegrationModal />}
    </div>
  );
};

export default ApiManagementInterface;