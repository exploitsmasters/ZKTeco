import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ZKTecoService } from '../services/ZKTecoService';
import { RealtimeService } from '../services/RealtimeService';

export class AttendanceController {
  public router: Router;

  constructor(
    private dbService: DatabaseService,
    private zkService: ZKTecoService,
    private realtimeService: RealtimeService
  ) {
    this.router = Router();
    this.setupRoutes();
    this.setupEventListeners();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getAttendanceRecords.bind(this));
    this.router.post('/', this.createAttendanceRecord.bind(this));
    this.router.get('/sync/:deviceId', this.syncAttendanceFromDevice.bind(this));
    this.router.get('/export', this.exportAttendanceData.bind(this));
    this.router.get('/stats', this.getAttendanceStats.bind(this));
    this.router.get('/daily-report/:date', this.getDailyReport.bind(this));
  }

  private setupEventListeners(): void {
    // Listen for real-time attendance records from ZKTeco devices
    this.zkService.on('attendanceRecord', async (record) => {
      try {
        // Get employee name from database
        const employee = await this.dbService.getEmployee(record.userId);
        
        const attendanceRecord = {
          employeeId: record.userId,
          employeeName: employee?.name || 'Unknown Employee',
          timestamp: record.timestamp.toISOString(),
          type: record.type,
          method: record.method,
          deviceId: record.deviceId,
          location: this.getDeviceLocation(record.deviceId),
          status: 'success' as const
        };

        // Save to database
        await this.dbService.createAttendanceRecord(attendanceRecord);
        
        // Broadcast to connected clients
        this.realtimeService.broadcastAttendanceRecord(attendanceRecord);
        
        console.log('New attendance record processed:', attendanceRecord);
      } catch (error) {
        console.error('Error processing attendance record:', error);
      }
    });
  }

  private async getAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        deviceId,
        type,
        page = 1,
        limit = 50
      } = req.query;

      const filters = {
        employeeId: employeeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        deviceId: deviceId as string,
        type: type as string
      };

      const records = await this.dbService.getAttendanceRecords(filters);
      
      // Implement pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedRecords = records.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedRecords,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: records.length,
          totalPages: Math.ceil(records.length / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance records'
      });
    }
  }

  private async createAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const recordData = req.body;
      
      // Validate required fields
      const requiredFields = ['employeeId', 'timestamp', 'type', 'method', 'deviceId'];
      for (const field of requiredFields) {
        if (!recordData[field]) {
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
          return;
        }
      }

      // Get employee name
      const employee = await this.dbService.getEmployee(recordData.employeeId);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      const attendanceRecord = {
        ...recordData,
        employeeName: employee.name,
        location: this.getDeviceLocation(recordData.deviceId),
        status: recordData.status || 'success'
      };

      const createdRecord = await this.dbService.createAttendanceRecord(attendanceRecord);
      
      // Broadcast to connected clients
      this.realtimeService.broadcastAttendanceRecord(createdRecord);

      res.json({
        success: true,
        data: createdRecord
      });
    } catch (error) {
      console.error('Error creating attendance record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create attendance record'
      });
    }
  }

  private async syncAttendanceFromDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { startDate, endDate } = req.query;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      if (!device.isConnected) {
        res.status(400).json({
          success: false,
          error: 'Device is not connected'
        });
        return;
      }

      const records = await this.zkService.getAttendanceRecords(
        deviceId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      let syncedCount = 0;
      for (const record of records) {
        try {
          const employee = await this.dbService.getEmployee(record.userId);
          
          const attendanceRecord = {
            employeeId: record.userId,
            employeeName: employee?.name || 'Unknown Employee',
            timestamp: record.timestamp.toISOString(),
            type: record.type,
            method: record.method,
            deviceId: record.deviceId,
            location: this.getDeviceLocation(record.deviceId),
            status: 'success' as const
          };

          await this.dbService.createAttendanceRecord(attendanceRecord);
          syncedCount++;
        } catch (error) {
          console.error('Error syncing record:', error);
        }
      }

      res.json({
        success: true,
        message: `Synced ${syncedCount} attendance records from device ${deviceId}`,
        syncedCount
      });
    } catch (error) {
      console.error('Error syncing attendance from device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync attendance from device'
      });
    }
  }

  private async exportAttendanceData(req: Request, res: Response): Promise<void> {
    try {
      const {
        format = 'csv',
        startDate,
        endDate,
        employeeId,
        deviceId
      } = req.query;

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        employeeId: employeeId as string,
        deviceId: deviceId as string
      };

      const records = await this.dbService.getAttendanceRecords(filters);

      if (format === 'csv') {
        const csvHeader = 'Employee ID,Employee Name,Date,Time,Type,Method,Device,Location,Status\n';
        const csvData = records.map(record => {
          const date = new Date(record.timestamp);
          return [
            record.employeeId,
            record.employeeName,
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            record.type,
            record.method,
            record.deviceId,
            record.location,
            record.status
          ].join(',');
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${Date.now()}.csv`);
        res.send(csvHeader + csvData);
      } else {
        res.json({
          success: true,
          data: records
        });
      }
    } catch (error) {
      console.error('Error exporting attendance data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export attendance data'
      });
    }
  }

  private async getAttendanceStats(req: Request, res: Response): Promise<void> {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const records = await this.dbService.getAttendanceRecords({
        startDate: startOfDay,
        endDate: endOfDay
      });

      const stats = {
        totalRecords: records.length,
        checkIns: records.filter(r => r.type === 'check-in').length,
        checkOuts: records.filter(r => r.type === 'check-out').length,
        breaks: records.filter(r => r.type.includes('break')).length,
        successfulRecords: records.filter(r => r.status === 'success').length,
        methodBreakdown: {
          fingerprint: records.filter(r => r.method === 'fingerprint').length,
          face: records.filter(r => r.method === 'face').length,
          card: records.filter(r => r.method === 'card').length,
          pin: records.filter(r => r.method === 'pin').length
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get attendance statistics'
      });
    }
  }

  private async getDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const records = await this.dbService.getAttendanceRecords({
        startDate: startOfDay,
        endDate: endOfDay
      });

      const employees = await this.dbService.getEmployees();
      const activeEmployees = employees.filter(e => e.isActive);

      const presentEmployees = new Set(
        records.filter(r => r.type === 'check-in').map(r => r.employeeId)
      );

      const lateArrivals = records.filter(r => {
        if (r.type !== 'check-in') return false;
        const checkInTime = new Date(r.timestamp);
        const hour = checkInTime.getHours();
        return hour >= 9; // Assuming 9 AM is the standard start time
      });

      const report = {
        date,
        totalEmployees: activeEmployees.length,
        presentEmployees: presentEmployees.size,
        lateArrivals: lateArrivals.length,
        earlyDepartures: 0, // Would need more complex logic
        overtime: 0, // Would need more complex logic
        totalHours: presentEmployees.size * 8 // Simplified calculation
      };

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating daily report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate daily report'
      });
    }
  }

  private getDeviceLocation(deviceId: string): string {
    const device = this.zkService.getDevice(deviceId);
    return device?.ip || 'Unknown Location';
  }
}