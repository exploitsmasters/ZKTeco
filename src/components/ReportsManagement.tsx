import React, { useState } from 'react';
import { FileText, Download, Calendar, Users, Clock, Filter, BarChart3 } from 'lucide-react';
import { Employee, AttendanceRecord, Shift, AttendanceReport } from '../types';

const ReportsManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedReport, setSelectedReport] = useState('attendance');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load employees
      const empResponse = await fetch('/api/employees');
      const empResult = await empResponse.json();
      if (empResult.success) {
        setEmployees(empResult.data);
      }

      // Load attendance records
      const attResponse = await fetch(`/api/attendance?startDate=${dateRange.startDate}T00:00:00Z&endDate=${dateRange.endDate}T23:59:59Z`);
      const attResult = await attResponse.json();
      if (attResult.success) {
        setAttendanceRecords(attResult.data);
      }

      // Load shifts
      const shiftResponse = await fetch('/api/shifts');
      const shiftResult = await shiftResponse.json();
      if (shiftResult.success) {
        setShifts(shiftResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateAttendanceReport = (): AttendanceReport[] => {
    const reports: AttendanceReport[] = [];
    
    employees.forEach(employee => {
      const employeeRecords = attendanceRecords.filter(
        record => record.employeeId === employee.employeeId &&
        record.timestamp.split('T')[0] >= dateRange.startDate &&
        record.timestamp.split('T')[0] <= dateRange.endDate
      );

      const checkIns = employeeRecords.filter(r => r.type === 'check-in');
      const checkOuts = employeeRecords.filter(r => r.type === 'check-out');

      checkIns.forEach(checkIn => {
        const checkOut = checkOuts.find(co => 
          co.timestamp.split('T')[0] === checkIn.timestamp.split('T')[0]
        );

        const checkInTime = new Date(checkIn.timestamp);
        const isLate = checkInTime.getHours() > 8 || (checkInTime.getHours() === 8 && checkInTime.getMinutes() > 30);

        let totalHours = 0;
        if (checkOut) {
          const checkOutTime = new Date(checkOut.timestamp);
          totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        }

        reports.push({
          id: `${employee.employeeId}-${checkIn.timestamp.split('T')[0]}`,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          date: checkIn.timestamp.split('T')[0],
          checkIn: checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          checkOut: checkOut ? new Date(checkOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          status: isLate ? 'late' : 'present',
          totalHours: Math.round(totalHours * 100) / 100,
          overtimeHours: totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0
        });
      });

      // Add absent days
      const currentDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasRecord = reports.some(r => r.employeeId === employee.employeeId && r.date === dateStr);
        
        if (!hasRecord && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
          reports.push({
            id: `${employee.employeeId}-${dateStr}`,
            employeeId: employee.employeeId,
            employeeName: employee.name,
            date: dateStr,
            status: 'absent'
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const exportToPDF = () => {
    // This would use jsPDF to generate PDF reports
    console.log('Exporting to PDF...');
    alert('تم تصدير التقرير بصيغة PDF');
  };

  const exportToExcel = () => {
    const reports = generateAttendanceReport();
    const csvContent = [
      ['Employee ID', 'Employee Name', 'Date', 'Check In', 'Check Out', 'Status', 'Total Hours', 'Overtime'].join(','),
      ...reports.map(report => [
        report.employeeId,
        report.employeeName,
        report.date,
        report.checkIn || '',
        report.checkOut || '',
        report.status,
        report.totalHours || '',
        report.overtimeHours || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reports = generateAttendanceReport();
  const filteredReports = reports.filter(report => {
    if (selectedEmployees.length > 0 && !selectedEmployees.includes(report.employeeId)) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      early_departure: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      present: 'حاضر',
      late: 'متأخر',
      absent: 'غائب',
      early_departure: 'انصراف مبكر'
    };
    return {
      style: styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[status as keyof typeof labels] || status
    };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقارير الحضور والانصراف</h1>
            <p className="text-gray-600">Attendance & Departure Reports</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>
          <button 
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Report Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع التقرير</label>
            <select 
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="attendance">تقرير الحضور والانصراف</option>
              <option value="shifts">تقرير الورديات</option>
              <option value="overtime">تقرير الإضافي</option>
              <option value="summary">تقرير ملخص</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input 
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input 
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">جميع الأقسام</option>
              <option value="engineering">الهندسة</option>
              <option value="marketing">التسويق</option>
              <option value="hr">الموارد البشرية</option>
              <option value="finance">المالية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الحضور</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredReports.filter(r => r.status === 'present' || r.status === 'late').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المتأخرون</p>
              <p className="text-3xl font-bold text-yellow-600">
                {filteredReports.filter(r => r.status === 'late').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الغائبون</p>
              <p className="text-3xl font-bold text-red-600">
                {filteredReports.filter(r => r.status === 'absent').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ساعات الإضافي</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(filteredReports.reduce((sum, r) => sum + (r.overtimeHours || 0), 0))}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">تقرير الحضور والانصراف</h3>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                عرض {filteredReports.length} سجل
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموظف
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحضور
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الانصراف
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الساعات
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإضافي
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReports.slice(0, 50).map((report) => {
                const employee = employees.find(e => e.employeeId === report.employeeId);
                const statusBadge = getStatusBadge(report.status);
                
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-3 space-x-reverse">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.employeeName}</div>
                          <div className="text-sm text-gray-500">{report.employeeId}</div>
                        </div>
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {report.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {new Date(report.date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {report.checkIn || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {report.checkOut || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {report.totalHours ? `${report.totalHours} ساعة` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {report.overtimeHours ? `${report.overtimeHours} ساعة` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.style}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;