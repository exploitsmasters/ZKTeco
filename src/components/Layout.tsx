import React from 'react';
import { 
  Home, 
  Users, 
  Clock, 
  Settings, 
  FileText, 
  Shield,
  Monitor,
  BarChart3,
  Calendar,
  Globe
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [language, setLanguage] = React.useState<'en' | 'ar'>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'attendance', name: 'Attendance', icon: Clock },
    { id: 'employees', name: 'Employees', icon: Users },
    { id: 'devices', name: 'Devices', icon: Monitor },
    { id: 'shifts', name: 'Shifts', icon: Calendar },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'access-control', name: 'Access Control', icon: Shield },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ZKTeco Manager</h1>
              <p className="text-sm text-gray-400">Attendance System</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-8">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 capitalize">
                {currentPage.replace('-', ' ')}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                  <span className="text-sm text-gray-600">System Online</span>
                </div>
                <button
                  onClick={toggleLanguage}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Globe className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {language === 'en' ? 'EN' : 'AR'}
                  </span>
                </button>
                <div className="text-sm text-gray-500">
                  Last sync: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;