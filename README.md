# ZKTeco Biometric Attendance Management System

A comprehensive web-based management system for ZKTeco biometric devices with real-time monitoring, employee management, and advanced reporting capabilities.

## Features

### Frontend (React + TypeScript)
- **Real-time Dashboard** - Live attendance monitoring and system statistics
- **Employee Management** - Complete CRUD operations with biometric enrollment
- **Attendance Tracking** - Real-time attendance logs with filtering and export
- **Device Management** - Monitor and configure ZKTeco terminals
- **Advanced Reporting** - Generate comprehensive attendance reports
- **Responsive Design** - Optimized for desktop and tablet use

### Backend (Node.js + Express)
- **ZKTeco Integration** - Direct communication with biometric devices
- **Real-time WebSocket** - Live updates for attendance and device status
- **SQLite Database** - Local data storage with full CRUD operations
- **RESTful API** - Complete API for all system operations
- **Device Monitoring** - Automatic device health monitoring and reconnection

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Your ZKTeco device connected to the network
- Device IP address and port (usually 4370)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your ZKTeco device details:
   ```
   ZK_DEVICE_IP=192.168.1.100
   ZK_DEVICE_PORT=4370
   ZK_DEVICE_PASSWORD=
   ```

3. **Start the Backend Server**
   ```bash
   npm run server
   ```

4. **Start the Frontend (in another terminal)**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - WebSocket: ws://localhost:3001

## ZKTeco Device Setup

### Network Configuration
1. Connect your ZKTeco device to your network
2. Configure the device IP address (usually via device menu)
3. Ensure the device is accessible from your computer
4. Default port is usually 4370

### Device Communication Protocol
The system uses the ZKTeco TCP/IP communication protocol:
- **Connection**: TCP socket connection to device IP:port
- **Commands**: Binary protocol for device operations
- **Real-time**: Automatic polling for new attendance records
- **Bidirectional**: Send commands and receive responses

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/:id/enroll` - Enroll employee on devices

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `GET /api/attendance/sync/:deviceId` - Sync from device
- `GET /api/attendance/export` - Export attendance data

### Devices
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Add new device
- `POST /api/devices/:id/connect` - Connect to device
- `GET /api/devices/:id/info` - Get device information

## Real-time Features

### WebSocket Events
- `attendance` - New attendance record
- `device_status` - Device connection status changes
- `employee_update` - Employee data changes
- `system_alert` - System notifications

### Auto-sync
- Automatic attendance record synchronization
- Device health monitoring
- Real-time dashboard updates
- Automatic reconnection on device disconnect

## Database Schema

### Employees Table
- Employee information and biometric enrollment status
- Supports multiple biometric types (fingerprint, face, card)
- Department and shift management

### Attendance Records
- Complete attendance logs with timestamps
- Support for check-in/out and break times
- Device and method tracking

### Devices Table
- Device configuration and status
- Capacity monitoring
- Connection health tracking

## Customization

### Adding New Biometric Types
1. Update the `BiometricTemplate` interface
2. Modify the enrollment process in `ZKTecoService`
3. Update the UI components for new types

### Custom Attendance Rules
1. Modify `determineAttendanceType()` in `ZKTecoService`
2. Add business logic for your specific requirements
3. Update the dashboard calculations

### Additional Device Models
1. Extend the `ZKTecoService` for new protocols
2. Add device-specific command builders
3. Update the device management UI

## Troubleshooting

### Device Connection Issues
1. Verify network connectivity: `ping [device-ip]`
2. Check device port accessibility: `telnet [device-ip] 4370`
3. Ensure device is not connected to other software
4. Verify device settings (TCP/IP enabled)

### Common Problems
- **Device Offline**: Check network connection and device power
- **Enrollment Failed**: Verify device capacity and user permissions
- **Sync Issues**: Check device time synchronization
- **Performance**: Monitor database size and optimize queries

## Production Deployment

### Security Considerations
- Change default passwords
- Use HTTPS/WSS in production
- Implement proper authentication
- Secure database access
- Network firewall configuration

### Scaling
- Use PostgreSQL/MySQL for larger deployments
- Implement Redis for session management
- Load balancing for multiple servers
- Database replication for high availability

## Support

For ZKTeco device-specific issues:
1. Consult your device manual
2. Check ZKTeco developer documentation
3. Verify firmware compatibility
4. Contact ZKTeco technical support

## License

This project is licensed under the MIT License - see the LICENSE file for details.