export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  enrollmentStatus: 'enrolled' | 'pending' | 'failed';
  biometricTypes: ('fingerprint' | 'face' | 'card')[];
  isActive: boolean;
  joinDate: string;
  shift: string;
  profileImage?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  method: 'fingerprint' | 'face' | 'card' | 'pin';
  deviceId: string;
  location: string;
  status: 'success' | 'duplicate' | 'unauthorized';
}

export interface Device {
  id: string;
  name: string;
  model: string;
  ipAddress: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  firmware: string;
  capacity: {
    users: number;
    maxUsers: number;
    records: number;
    maxRecords: number;
  };
}

export interface DailyReport {
  date: string;
  totalEmployees: number;
  presentEmployees: number;
  lateArrivals: number;
  earlyDepartures: number;
  overtime: number;
  totalHours: number;
}

export interface AccessRule {
  id: string;
  name: string;
  description: string;
  timeZones: TimeZone[];
  userGroups: string[];
  doors: string[];
  isActive: boolean;
}

export interface TimeZone {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[]; // 0-6, Sunday to Saturday
}

export interface Shift {
  id: string;
  name: string;
  nameAr: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
  repetitions?: number;
  isActive: boolean;
  assignedEmployees: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceReport {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shiftId?: string;
  shiftName?: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'early_departure';
  totalHours?: number;
  overtimeHours?: number;
}

export interface USBImportData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  errors: string[];
}