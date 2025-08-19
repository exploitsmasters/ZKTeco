import { Employee, AttendanceRecord, Device, DailyReport } from '../types';
import { Shift } from '../types';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'Sarah Johnson',
    department: 'Engineering',
    position: 'Senior Developer',
    email: 'sarah.johnson@company.com',
    phone: '+1-555-0123',
    enrollmentStatus: 'enrolled',
    biometricTypes: ['fingerprint', 'face'],
    isActive: true,
    joinDate: '2023-01-15',
    shift: 'Morning',
    profileImage: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Michael Chen',
    department: 'Marketing',
    position: 'Marketing Manager',
    email: 'michael.chen@company.com',
    phone: '+1-555-0124',
    enrollmentStatus: 'enrolled',
    biometricTypes: ['fingerprint', 'card'],
    isActive: true,
    joinDate: '2023-02-20',
    shift: 'Morning'
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Emily Rodriguez',
    department: 'HR',
    position: 'HR Specialist',
    email: 'emily.rodriguez@company.com',
    phone: '+1-555-0125',
    enrollmentStatus: 'pending',
    biometricTypes: ['face'],
    isActive: true,
    joinDate: '2023-03-10',
    shift: 'Morning'
  },
  {
    id: '4',
    employeeId: 'EMP004',
    name: 'David Kim',
    department: 'Finance',
    position: 'Financial Analyst',
    email: 'david.kim@company.com',
    phone: '+1-555-0126',
    enrollmentStatus: 'enrolled',
    biometricTypes: ['fingerprint', 'face', 'card'],
    isActive: true,
    joinDate: '2023-01-05',
    shift: 'Evening'
  }
];

export const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'Sarah Johnson',
    timestamp: '2024-01-15T08:30:00Z',
    type: 'check-in',
    method: 'fingerprint',
    deviceId: 'ZK001',
    location: 'Main Entrance',
    status: 'success'
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'Michael Chen',
    timestamp: '2024-01-15T08:45:00Z',
    type: 'check-in',
    method: 'face',
    deviceId: 'ZK001',
    location: 'Main Entrance',
    status: 'success'
  },
  {
    id: '3',
    employeeId: 'EMP004',
    employeeName: 'David Kim',
    timestamp: '2024-01-15T09:15:00Z',
    type: 'check-in',
    method: 'card',
    deviceId: 'ZK002',
    location: 'Side Entrance',
    status: 'success'
  },
  {
    id: '4',
    employeeId: 'EMP001',
    employeeName: 'Sarah Johnson',
    timestamp: '2024-01-15T12:00:00Z',
    type: 'break-start',
    method: 'fingerprint',
    deviceId: 'ZK001',
    location: 'Main Entrance',
    status: 'success'
  },
  {
    id: '5',
    employeeId: 'EMP001',
    employeeName: 'Sarah Johnson',
    timestamp: '2024-01-15T13:00:00Z',
    type: 'break-end',
    method: 'fingerprint',
    deviceId: 'ZK001',
    location: 'Main Entrance',
    status: 'success'
  }
];

export const mockDevices: Device[] = [
  {
    id: 'ZK001',
    name: 'Main Entrance Terminal',
    model: 'ZKTeco MultiBio700',
    ipAddress: '192.168.1.100',
    location: 'Main Entrance - Lobby',
    status: 'online',
    lastSeen: '2024-01-15T10:30:00Z',
    firmware: 'Ver 6.60 Apr 28 2023',
    capacity: {
      users: 1500,
      maxUsers: 3000,
      records: 45000,
      maxRecords: 100000
    }
  },
  {
    id: 'ZK002',
    name: 'Side Entrance Terminal',
    model: 'ZKTeco MultiBio800',
    ipAddress: '192.168.1.101',
    location: 'Side Entrance - Parking',
    status: 'online',
    lastSeen: '2024-01-15T10:29:00Z',
    firmware: 'Ver 6.60 Apr 28 2023',
    capacity: {
      users: 800,
      maxUsers: 3000,
      records: 25000,
      maxRecords: 100000
    }
  },
  {
    id: 'ZK003',
    name: 'Executive Floor Terminal',
    model: 'ZKTeco MultiBio700',
    ipAddress: '192.168.1.102',
    location: 'Executive Floor - 3rd Floor',
    status: 'offline',
    lastSeen: '2024-01-15T09:45:00Z',
    firmware: 'Ver 6.60 Apr 28 2023',
    capacity: {
      users: 200,
      maxUsers: 3000,
      records: 8000,
      maxRecords: 100000
    }
  }
];

export const mockDailyReports: DailyReport[] = [
  {
    date: '2024-01-15',
    totalEmployees: 150,
    presentEmployees: 142,
    lateArrivals: 8,
    earlyDepartures: 3,
    overtime: 12,
    totalHours: 1136
  },
  {
    date: '2024-01-14',
    totalEmployees: 150,
    presentEmployees: 145,
    lateArrivals: 5,
    earlyDepartures: 2,
    overtime: 15,
    totalHours: 1160
  },
  {
    date: '2024-01-13',
    totalEmployees: 150,
    presentEmployees: 148,
    lateArrivals: 3,
    earlyDepartures: 1,
    overtime: 18,
    totalHours: 1184
  }
];

export const mockShifts: Shift[] = [
  {
    id: '1',
    name: 'Morning Shift',
    nameAr: 'وردية الصباح',
    startTime: '08:00',
    endTime: '16:00',
    startDate: '2024-01-01',
    recurrence: 'daily',
    isActive: true,
    assignedEmployees: ['EMP001', 'EMP002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Evening Shift',
    nameAr: 'وردية المساء',
    startTime: '16:00',
    endTime: '00:00',
    startDate: '2024-01-01',
    recurrence: 'daily',
    isActive: true,
    assignedEmployees: ['EMP004'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Night Shift',
    nameAr: 'وردية الليل',
    startTime: '00:00',
    endTime: '08:00',
    startDate: '2024-01-01',
    recurrence: 'weekly',
    repetitions: 4,
    isActive: true,
    assignedEmployees: ['EMP003'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];