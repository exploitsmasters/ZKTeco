import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface RealtimeMessage {
  type: 'attendance' | 'device_status' | 'employee_update' | 'system_alert';
  data: any;
  timestamp: Date;
}

export class RealtimeService extends EventEmitter {
  private clients: Set<WebSocket> = new Set();
  private wss: WebSocketServer;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    super();
    this.wss = wss;
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    
    // Send initial connection message
    this.sendToClient(ws, {
      type: 'system_alert',
      data: { message: 'Connected to real-time service' },
      timestamp: new Date()
    });
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  broadcast(message: RealtimeMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      } else {
        this.clients.delete(client);
      }
    });
  }

  sendToClient(client: WebSocket, message: RealtimeMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcastAttendanceRecord(record: any): void {
    this.broadcast({
      type: 'attendance',
      data: record,
      timestamp: new Date()
    });
  }

  broadcastDeviceStatus(deviceId: string, status: string, details?: any): void {
    this.broadcast({
      type: 'device_status',
      data: {
        deviceId,
        status,
        details,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  broadcastEmployeeUpdate(employee: any, action: 'created' | 'updated' | 'deleted'): void {
    this.broadcast({
      type: 'employee_update',
      data: {
        employee,
        action,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  broadcastSystemAlert(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    this.broadcast({
      type: 'system_alert',
      data: {
        message,
        level,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  startMonitoring(): void {
    // Monitor system health and send periodic updates
    this.monitoringInterval = setInterval(() => {
      const systemStats = {
        connectedClients: this.clients.size,
        timestamp: new Date(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };

      this.broadcast({
        type: 'system_alert',
        data: {
          type: 'system_stats',
          stats: systemStats
        },
        timestamp: new Date()
      });
    }, 30000); // Every 30 seconds
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}