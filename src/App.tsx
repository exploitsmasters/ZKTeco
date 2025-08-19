import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import AttendanceTracking from './components/AttendanceTracking';
import DeviceManagement from './components/DeviceManagement';
import ShiftManagement from './components/ShiftManagement';
import ReportsManagement from './components/ReportsManagement';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeManagement />;
      case 'attendance':
        return <AttendanceTracking />;
      case 'devices':
        return <DeviceManagement />;
      case 'shifts':
        return <ShiftManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'access-control':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Control Rules</h2>
              <p className="text-gray-600 mb-6">Configure time-based access permissions and security rules</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h2>
              <p className="text-gray-600 mb-6">Configure global system preferences and integrations</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;