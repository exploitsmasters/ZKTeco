import { EventEmitter } from 'events';
import net from 'net';

export interface ZKDevice {
  id: string;
  ip: string;
  port: number;
  password?: string;
  isConnected: boolean;
  lastSeen: Date;
}

export interface AttendanceRecord {
  userId: string;
  timestamp: Date;
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  method: 'fingerprint' | 'face' | 'card' | 'pin';
  deviceId: string;
}

export interface BiometricTemplate {
  userId: string;
  templateType: 'fingerprint' | 'face' | 'card';
  templateData: Buffer;
  quality: number;
}

export class ZKTecoService extends EventEmitter {
  private devices: Map<string, ZKDevice> = new Map();
  private connections: Map<string, net.Socket> = new Map();
  private isInitialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    // Load device configurations from environment or database
    const defaultDevices = [
      {
        id: 'ZK001',
        ip: process.env.ZK_DEVICE_IP || '192.168.100.72',
        port: parseInt(process.env.ZK_DEVICE_PORT || '4370'),
        password: process.env.ZK_DEVICE_PASSWORD || ''
      },
      {
        id: 'MB2000',
        ip: '192.168.100.72',
        port: 4370,
        password: ''
      }
    ];

    for (const deviceConfig of defaultDevices) {
      await this.addDevice(deviceConfig);
    }

