import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { ZKTecoService } from './services/ZKTecoService';
import { DatabaseService } from './services/DatabaseService';
import { AttendanceController } from './controllers/AttendanceController';
import { EmployeeController } from './controllers/EmployeeController';
import { DeviceController } from './controllers/DeviceController';
import { ShiftController } from './controllers/ShiftController';
import { USBImportController } from './controllers/USBImportController';
import { RealtimeService } from './services/RealtimeService';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const dbService = new DatabaseService();
const zkService = new ZKTecoService();
const realtimeService = new RealtimeService(wss);

// Initialize controllers
const attendanceController = new AttendanceController(dbService, zkService, realtimeService);
const employeeController = new EmployeeController(dbService, zkService, realtimeService);
const deviceController = new DeviceController(dbService, zkService, realtimeService);
const shiftController = new ShiftController(dbService, realtimeService);
const usbImportController = new USBImportController(dbService, realtimeService);

// Routes
app.use('/api/attendance', attendanceController.router);
app.use('/api/employees', employeeController.router);
app.use('/api/devices', deviceController.router);
app.use('/api/shifts', shiftController.router);
app.use('/api/import', usbImportController.router);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: dbService.isConnected(),
      zkDevice: zkService.isConnected()
    }
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  realtimeService.addClient(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    realtimeService.removeClient(ws);
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database
    await dbService.initialize();
    console.log('Database initialized');
    
    // Initialize ZKTeco connection
    await zkService.initialize();
    console.log('ZKTeco service initialized');
    
    // Start real-time monitoring
    realtimeService.startMonitoring();
    console.log('Real-time monitoring started');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();