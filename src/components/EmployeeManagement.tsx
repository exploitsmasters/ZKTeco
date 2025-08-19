import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Edit3, Trash2, Eye, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { Employee } from '../types';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    employeeId: '',
    name: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    enrollmentStatus: 'pending',
    biometricTypes: [],
    isActive: true
  });

  useEffect(() => {
    loadEmployees();
    setupWebSocket();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'employee_update') {
        const { employee, action } = message.data;
        
        setEmployees(prev => {
          switch (action) {
            case 'created':
              return [...prev, employee];
            case 'updated':
              return prev.map(emp => emp.id === employee.id ? employee : emp);
            case 'deleted':
              return prev.filter(emp => emp.id !== employee.id);
            default:
              return prev;
          }
        });
      }
    };
  };

  const createEmployee = async () => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      const result = await response.json();
      if (result.success) {
        setEmployees(prev => [...prev, result.data]);
        setShowModal(false);
        setNewEmployee({
          employeeId: '',
          name: '',
          department: '',
          position: '',
          email: '',
          phone: '',
          joinDate: new Date().toISOString().split('T')[0],
          shift: 'Morning',
          enrollmentStatus: 'pending',
          biometricTypes: [],
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        setEmployees(prev => prev.filter(emp => emp.employeeId !== employeeId));
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const enrollEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceIds: ['ZK001'], // You can make this configurable
          biometricTypes: ['fingerprint', 'face']
        })
      });

      const result = await response.json();
      if (result.success) {
        loadEmployees(); // Refresh the list
      }
    } catch (error) {
      console.error('Error enrolling employee:', error);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      enrolled: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getBiometricIcons = (types: string[]) => (
    <div className="flex space-x-1">
      {types.includes('fingerprint') && (
        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs flex items-center justify-center">👆</span>
      )}
      {types.includes('face') && (
        <span className="w-6 h-6 bg-green-100 text-green-600 rounded text-xs flex items-center justify-center">👤</span>
      )}
      {types.includes('card') && (
        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded text-xs flex items-center justify-center">🎫</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <User className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600">Manage employee profiles and biometric enrollment</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadEmployees}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Marketing</option>
              <option>HR</option>
              <option>Finance</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Enrolled</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employees Found</h3>
          <p className="text-gray-600 mb-6">Add employees manually or sync from ZKTeco devices</p>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Employee
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Biometrics
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {employee.profileImage ? (
                            <img 
                              src={employee.profileImage} 
                              alt={employee.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            employee.name.split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department}</div>
                      <div className="text-sm text-gray-500">{employee.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBiometricIcons(employee.biometricTypes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(employee.enrollmentStatus)}`}>
                        {employee.enrollmentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.shift}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setSelectedEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {employee.enrollmentStatus === 'pending' && (
                          <button 
                            onClick={() => enrollEmployee(employee.employeeId)}
                            className="text-green-600 hover:text-green-900 p-1 rounded" 
                            title="Enroll"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button className="text-orange-600 hover:text-orange-900 p-1 rounded" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteEmployee(employee.employeeId)}
                          className="text-red-600 hover:text-red-900 p-1 rounded" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Employee</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    value={newEmployee.employeeId || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={newEmployee.name || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={newEmployee.department || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input 
                    type="text" 
                    value={newEmployee.position || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newEmployee.email || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    value={newEmployee.phone || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+1-555-0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <input 
                    type="date" 
                    value={newEmployee.joinDate || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, joinDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                  <select 
                    value={newEmployee.shift || 'Morning'}
                    onChange={(e) => setNewEmployee({...newEmployee, shift: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={createEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Employee Details</h3>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedEmployee.profileImage ? (
                    <img 
                      src={selectedEmployee.profileImage} 
                      alt={selectedEmployee.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    selectedEmployee.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.position}</p>
                  <p className="text-sm text-gray-500">{selectedEmployee.employeeId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <p><span className="text-gray-600">Email:</span> {selectedEmployee.email}</p>
                    <p><span className="text-gray-600">Phone:</span> {selectedEmployee.phone}</p>
                    <p><span className="text-gray-600">Department:</span> {selectedEmployee.department}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Work Information</h4>
                  <div className="space-y-2">
                    <p><span className="text-gray-600">Join Date:</span> {selectedEmployee.joinDate}</p>
                    <p><span className="text-gray-600">Shift:</span> {selectedEmployee.shift}</p>
                    <p><span className="text-gray-600">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedEmployee.enrollmentStatus)}`}>
                        {selectedEmployee.enrollmentStatus}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-3">Biometric Enrollment</h4>
                  <div className="flex space-x-4">
                    {selectedEmployee.biometricTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                        <UserCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 capitalize">{type}</span>
                      </div>
                    ))}
                    {selectedEmployee.biometricTypes.length === 0 && (
                      <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-lg">
                        <UserX className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">No biometric data enrolled</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;