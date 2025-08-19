import React, { useState, useEffect } from 'react';
import { Monitor, Wifi, WifiOff, Settings, RefreshCw, Plus, Activity, Download, Upload, Search, Loader } from 'lucide-react';
import { Device } from '../types';

interface DeviceDetectionResult {
  ip: string;
  port: number;
  model?: string;
  firmware?: string;
  isReachable: boolean;
  responseTime?: number;
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DeviceDetectionResult[]>([]);
  const [newDevice, setNewDevice] = useState({
    name: '',
    model: 'ZKTeco MB-2000',
    ipAddress: '192.168.100.72',
    location: '',
    port: 4370
  });
  const [syncOptions, setSyncOptions] = useState({
    users: true,
    attendance: true,
    templates: false,
    settings: false
  });

  useEffect(() => {
    loadDevices();
    setupWebSocket();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const result = await response.json();
      if (result.success) {
        setDevices(result.data);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const setupWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'device_status') {
        setDevices(prev => prev.map(device => 
          device.id === message.data.deviceId 
            ? { ...device, status: message.data.status, lastSeen: new Date().toISOString() }
            : device
        ));
      }
    };
  };

  const autoDetectDevices = async () => {
    setIsDetecting(true);
    setDetectionResults([]);
    
    try {
      // Get network range from current IP
      const baseIP = newDevice.ipAddress.substring(0, newDevice.ipAddress.lastIndexOf('.'));
      const results: DeviceDetectionResult[] = [];
      
      // Scan common ZKTeco ports and IP ranges
      const ports = [4370, 4371, 80, 8080];
      const ipRange = Array.from({length: 20}, (_, i) => i + 1); // Scan .1 to .20
      
      for (const port of ports) {
        for (const lastOctet of ipRange) {
          const ip = `${baseIP}.${lastOctet}`;
          
          try {
            const response = await fetch('/api/devices/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ip, port, timeout: 2000 })
            });
            
            const result = await response.json();
            if (result.success && result.data.isReachable) {
              results.push({
                ip,
                port,
                model: result.data.model || 'ZKTeco Device',
                firmware: result.data.firmware,
                isReachable: true,
                responseTime: result.data.responseTime
              });
            }
          } catch (error) {
            // Device not reachable, continue scanning
          }
        }
      }
      
      setDetectionResults(results);
    } catch (error) {
      console.error('Error during auto-detection:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const testConnection = async (ip: string, port: number) => {
    try {
      const response = await fetch('/api/devices/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port })
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  };

  const addDevice = async () => {
    try {
      const deviceData = {
        id: `ZK_${Date.now()}`,
        name: newDevice.name || `ZKTeco Device ${newDevice.ipAddress}`,
        model: newDevice.model,
        ipAddress: newDevice.ipAddress,
        location: newDevice.location || 'Unknown Location',
        port: newDevice.port
      };

      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });

      const result = await response.json();
      if (result.success) {
        setDevices(prev => [...prev, result.data]);
        setShowAddDevice(false);
        setNewDevice({
          name: '',
          model: 'ZKTeco MB-2000',
          ipAddress: '192.168.100.72',
          location: '',
          port: 4370
        });
      }
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const syncDevice = async (deviceId: string) => {
    try {
      const syncPromises = [];
      
      if (syncOptions.users) {
        syncPromises.push(
          fetch(`/api/devices/${deviceId}/sync/users`, { method: 'POST' })
        );
      }
      
      if (syncOptions.attendance) {
        syncPromises.push(
          fetch(`/api/devices/${deviceId}/sync/attendance`, { method: 'POST' })
        );
      }
      
      if (syncOptions.templates) {
        syncPromises.push(
          fetch(`/api/devices/${deviceId}/sync/templates`, { method: 'POST' })
        );
      }

      await Promise.all(syncPromises);
      setShowSyncModal(false);
      
      // Refresh device list
      loadDevices();
    } catch (error) {
      console.error('Error syncing device:', error);
    }
  };

  const connectDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/connect`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        loadDevices();
      }
    } catch (error) {
      console.error('Error connecting device:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      online: 'text-green-600 bg-green-100',
      offline: 'text-red-600 bg-red-100',
      error: 'text-yellow-600 bg-yellow-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? Wifi : WifiOff;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Monitor className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
            <p className="text-gray-600">Monitor and manage ZKTeco terminals</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowAddDevice(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
          <button 
            onClick={() => setShowSyncModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync All</span>
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Device Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online Devices</p>
              <p className="text-3xl font-bold text-green-600">
                {devices.filter(d => d.status === 'online').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline Devices</p>
              <p className="text-3xl font-bold text-red-600">
                {devices.filter(d => d.status === 'offline').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <WifiOff className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-blue-600">
                {devices.reduce((sum, d) => sum + (d.capacity?.users || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Device Grid */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-gray-600 mb-6">Add your first ZKTeco device to start monitoring attendance</p>
          <button 
            onClick={() => setShowAddDevice(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Device
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => {
            const StatusIcon = getStatusIcon(device.status);
            return (
              <div key={device.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                        <p className="text-sm text-gray-500">{device.model}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {device.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IP Address:</span>
                      <span className="font-medium text-gray-900">{device.ipAddress}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">{device.location}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Seen:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(device.lastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Progress */}
                  {device.capacity && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Users</span>
                          <span className="font-medium">{device.capacity.users}/{device.capacity.maxUsers}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(device.capacity.users / device.capacity.maxUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Records</span>
                          <span className="font-medium">{device.capacity.records.toLocaleString()}/{device.capacity.maxRecords.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(device.capacity.records / device.capacity.maxRecords) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex space-x-2">
                    <button 
                      onClick={() => setSelectedDevice(device)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configure</span>
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowSyncModal(true);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync</span>
                    </button>
                    {device.status === 'offline' && (
                      <button 
                        onClick={() => connectDevice(device.id)}
                        className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-200 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Wifi className="w-4 h-4" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New ZKTeco Device</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Auto Detection */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-blue-900">Auto Device Detection</h4>
                    <button 
                      onClick={autoDetectDevices}
                      disabled={isDetecting}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isDetecting ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>{isDetecting ? 'Scanning...' : 'Scan Network'}</span>
                    </button>
                  </div>
                  
                  {detectionResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-700 mb-2">Found {detectionResults.length} device(s):</p>
                      {detectionResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div>
                            <p className="font-medium text-gray-900">{result.ip}:{result.port}</p>
                            <p className="text-sm text-gray-500">{result.model} • {result.responseTime}ms</p>
                          </div>
                          <button 
                            onClick={() => {
                              setNewDevice({
                                ...newDevice,
                                ipAddress: result.ip,
                                port: result.port,
                                model: result.model || 'ZKTeco MB-2000'
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Use This Device
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                    <input 
                      type="text" 
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Main Entrance Terminal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <select 
                      value={newDevice.model}
                      onChange={(e) => setNewDevice({...newDevice, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ZKTeco MB-2000">ZKTeco MB-2000</option>
                      <option value="ZKTeco MultiBio700">ZKTeco MultiBio700</option>
                      <option value="ZKTeco MultiBio800">ZKTeco MultiBio800</option>
                      <option value="ZKTeco F18">ZKTeco F18</option>
                      <option value="ZKTeco K40">ZKTeco K40</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <input 
                      type="text" 
                      value={newDevice.ipAddress}
                      onChange={(e) => setNewDevice({...newDevice, ipAddress: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="192.168.100.72"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <input 
                      type="number" 
                      value={newDevice.port}
                      onChange={(e) => setNewDevice({...newDevice, port: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="4370"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input 
                      type="text" 
                      value={newDevice.location}
                      onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Main Entrance - Lobby"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowAddDevice(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => testConnection(newDevice.ipAddress, newDevice.port)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Test Connection
                  </button>
                  <button 
                    onClick={addDevice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Device
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Sync Device Data</h3>
              <p className="text-sm text-gray-600">{selectedDevice.name}</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">User Data</p>
                    <p className="text-sm text-gray-500">Employee information and enrollment</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={syncOptions.users}
                    onChange={(e) => setSyncOptions({...syncOptions, users: e.target.checked})}
                    className="rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Attendance Logs</p>
                    <p className="text-sm text-gray-500">Check-in/out records and timestamps</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={syncOptions.attendance}
                    onChange={(e) => setSyncOptions({...syncOptions, attendance: e.target.checked})}
                    className="rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Biometric Templates</p>
                    <p className="text-sm text-gray-500">Fingerprint and face templates</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={syncOptions.templates}
                    onChange={(e) => setSyncOptions({...syncOptions, templates: e.target.checked})}
                    className="rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Device Settings</p>
                    <p className="text-sm text-gray-500">Time zones and configurations</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={syncOptions.settings}
                    onChange={(e) => setSyncOptions({...syncOptions, settings: e.target.checked})}
                    className="rounded"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => syncDevice(selectedDevice.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Configuration Modal */}
      {selectedDevice && !showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Device Configuration - {selectedDevice.name}</h3>
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Device Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                      <input 
                        type="text" 
                        value={selectedDevice.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                      <input 
                        type="text" 
                        value={selectedDevice.ipAddress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input 
                        type="text" 
                        value={selectedDevice.location}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Firmware Version</label>
                      <input 
                        type="text" 
                        value={selectedDevice.firmware}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Device Settings */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Device Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>UTC+3 (Saudi Arabia)</option>
                        <option>UTC+0 (GMT)</option>
                        <option>UTC-5 (Eastern Time)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Mode</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>Fingerprint + PIN</option>
                        <option>Face Recognition Only</option>
                        <option>Card + PIN</option>
                        <option>Multi-modal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Auto Clear Records</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>Never</option>
                        <option>After 30 days</option>
                        <option>After 90 days</option>
                        <option>After 180 days</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="realtime-sync" className="rounded" defaultChecked />
                        <label htmlFor="realtime-sync" className="text-sm text-gray-700">Enable real-time sync</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="voice-prompts" className="rounded" defaultChecked />
                        <label htmlFor="voice-prompts" className="text-sm text-gray-700">Voice prompts enabled</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="auto-backup" className="rounded" />
                        <label htmlFor="auto-backup" className="text-sm text-gray-700">Auto backup to server</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;