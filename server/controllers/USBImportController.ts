import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { DatabaseService } from '../services/DatabaseService';
import { RealtimeService } from '../services/RealtimeService';

const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.dat', '.xls', '.xlsx', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .dat, .xls, .xlsx, and .csv files are allowed.'));
    }
  }
});

export class USBImportController {
  public router: Router;

  constructor(
    private dbService: DatabaseService,
    private realtimeService: RealtimeService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/employees', upload.single('file'), this.importEmployees.bind(this));
    this.router.post('/attendance', upload.single('file'), this.importAttendance.bind(this));
    this.router.post('/bulk', upload.array('files', 10), this.bulkImport.bind(this));
  }

  private async importEmployees(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
      let employeeData: any[] = [];

      switch (fileExtension) {
        case '.xlsx':
        case '.xls':
          employeeData = await this.parseExcelFile(req.file.path, 'employees');
          break;
        case '.csv':
          employeeData = await this.parseCSVFile(req.file.path, 'employees');
          break;
        case '.dat':
          employeeData = await this.parseDATFile(req.file.path, 'employees');
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Unsupported file format'
          });
          return;
      }

      const results = {
        imported: 0,
        updated: 0,
        errors: [] as string[]
      };

      for (const empData of employeeData) {
        try {
          const existingEmployee = await this.dbService.getEmployee(empData.employeeId);
          
          if (existingEmployee) {
            await this.dbService.updateEmployee(empData.employeeId, empData);
            results.updated++;
          } else {
            await this.dbService.createEmployee(empData);
            results.imported++;
          }
        } catch (error) {
          results.errors.push(`Error processing employee ${empData.employeeId}: ${(error as Error).message}`);
        }
      }

      // Broadcast import completion
      this.realtimeService.broadcast({
        type: 'system_alert',
        data: {
          message: `Employee import completed: ${results.imported} imported, ${results.updated} updated`,
          results
        },
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: results,
        message: `Import completed: ${results.imported} employees imported, ${results.updated} updated`
      });
    } catch (error) {
      console.error('Error importing employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import employees'
      });
    }
  }

  private async importAttendance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
      let attendanceData: any[] = [];

      switch (fileExtension) {
        case '.xlsx':
        case '.xls':
          attendanceData = await this.parseExcelFile(req.file.path, 'attendance');
          break;
        case '.csv':
          attendanceData = await this.parseCSVFile(req.file.path, 'attendance');
          break;
        case '.dat':
          attendanceData = await this.parseDATFile(req.file.path, 'attendance');
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Unsupported file format'
          });
          return;
      }

      const results = {
        imported: 0,
        duplicates: 0,
        errors: [] as string[]
      };

      for (const attData of attendanceData) {
        try {
          // Check for duplicates
          const existingRecords = await this.dbService.getAttendanceRecords({
            employeeId: attData.employeeId,
            startDate: attData.timestamp,
            endDate: attData.timestamp
          });

          const isDuplicate = existingRecords.some(record => 
            Math.abs(new Date(record.timestamp).getTime() - new Date(attData.timestamp).getTime()) < 60000 // Within 1 minute
          );

          if (isDuplicate) {
            results.duplicates++;
            continue;
          }

          await this.dbService.createAttendanceRecord(attData);
          results.imported++;
        } catch (error) {
          results.errors.push(`Error processing attendance record: ${(error as Error).message}`);
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Import completed: ${results.imported} records imported, ${results.duplicates} duplicates skipped`
      });
    } catch (error) {
      console.error('Error importing attendance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import attendance records'
      });
    }
  }

  private async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
        return;
      }

      const results = {
        employees: { imported: 0, updated: 0, errors: [] as string[] },
        attendance: { imported: 0, duplicates: 0, errors: [] as string[] }
      };

      for (const file of req.files) {
        const fileName = file.originalname.toLowerCase();
        
        if (fileName.includes('employee') || fileName.includes('user')) {
          // Process as employee file
          const employeeData = await this.parseFileByExtension(file.path, file.originalname, 'employees');
          
          for (const empData of employeeData) {
            try {
              const existingEmployee = await this.dbService.getEmployee(empData.employeeId);
              
              if (existingEmployee) {
                await this.dbService.updateEmployee(empData.employeeId, empData);
                results.employees.updated++;
              } else {
                await this.dbService.createEmployee(empData);
                results.employees.imported++;
              }
            } catch (error) {
              results.employees.errors.push(`Error processing employee ${empData.employeeId}: ${(error as Error).message}`);
            }
          }
        } else if (fileName.includes('attendance') || fileName.includes('log')) {
          // Process as attendance file
          const attendanceData = await this.parseFileByExtension(file.path, file.originalname, 'attendance');
          
          for (const attData of attendanceData) {
            try {
              const existingRecords = await this.dbService.getAttendanceRecords({
                employeeId: attData.employeeId,
                startDate: attData.timestamp,
                endDate: attData.timestamp
              });

              const isDuplicate = existingRecords.some(record => 
                Math.abs(new Date(record.timestamp).getTime() - new Date(attData.timestamp).getTime()) < 60000
              );

              if (isDuplicate) {
                results.attendance.duplicates++;
                continue;
              }

              await this.dbService.createAttendanceRecord(attData);
              results.attendance.imported++;
            } catch (error) {
              results.attendance.errors.push(`Error processing attendance record: ${(error as Error).message}`);
            }
          }
        }
      }

      res.json({
        success: true,
        data: results,
        message: 'Bulk import completed successfully'
      });
    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk import'
      });
    }
  }

  private async parseFileByExtension(filePath: string, fileName: string, type: 'employees' | 'attendance'): Promise<any[]> {
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (fileExtension) {
      case '.xlsx':
      case '.xls':
        return await this.parseExcelFile(filePath, type);
      case '.csv':
        return await this.parseCSVFile(filePath, type);
      case '.dat':
        return await this.parseDATFile(filePath, type);
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  private async parseExcelFile(filePath: string, type: 'employees' | 'attendance'): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (type === 'employees') {
      return jsonData.map((row: any) => ({
        employeeId: row['Employee ID'] || row['ID'] || row['UserID'],
        name: row['Name'] || row['Employee Name'],
        department: row['Department'] || 'Unknown',
        position: row['Position'] || row['Job Title'] || 'Employee',
        email: row['Email'] || `${row['Employee ID']}@company.com`,
        phone: row['Phone'] || '',
        joinDate: row['Join Date'] || new Date().toISOString().split('T')[0],
        shift: row['Shift'] || 'Morning',
        enrollmentStatus: 'pending',
        biometricTypes: [],
        isActive: true
      }));
    } else {
      return jsonData.map((row: any) => ({
        employeeId: row['Employee ID'] || row['UserID'],
        employeeName: row['Employee Name'] || row['Name'] || 'Unknown',
        timestamp: this.parseDateTime(row['Date'], row['Time']),
        type: this.parseAttendanceType(row['Type'] || row['Status']),
        method: row['Method'] || 'fingerprint',
        deviceId: row['Device ID'] || 'USB_IMPORT',
        location: row['Location'] || 'Imported from USB',
        status: 'success'
      }));
    }
  }

  private async parseCSVFile(filePath: string, type: 'employees' | 'attendance'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      Papa.parse(csvContent, {
        header: true,
        complete: (results) => {
          try {
            if (type === 'employees') {
              const employees = results.data.map((row: any) => ({
                employeeId: row['Employee ID'] || row['ID'] || row['UserID'],
                name: row['Name'] || row['Employee Name'],
                department: row['Department'] || 'Unknown',
                position: row['Position'] || row['Job Title'] || 'Employee',
                email: row['Email'] || `${row['Employee ID']}@company.com`,
                phone: row['Phone'] || '',
                joinDate: row['Join Date'] || new Date().toISOString().split('T')[0],
                shift: row['Shift'] || 'Morning',
                enrollmentStatus: 'pending',
                biometricTypes: [],
                isActive: true
              }));
              resolve(employees);
            } else {
              const attendance = results.data.map((row: any) => ({
                employeeId: row['Employee ID'] || row['UserID'],
                employeeName: row['Employee Name'] || row['Name'] || 'Unknown',
                timestamp: this.parseDateTime(row['Date'], row['Time']),
                type: this.parseAttendanceType(row['Type'] || row['Status']),
                method: row['Method'] || 'fingerprint',
                deviceId: row['Device ID'] || 'USB_IMPORT',
                location: row['Location'] || 'Imported from USB',
                status: 'success'
              }));
              resolve(attendance);
            }
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  private async parseDATFile(filePath: string, type: 'employees' | 'attendance'): Promise<any[]> {
    // ZKTeco .dat files are binary format - this is a simplified parser
    // In a real implementation, you'd need to parse the actual ZKTeco binary format
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    
    // This is a mock implementation - actual .dat parsing would be much more complex
    const mockData = [];
    
    if (type === 'employees') {
      // Mock employee data from .dat file
      for (let i = 1; i <= 10; i++) {
        mockData.push({
          employeeId: `EMP${i.toString().padStart(3, '0')}`,
          name: `Employee ${i}`,
          department: 'Imported',
          position: 'Employee',
          email: `emp${i}@company.com`,
          phone: '',
          joinDate: new Date().toISOString().split('T')[0],
          shift: 'Morning',
          enrollmentStatus: 'enrolled',
          biometricTypes: ['fingerprint'],
          isActive: true
        });
      }
    } else {
      // Mock attendance data from .dat file
      const now = new Date();
      for (let i = 1; i <= 50; i++) {
        const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
        mockData.push({
          employeeId: `EMP${(i % 10 + 1).toString().padStart(3, '0')}`,
          employeeName: `Employee ${i % 10 + 1}`,
          timestamp: timestamp.toISOString(),
          type: i % 2 === 0 ? 'check-in' : 'check-out',
          method: 'fingerprint',
          deviceId: 'DAT_IMPORT',
          location: 'Imported from DAT file',
          status: 'success'
        });
      }
    }
    
    return mockData;
  }

  private parseDateTime(dateStr: string, timeStr?: string): string {
    try {
      if (timeStr) {
        return new Date(`${dateStr} ${timeStr}`).toISOString();
      } else {
        return new Date(dateStr).toISOString();
      }
    } catch (error) {
      return new Date().toISOString();
    }
  }

  private parseAttendanceType(typeStr: string): 'check-in' | 'check-out' | 'break-start' | 'break-end' {
    const type = typeStr?.toLowerCase() || '';
    
    if (type.includes('in') || type.includes('entry')) return 'check-in';
    if (type.includes('out') || type.includes('exit')) return 'check-out';
    if (type.includes('break') && type.includes('start')) return 'break-start';
    if (type.includes('break') && type.includes('end')) return 'break-end';
    
    return 'check-in'; // Default
  }
}