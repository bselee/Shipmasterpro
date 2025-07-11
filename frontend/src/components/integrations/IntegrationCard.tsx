import React, { useState } from 'react';
import { 
  MoreVertical, 
  Play, 
  Pause, 
  RefreshCw, 
  Settings,
  Trash2,
  Link,
  Unlink,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { Integration } from '../../types/integration';

interface IntegrationCardProps {
  integration: Integration;
  onTest: () => void;
  onSync: (syncType: string) => void;
  onSelect: () => void;
  onDelete: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onTest,
  onSync,
  onSelect,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const getStatusIcon = () => {
    if (integration.status.connected) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (integration.status.consecutiveErrors > 0) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <Unlink className="w-5 h-5 text-gray-400" />;
    }
  };

  const getIntegrationIcon = () => {
    const icons: Record<string, React.ReactNode> = {
      shopify: <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold">S</div>,
      quickbooks: <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">QB</div>,
      'bill.com': <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">B</div>,
      aftership: <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold">AS</div>,
      custom: <Zap className="w-8 h-8 text-gray-600" />
    };
    
    return icons[integration.type] || icons.custom;
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync('orders'); // Default to orders sync
    } finally {
      setIsSyncing(false);
    }
  };

  const successRate = integration.stats.totalRequests > 0
    ? ((integration.stats.successfulRequests / integration.stats.totalRequests) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getIntegrationIcon()}
            <div>
              <h3 className="font-semibold text-gray-900">{integration.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{integration.type}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <button
                  onClick={() => {
                    onSelect();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
                <button
                  onClick={() => {
                    onTest();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Test Connection
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${
            integration.status.connected ? 'text-green-600' : 'text-gray-600'
          }`}>
            {integration.status.connected ? 'Connected' : 'Disconnected'}
          </span>
          {integration.status.lastError && (
            <span className="text-xs text-red-600 truncate flex-1">
              {integration.status.lastError}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className="text-lg font-semibold text-gray-900">{successRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Requests</p>
            <p className="text-lg font-semibold text-gray-900">
              {integration.stats.totalRequests.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Last Sync */}
        {integration.status.lastSync && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Clock className="w-4 h-4" />
            <span>Last sync: {format(new Date(integration.status.lastSync), 'MMM d, h:mm a')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {integration.syncSettings.enabled ? (
            <button
              onClick={handleSync}
              disabled={isSyncing || !integration.status.connected}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium
                ${integration.status.connected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
              `}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Sync Now
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
            >
              <Pause className="w-4 h-4" />
              Sync Disabled
            </button>
          )}
          
          <button
            onClick={onSelect}
            className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-sync indicator */}
        {integration.syncSettings.autoSync && integration.syncSettings.enabled && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Auto-sync every {integration.syncSettings.frequency} minutes
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationCard;