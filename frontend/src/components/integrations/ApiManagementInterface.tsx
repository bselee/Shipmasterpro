import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Settings, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Activity,
  Link,
  Unlink,
  Clock,
  Database,
  Zap,
  BarChart,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Play,
  Pause,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import { Integration, IntegrationStats, DiagnosticsResult } from '../../types/integration';
import IntegrationCard from './IntegrationCard';
import CreateIntegrationModal from './CreateIntegrationModal';
import DiagnosticsPanel from './DiagnosticsPanel';
import LogsViewer from './LogsViewer';
import OverviewView from './OverviewView';

const ApiManagementInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations, isLoading, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: apiService.getIntegrations,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (integrationId: string) => apiService.testConnection(integrationId),
    onSuccess: (data, integrationId) => {
      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(data.message || 'Connection failed');
      }
      queryClient.invalidateQueries(['integrations']);
    }
  });

  // Sync data mutation
  const syncDataMutation = useMutation({
    mutationFn: ({ integrationId, syncType }: { integrationId: string; syncType: string }) =>
      apiService.syncData(integrationId, syncType),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Synced ${data.count} ${data.syncType || 'records'}`);
      } else {
        toast.error(data.message || 'Sync failed');
      }
      queryClient.invalidateQueries(['integrations']);
    }
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: apiService.deleteIntegration,
    onSuccess: () => {
      toast.success('Integration deleted successfully');
      queryClient.invalidateQueries(['integrations']);
      setSelectedIntegration(null);
    }
  });

  // Filter integrations
  const filteredIntegrations = integrations?.filter((integration: Integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || integration.type === filterType;
    return matchesSearch && matchesType;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView integrations={integrations || []} />;
      
      case 'integrations':
        return (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="shopify">Shopify</option>
                <option value="quickbooks">QuickBooks</option>
                <option value="bill.com">Bill.com</option>
                <option value="aftership">AfterShip</option>
                <option value="custom">Custom API</option>
              </select>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Add Integration
              </button>
            </div>

            {/* Integration Cards */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">Failed to load integrations</p>
              </div>
            ) : filteredIntegrations?.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No integrations found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIntegrations?.map((integration: Integration) => (
                  <IntegrationCard
                    key={integration._id}
                    integration={integration}
                    onTest={() => testConnectionMutation.mutate(integration._id)}
                    onSync={(syncType) => syncDataMutation.mutate({ 
                      integrationId: integration._id, 
                      syncType 
                    })}
                    onSelect={() => setSelectedIntegration(integration)}
                    onDelete={() => {
                      if (confirm('Are you sure you want to delete this integration?')) {
                        deleteIntegrationMutation.mutate(integration._id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      
      case 'logs':
        return selectedIntegration ? (
          <LogsViewer integrationId={selectedIntegration._id} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select an integration to view logs
          </div>
        );
      
      case 'diagnostics':
        return selectedIntegration ? (
          <DiagnosticsPanel integration={selectedIntegration} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select an integration to run diagnostics
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Management</h1>
        <p className="text-gray-600">
          Manage your integrations with external platforms and services
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart },
            { id: 'integrations', label: 'Integrations', icon: Link },
            { id: 'logs', label: 'Logs', icon: Database },
            { id: 'diagnostics', label: 'Diagnostics', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'}
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Create Integration Modal */}
      {showCreateModal && (
        <CreateIntegrationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries(['integrations']);
          }}
        />
      )}
    </div>
  );
};

export default ApiManagementInterface;