import React, { useState } from 'react';
import { Calendar, Clock, Plus, Edit3, Trash2, Users, Settings } from 'lucide-react';
import { mockShifts, mockEmployees } from '../data/mockData';
import { Shift, Employee } from '../types';

const ShiftManagement: React.FC = () => {
  const [shifts] = useState<Shift[]>(mockShifts);
  const [employees] = useState<Employee[]>(mockEmployees);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newShift, setNewShift] = useState<Partial<Shift>>({
    name: '',
    nameAr: '',
    startTime: '08:00',
    endTime: '16:00',
    startDate: new Date().toISOString().split('T')[0],
    recurrence: 'daily',
    isActive: true,
    assignedEmployees: []
  });

  const getRecurrenceText = (recurrence: string, repetitions?: number) => {
    const texts = {
      daily: 'يومياً',
      weekly: 'أسبوعياً',
      monthly: 'شهرياً',
      none: 'مرة واحدة'
    };
    const baseText = texts[recurrence as keyof typeof texts] || recurrence;
    return repetitions ? `${baseText} (${repetitions} مرات)` : baseText;
  };

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1); // Next day
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / (1000 * 60 * 60));
  };

  const handleCreateShift = () => {
    // In real implementation, this would call the API
    console.log('Creating shift:', newShift);
    setShowModal(false);
    setNewShift({
      name: '',
      nameAr: '',
      startTime: '08:00',
      endTime: '16:00',
      startDate: new Date().toISOString().split('T')[0],
      recurrence: 'daily',
      isActive: true,
      assignedEmployees: []
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة الورديات</h1>
            <p className="text-gray-600">Shifts & Work Schedules Management</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة وردية جديدة</span>
        </button>
      </div>

      {/* Shifts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الورديات</p>
              <p className="text-3xl font-bold text-blue-600">{shifts.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الورديات النشطة</p>
              <p className="text-3xl font-bold text-green-600">
                {shifts.filter(s => s.isActive).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الموظفون المعينون</p>
              <p className="text-3xl font-bold text-purple-600">
                {shifts.reduce((sum, s) => sum + s.assignedEmployees.length, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">متوسط ساعات العمل</p>
              <p className="text-3xl font-bold text-orange-600">
                {Math.round(shifts.reduce((sum, s) => sum + getShiftDuration(s.startTime, s.endTime), 0) / shifts.length)}
              </p>
            </div>
            <Settings className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">جداول الورديات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الوردية
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  أوقات العمل
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التكرار
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموظفون المعينون
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{shift.nameAr}</div>
                      <div className="text-sm text-gray-500">{shift.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getShiftDuration(shift.startTime, shift.endTime)} ساعات
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {getRecurrenceText(shift.recurrence, shift.repetitions)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {shift.assignedEmployees.length} موظف
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedShift(shift);
                        setShowAssignModal(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      إدارة التعيينات
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      shift.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {shift.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 p-1 rounded">
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

      {/* Create Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">إضافة وردية جديدة</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوردية (عربي)</label>
                  <input 
                    type="text" 
                    value={newShift.nameAr || ''}
                    onChange={(e) => setNewShift({...newShift, nameAr: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="وردية الصباح"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name (English)</label>
                  <input 
                    type="text" 
                    value={newShift.name || ''}
                    onChange={(e) => setNewShift({...newShift, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Morning Shift"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية</label>
                  <input 
                    type="time" 
                    value={newShift.startTime || '08:00'}
                    onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية</label>
                  <input 
                    type="time" 
                    value={newShift.endTime || '16:00'}
                    onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input 
                    type="date" 
                    value={newShift.startDate || ''}
                    onChange={(e) => setNewShift({...newShift, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية (اختياري)</label>
                  <input 
                    type="date" 
                    value={newShift.endDate || ''}
                    onChange={(e) => setNewShift({...newShift, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التكرار</label>
                  <select 
                    value={newShift.recurrence || 'daily'}
                    onChange={(e) => setNewShift({...newShift, recurrence: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">يومياً</option>
                    <option value="weekly">أسبوعياً</option>
                    <option value="monthly">شهرياً</option>
                    <option value="none">مرة واحدة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عدد التكرارات (اختياري)</label>
                  <input 
                    type="number" 
                    value={newShift.repetitions || ''}
                    onChange={(e) => setNewShift({...newShift, repetitions: parseInt(e.target.value) || undefined})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="غير محدود"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleCreateShift}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  إنشاء الوردية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {showAssignModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                تعيين الموظفين - {selectedShift.nameAr}
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">الموظفون المتاحون</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {employees
                      .filter(emp => !selectedShift.assignedEmployees.includes(emp.employeeId))
                      .map(employee => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.department}</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            تعيين
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">الموظفون المعينون</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {employees
                      .filter(emp => selectedShift.assignedEmployees.includes(emp.employeeId))
                      .map(employee => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.department}</p>
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            إلغاء التعيين
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
                <button 
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  إغلاق
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;