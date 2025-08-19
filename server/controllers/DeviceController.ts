import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ZKTecoService } from '../services/ZKTecoService';
import { RealtimeService } from '../services/RealtimeService';

export class DeviceController {
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
    this.router.get('/', this.getDevices.bind(this));
    this.router.get('/:deviceId', this.getDevice.bind(this));
    this.router.post('/', this.addDevice.bind(this));
    this.router.put('/:deviceId', this.updateDevice.bind(this));
    this.router.delete('/:deviceId', this.removeDevice.bind(this));
    this.router.post('/:deviceId/connect', this.connectDevice.bind(this));
    this.router.post('/:deviceId/disconnect', this.disconnectDevice.bind(this));
    this.router.get('/:deviceId/info', this.getDeviceInfo.bind(this));
    this.router.post('/:deviceId/sync', this.syncDevice.bind(this));
    this.router.get('/:deviceId/users', this.getDeviceUsers.bind(this));
  }

  private setupEventListeners(): void {
    this.zkService.on('deviceConnected', (deviceId) => {
      this.realtimeService.broadcastDeviceStatus(deviceId, 'online', {
        message: 'Device connected successfully'
      });
    });

    this.zkService.on('deviceDisconnected', (deviceId) => {
      this.realtimeService.broadcastDeviceStatus(deviceId, 'offline', {
        message: 'Device disconnected'
      });
    });

    this.zkService.on('deviceError', (deviceId, error) => {
      this.realtimeService.broadcastDeviceStatus(deviceId, 'error', {
        message: 'Device error occurred',
        error: error.message
      });
    });
  }

  private async getDevices(req: Request, res: Response): Promise<void> {
    try {
      const zkDevices = this.zkService.getDevices();
      const dbDevices = await this.dbService.getDevices();

      // Merge device information from ZKTeco service and database
      const devices = zkDevices.map(zkDevice => {
        const dbDevice = dbDevices.find(d => d.id === zkDevice.id);
        return {
          ...zkDevice,
          ...dbDevice,
          status: zkDevice.isConnected ? 'online' : 'offline',
          lastSeen: zkDevice.lastSeen.toISOString()
        };
      });

      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch devices'
      });
    }
  }

  private async getDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      
      const zkDevice = this.zkService.getDevice(deviceId);
      if (!zkDevice) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      // Get additional device info if connected
      let deviceInfo = null;
      if (zkDevice.isConnected) {
        try {
          deviceInfo = await this.zkService.getDeviceInfo(deviceId);
        } catch (error) {
          console.error('Error getting device info:', error);
        }
      }

      const device = {
        ...zkDevice,
        status: zkDevice.isConnected ? 'online' : 'offline',
        lastSeen: zkDevice.lastSeen.toISOString(),
        info: deviceInfo
      };

      res.json({
        success: true,
        data: device
      });
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch device'
      });
    }
  }

  private async addDevice(req: Request, res: Response): Promise<void> {
    try {
      const deviceData = req.body;
      
      // Validate required fields
      const requiredFields = ['id', 'ip', 'port'];
      for (const field of requiredFields) {
        if (!deviceData[field]) {
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
          return;
        }
      }

      // Check if device already exists
      const existingDevice = this.zkService.getDevice(deviceData.id);
      if (existingDevice) {
        res.status(409).json({
          success: false,
          error: 'Device already exists'
        });
        return;
      }

      await this.zkService.addDevice(deviceData);

      // Save to database
      await this.dbService.createOrUpdateDevice({
        ...deviceData,
        name: deviceData.name || `Device ${deviceData.id}`,
        model: deviceData.model || 'ZKTeco Terminal',
        location: deviceData.location || 'Unknown Location',
        status: 'offline',
        lastSeen: new Date().toISOString(),
        firmware: 'Unknown',
        userCapacity: 3000,
        recordCapacity: 100000,
        currentUsers: 0,
        currentRecords: 0
      });

      const device = this.zkService.getDevice(deviceData.id);

      res.status(201).json({
        success: true,
        data: device,
        message: 'Device added successfully'
      });
    } catch (error) {
      console.error('Error adding device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add device'
      });
    }
  }

  private async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const updates = req.body;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      // Update in database
      await this.dbService.createOrUpdateDevice({
        id: deviceId,
        ...updates
      });

      res.json({
        success: true,
        message: 'Device updated successfully'
      });
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update device'
      });
    }
  }

  private async removeDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      // Disconnect if connected
      if (device.isConnected) {
        await this.zkService.disconnect(deviceId);
      }

      // Remove from ZKTeco service (you'd need to implement this method)
      // await this.zkService.removeDevice(deviceId);

      res.json({
        success: true,
        message: 'Device removed successfully'
      });
    } catch (error) {
      console.error('Error removing device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove device'
      });
    }
  }

  private async connectDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      if (device.isConnected) {
        res.json({
          success: true,
          message: 'Device is already connected'
        });
        return;
      }

      const connected = await this.zkService.connectToDevice(deviceId);

      res.json({
        success: connected,
        message: connected ? 'Device connected successfully' : 'Failed to connect to device'
      });
    } catch (error) {
      console.error('Error connecting device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect to device'
      });
    }
  }

  private async disconnectDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      await this.zkService.disconnect(deviceId);

      res.json({
        success: true,
        message: 'Device disconnected successfully'
      });
    } catch (error) {
      console.error('Error disconnecting device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect device'
      });
    }
  }

  private async getDeviceInfo(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

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

      const deviceInfo = await this.zkService.getDeviceInfo(deviceId);

      res.json({
        success: true,
        data: deviceInfo
      });
    } catch (error) {
      console.error('Error getting device info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device information'
      });
    }
  }

  private async syncDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

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

      // Sync attendance records
      const records = await this.zkService.getAttendanceRecords(deviceId);
      
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
            location: device.ip,
            status: 'success' as const
          };

          await this.dbService.createAttendanceRecord(attendanceRecord);
          syncedCount++;
        } catch (error) {
          console.error('Error syncing record:', error);
        }
      }

      // Update device info in database
      const deviceInfo = await this.zkService.getDeviceInfo(deviceId);
      await this.dbService.createOrUpdateDevice({
        id: deviceId,
        currentUsers: deviceInfo.userCount,
        currentRecords: deviceInfo.recordCount,
        lastSeen: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Synced ${syncedCount} records from device`,
        syncedRecords: syncedCount
      });
    } catch (error) {
      console.error('Error syncing device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync device'
      });
    }
  }

  private async getDeviceUsers(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const device = this.zkService.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      // Get all employees enrolled on this device
      const employees = await this.dbService.getEmployees();
      const enrolledEmployees = employees.filter(emp => 
        emp.enrollmentStatus === 'enrolled' && emp.biometricTypes.length > 0
      );

      res.json({
        success: true,
        data: {
          deviceId,
          enrolledUsers: enrolledEmployees.length,
          users: enrolledEmployees.map(emp => ({
            employeeId: emp.employeeId,
            name: emp.name,
            department: emp.department,
            biometricTypes: emp.biometricTypes
          }))
        }
      });
    } catch (error) {
      console.error('Error getting device users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device users'
      });
    }
  }
}