    this.isInitialized = true;
    this.emit('initialized');
  }

  async addDevice(config: Omit<ZKDevice, 'isConnected' | 'lastSeen'>): Promise<void> {
    const device: ZKDevice = {
      ...config,
      isConnected: false,
      lastSeen: new Date()
    };

    this.devices.set(device.id, device);
    await this.connectToDevice(device.id);
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.connect(device.port, device.ip, () => {
        console.log(`Connected to ZKTeco device ${deviceId} at ${device.ip}:${device.port}`);
        device.isConnected = true;
        device.lastSeen = new Date();
        
        this.connections.set(deviceId, socket);
        this.setupSocketHandlers(deviceId, socket);
        
        this.emit('deviceConnected', deviceId);
        resolve(true);
      });

      socket.on('error', (error) => {
        console.error(`Connection error for device ${deviceId}:`, error);
        device.isConnected = false;
        this.emit('deviceError', deviceId, error);
        reject(error);
      });

      socket.on('timeout', () => {
        console.error(`Connection timeout for device ${deviceId}`);
        socket.destroy();
        device.isConnected = false;
        reject(new Error('Connection timeout'));
      });
    });
  }

  private setupSocketHandlers(deviceId: string, socket: net.Socket): void {
    socket.on('data', (data) => {
      this.handleDeviceData(deviceId, data);
    });

    socket.on('close', () => {
      console.log(`Device ${deviceId} disconnected`);
      const device = this.devices.get(deviceId);
      if (device) {
        device.isConnected = false;
      }
      this.connections.delete(deviceId);
      this.emit('deviceDisconnected', deviceId);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        this.connectToDevice(deviceId).catch(console.error);
      }, 5000);
    });
  }

  private handleDeviceData(deviceId: string, data: Buffer): void {
    try {
      // Parse ZKTeco protocol data
      const parsedData = this.parseZKData(data);
      
      if (parsedData.type === 'attendance') {
        const record: AttendanceRecord = {
          userId: parsedData.userId,
          timestamp: parsedData.timestamp,
          type: this.determineAttendanceType(parsedData),
          method: parsedData.method,
          deviceId
        };
        
        this.emit('attendanceRecord', record);
      } else if (parsedData.type === 'heartbeat') {
        const device = this.devices.get(deviceId);
        if (device) {
          device.lastSeen = new Date();
        }
      }
    } catch (error) {
      console.error(`Error parsing data from device ${deviceId}:`, error);
    }
  }

  private parseZKData(data: Buffer): any {
    // This is a simplified parser - actual ZKTeco protocol is more complex
    // You would need to implement the full ZKTeco communication protocol here
    
    if (data.length < 8) {
      throw new Error('Invalid data length');
    }

    const command = data.readUInt16LE(0);
    const checksum = data.readUInt16LE(2);
    const sessionId = data.readUInt16LE(4);
    const replyId = data.readUInt16LE(6);

    // Mock parsing for demonstration
    return {
      type: 'attendance',
      userId: '12345',
      timestamp: new Date(),
      method: 'fingerprint' as const,
      verifyMode: 1
    };
  }

  private determineAttendanceType(data: any): AttendanceRecord['type'] {
    // Logic to determine if it's check-in, check-out, etc.
    // This would be based on your business rules
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return 'check-in';
    } else if (hour > 17) {
      return 'check-out';
    } else {
      return 'break-start';
    }
  }

  async sendCommand(deviceId: string, command: Buffer): Promise<Buffer> {
    const socket = this.connections.get(deviceId);
    if (!socket) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);

      socket.once('data', (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      socket.write(command);
    });
  }

  async getAttendanceRecords(deviceId: string, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    // Command to request attendance records from device
    const command = this.buildGetAttendanceCommand(startDate, endDate);
    const response = await this.sendCommand(deviceId, command);
    return this.parseAttendanceRecords(response, deviceId);
  }

  async enrollUser(deviceId: string, userId: string, templates: BiometricTemplate[]): Promise<boolean> {
    try {
      for (const template of templates) {
        const command = this.buildEnrollCommand(userId, template);
        await this.sendCommand(deviceId, command);
      }
      return true;
    } catch (error) {
      console.error(`Failed to enroll user ${userId} on device ${deviceId}:`, error);
      return false;
    }
  }

  async deleteUser(deviceId: string, userId: string): Promise<boolean> {
    try {
      const command = this.buildDeleteUserCommand(userId);
      await this.sendCommand(deviceId, command);
      return true;
    } catch (error) {
      console.error(`Failed to delete user ${userId} from device ${deviceId}:`, error);
      return false;
    }
  }

  async getDeviceInfo(deviceId: string): Promise<any> {
    const command = this.buildGetInfoCommand();
    const response = await this.sendCommand(deviceId, command);
    return this.parseDeviceInfo(response);
  }

  private buildGetAttendanceCommand(startDate?: Date, endDate?: Date): Buffer {
    // Build ZKTeco protocol command for getting attendance records
    const buffer = Buffer.alloc(16);
    buffer.writeUInt16LE(0x0D, 0); // CMD_ATTLOG_RRQ
    // Add date parameters if provided
    return buffer;
  }

  private buildEnrollCommand(userId: string, template: BiometricTemplate): Buffer {
    // Build enrollment command
    const buffer = Buffer.alloc(1024);
    buffer.writeUInt16LE(0x01, 0); // CMD_USER_WRQ
    // Add user data and template
    return buffer;
  }

  private buildDeleteUserCommand(userId: string): Buffer {
    const buffer = Buffer.alloc(16);
    buffer.writeUInt16LE(0x12, 0); // CMD_DELETE_USER
    // Add user ID
    return buffer;
  }

  private buildGetInfoCommand(): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt16LE(0x0B, 0); // CMD_GET_FREE_SIZES
    return buffer;
  }

  private parseAttendanceRecords(data: Buffer, deviceId: string): AttendanceRecord[] {
    // Parse attendance records from device response
    const records: AttendanceRecord[] = [];
    // Implementation would parse the actual protocol response
    return records;
  }

  private parseDeviceInfo(data: Buffer): any {
    // Parse device information from response
    return {
      userCount: 0,
      recordCount: 0,
      capacity: {
        users: 3000,
        records: 100000
      },
      firmware: 'Ver 6.60 Apr 28 2023'
    };
  }

  getDevices(): ZKDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(deviceId: string): ZKDevice | undefined {
    return this.devices.get(deviceId);
  }

  isConnected(): boolean {
    return this.isInitialized && Array.from(this.devices.values()).some(d => d.isConnected);
  }

  async disconnect(deviceId?: string): Promise<void> {
    if (deviceId) {
      const socket = this.connections.get(deviceId);
      if (socket) {
        socket.destroy();
      }
    } else {
      // Disconnect all devices
      for (const socket of this.connections.values()) {
        socket.destroy();
      }
    }
  }
}