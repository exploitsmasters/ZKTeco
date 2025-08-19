import React, { useState } from 'react';
import { Clock, Calendar, Download, Filter, Search, RefreshCw, Upload, FileText } from 'lucide-react';
import { mockAttendanceRecords } from '../data/mockData';
import { AttendanceRecord } from '../types';

const AttendanceTracking: React.FC = () => {
  const [records] = useState<AttendanceRecord[]>(mockAttendanceRecords);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('all');
  const [showUSBImport, setShowUSBImport] = useState(false);

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = record.timestamp.split('T')[0] === selectedDate;
    const matchesType = filterType === 'all' || record.type === filterType;
    
    return matchesSearch && matchesDate && matchesType;
  });

  const getTypeIcon = (type: string) => {
    const icons = {
      'check-in': '🟢',
      'check-out': '🔴',
      'break-start': '🟡',
      'break-end': '🟠'
    };
    return icons[type as keyof typeof icons] || '⚪';
  };

  const getMethodBadge = (method: string) => {
    const styles = {
      fingerprint: 'bg-blue-100 text-blue-800',
      face: 'bg-green-100 text-green-800',
      card: 'bg-purple-100 text-purple-800',
      pin: 'bg-orange-100 text-orange-800'
    };
    return styles[method as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const exportData = () => {
    const csvContent = [
      ['Employee ID', 'Name', 'Date', 'Time', 'Type', 'Method', 'Device', 'Location', 'Status'].join(','),
      ...filteredRecords.map(record => [
        record.employeeId,
        record.employeeName,
        record.timestamp.split('T')[0],
        new Date(record.timestamp).toLocaleTimeString(),
        record.type,
        record.method,
        record.deviceId,
        record.location,
        record.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
            <p className="text-gray-600">Monitor real-time attendance and access logs</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Sync</span>
          </button>
          <button 
            onClick={() => setShowUSBImport(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>USB Import</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="check-in">Check In</option>
            <option value="check-out">Check Out</option>
            <option value="break-start">Break Start</option>
            <option value="break-end">Break End</option>
          </select>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Showing {filteredRecords.length} records
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Check-ins</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredRecords.filter(r => r.type === 'check-in').length}
              </p>
            </div>
            <div className="text-2xl">🟢</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Check-outs</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredRecords.filter(r => r.type === 'check-out').length}
              </p>
            </div>
            <div className="text-2xl">🔴</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Break Times</p>
              <p className="text-2xl font-bold text-orange-600">
                {filteredRecords.filter(r => r.type.includes('break')).length}
              </p>
            </div>
            <div className="text-2xl">🟡</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round((filteredRecords.filter(r => r.status === 'success').length / filteredRecords.length) * 100)}%
              </p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device/Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {record.employeeName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                        <div className="text-sm text-gray-500">{record.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(record.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(record.type)}</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {record.type.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadge(record.method)}`}>
                      {record.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.deviceId}</div>
                    <div className="text-sm text-gray-500">{record.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'success' ? 'bg-green-100 text-green-800' :
                      record.status === 'duplicate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USB Import Modal */}
      {showUSBImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">USB Import - Employee & Attendance Data</h3>
                <button 
                  onClick={() => setShowUSBImport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Import from USB Drive</h4>
                  <p className="text-gray-600 mb-4">
                    Select .dat, .xls, or .xlsx files exported from ZKTeco devices
                  </p>
                  <input
                    type="file"
                    accept=".dat,.xls,.xlsx,.csv"
                    multiple
                    className="hidden"
                    id="usb-import"
                  />
                  <label
                    htmlFor="usb-import"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
                  >
                    Choose Files
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h5 className="font-medium text-blue-900">Employee Data</h5>
                    </div>
                    <p className="text-sm text-blue-700">Import employee records with biometric templates</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <h5 className="font-medium text-green-900">Attendance Logs</h5>
                    </div>
                    <p className="text-sm text-green-700">Import attendance records and time logs</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-medium text-yellow-800 mb-2">Supported Formats:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• .dat files (ZKTeco native format)</li>
                    <li>• .xls/.xlsx files (Excel format)</li>
                    <li>• .csv files (Comma-separated values)</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowUSBImport(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracking;