import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  enrollmentStatus: 'enrolled' | 'pending' | 'failed';
  biometricTypes: string[];
  isActive: boolean;
  joinDate: string;
  shift: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
}

export class DatabaseService {
  private db: sqlite3.Database | null = null;
  private isConnectedFlag = false;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('./attendance.db', (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        
        console.log('Connected to SQLite database');
        this.isConnectedFlag = true;
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));

    // Employees table
    await run(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        employeeId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        position TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        enrollmentStatus TEXT DEFAULT 'pending',
        biometricTypes TEXT DEFAULT '[]',
        isActive BOOLEAN DEFAULT 1,
        joinDate TEXT NOT NULL,
        shift TEXT DEFAULT 'Morning',
        profileImage TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance records table
    await run(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        employeeId TEXT NOT NULL,
        employeeName TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        method TEXT NOT NULL,
        deviceId TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees (employeeId)
      )
    `);

    // Devices table
    await run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        ipAddress TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'offline',
        lastSeen TEXT,
        firmware TEXT,
        userCapacity INTEGER DEFAULT 3000,
        recordCapacity INTEGER DEFAULT 100000,
        currentUsers INTEGER DEFAULT 0,
        currentRecords INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Biometric templates table
    await run(`
      CREATE TABLE IF NOT EXISTS biometric_templates (
        id TEXT PRIMARY KEY,
        employeeId TEXT NOT NULL,
        templateType TEXT NOT NULL,
        templateData BLOB NOT NULL,
        quality INTEGER DEFAULT 0,
        deviceId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees (employeeId)
      )
    `);

    // Access rules table
    await run(`
      CREATE TABLE IF NOT EXISTS access_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        timeZones TEXT DEFAULT '[]',
        userGroups TEXT DEFAULT '[]',
        doors TEXT DEFAULT '[]',
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shifts table
    await run(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nameAr TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT,
        recurrence TEXT DEFAULT 'daily',
        repetitions INTEGER,
        isActive BOOLEAN DEFAULT 1,
        assignedEmployees TEXT DEFAULT '[]',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  }

  // Employee methods
  async createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date();
    
    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      INSERT INTO employees (
        id, employeeId, name, department, position, email, phone,
        enrollmentStatus, biometricTypes, isActive, joinDate, shift,
        profileImage, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, employee.employeeId, employee.name, employee.department,
      employee.position, employee.email, employee.phone,
      employee.enrollmentStatus, JSON.stringify(employee.biometricTypes),
      employee.isActive ? 1 : 0, employee.joinDate, employee.shift,
      employee.profileImage, now.toISOString(), now.toISOString()
    ]);

    return { ...employee, id, createdAt: now, updatedAt: now };
  }

  async getEmployees(): Promise<Employee[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    const rows = await all('SELECT * FROM employees ORDER BY name');
    
    return rows.map((row: any) => ({
      ...row,
      biometricTypes: JSON.parse(row.biometricTypes || '[]'),
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getEmployee(employeeId: string): Promise<Employee | null> {
    if (!this.db) throw new Error('Database not initialized');

    const get = promisify(this.db.get.bind(this.db));
    
    const row = await get('SELECT * FROM employees WHERE employeeId = ?', [employeeId]);
    
    if (!row) return null;
    
    return {
      ...row,
      biometricTypes: JSON.parse(row.biometricTypes || '[]'),
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee | null> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'createdAt')
      .map(([key, value]) => {
        if (key === 'biometricTypes') return JSON.stringify(value);
        if (key === 'isActive') return value ? 1 : 0;
        return value;
      });
    
    values.push(new Date().toISOString()); // updatedAt
    values.push(employeeId);
    
    await run(`
      UPDATE employees 
      SET ${setClause}, updatedAt = ?
      WHERE employeeId = ?
    `, values);

    return this.getEmployee(employeeId);
  }

  async deleteEmployee(employeeId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    const result = await run('DELETE FROM employees WHERE employeeId = ?', [employeeId]);
    
    return (result as any).changes > 0;
  }

  // Attendance methods
  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date();
    
    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      INSERT INTO attendance_records (
        id, employeeId, employeeName, timestamp, type, method,
        deviceId, location, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.employeeId, record.employeeName, record.timestamp,
      record.type, record.method, record.deviceId, record.location,
      record.status, now.toISOString()
    ]);

    return { ...record, id, createdAt: now };
  }

  async getAttendanceRecords(filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    deviceId?: string;
    type?: string;
  }): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    let query = 'SELECT * FROM attendance_records WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.employeeId) {
      query += ' AND employeeId = ?';
      params.push(filters.employeeId);
    }
    
    if (filters?.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    
    if (filters?.deviceId) {
      query += ' AND deviceId = ?';
      params.push(filters.deviceId);
    }
    
    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const rows = await all(query, params);
    
    return rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt)
    }));
  }

  // Device methods
  async createOrUpdateDevice(device: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      INSERT OR REPLACE INTO devices (
        id, name, model, ipAddress, location, status, lastSeen,
        firmware, userCapacity, recordCapacity, currentUsers,
        currentRecords, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      device.id, device.name, device.model, device.ipAddress,
      device.location, device.status, device.lastSeen, device.firmware,
      device.userCapacity, device.recordCapacity, device.currentUsers,
      device.currentRecords, new Date().toISOString()
    ]);
  }

  async getDevices(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    const rows = await all('SELECT * FROM devices ORDER BY name');
    
    return rows.map((row: any) => ({
      ...row,
      capacity: {
        users: row.currentUsers,
        maxUsers: row.userCapacity,
        records: row.currentRecords,
        maxRecords: row.recordCapacity
      },
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  // Shift methods
  async createShift(shift: any): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date();
    
    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      INSERT INTO shifts (
        id, name, nameAr, startTime, endTime, startDate, endDate,
        recurrence, repetitions, isActive, assignedEmployees,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, shift.name, shift.nameAr, shift.startTime, shift.endTime,
      shift.startDate, shift.endDate, shift.recurrence, shift.repetitions,
      shift.isActive ? 1 : 0, JSON.stringify(shift.assignedEmployees || []),
      now.toISOString(), now.toISOString()
    ]);

    return { ...shift, id, createdAt: now, updatedAt: now };
  }

  async getShifts(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const all = promisify(this.db.all.bind(this.db));
    
    const rows = await all('SELECT * FROM shifts ORDER BY name');
    
    return rows.map((row: any) => ({
      ...row,
      assignedEmployees: JSON.parse(row.assignedEmployees || '[]'),
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  }

  async getShift(shiftId: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const get = promisify(this.db.get.bind(this.db));
    
    const row = await get('SELECT * FROM shifts WHERE id = ?', [shiftId]);
    
    if (!row) return null;
    
    return {
      ...row,
      assignedEmployees: JSON.parse(row.assignedEmployees || '[]'),
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async updateShift(shiftId: string, updates: any): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'createdAt')
      .map(([key, value]) => {
        if (key === 'assignedEmployees') return JSON.stringify(value);
        if (key === 'isActive') return value ? 1 : 0;
        return value;
      });
    
    values.push(new Date().toISOString()); // updatedAt
    values.push(shiftId);
    
    await run(`
      UPDATE shifts 
      SET ${setClause}, updatedAt = ?
      WHERE id = ?
    `, values);

    return this.getShift(shiftId);
  }

  async deleteShift(shiftId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));
    
    const result = await run('DELETE FROM shifts WHERE id = ?', [shiftId]);
    
    return (result as any).changes > 0;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.isConnectedFlag = false;
            resolve();
          }
        });
      });
    }
  }
}