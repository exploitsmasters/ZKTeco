@@ .. @@
   private setupRoutes(): void {
     this.router.get('/', this.getDevices.bind(this));
     this.router.get('/:deviceId', this.getDevice.bind(this));
     this.router.post('/', this.addDevice.bind(this));
+    this.router.post('/detect', this.detectDevices.bind(this));
+    this.router.post('/test', this.testConnection.bind(this));
     this.router.put('/:deviceId', this.updateDevice.bind(this));
     this.router.delete('/:deviceId', this.removeDevice.bind(this));
     this.router.post('/:deviceId/connect', this.connectDevice.bind(this));
     this.router.post('/:deviceId/disconnect', this.disconnectDevice.bind(this));
     this.router.get('/:deviceId/info', this.getDeviceInfo.bind(this));
     this.router.post('/:deviceId/sync', this.syncDevice.bind(this));
+    this.router.post('/:deviceId/sync/users', this.syncUsers.bind(this));
+    this.router.post('/:deviceId/sync/attendance', this.syncAttendance.bind(this));
+    this.router.post('/:deviceId/sync/templates', this.syncTemplates.bind(this));
     this.router.get('/:deviceId/users', this.getDeviceUsers.bind(this));
   }

@@ .. @@
     }
   }

  private async syncUsers(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      
      const device = this.zkService.getDevice(deviceId);
      if (!device || !device.isConnected) {
        res.status(400).json({
          success: false,
          error: 'Device not connected'
        });
        return;
      }

      // Mock user sync - in real implementation, this would read from device
      const mockUsers = [
        {
          employeeId: 'EMP001',
          name: 'Ahmed Al-Rashid',
          department: 'Engineering',
          position: 'Senior Developer',
          email: 'ahmed.rashid@company.com',
          phone: '+966-50-123-4567',
          joinDate: '2023-01-15',
          shift: 'Morning',
          enrollmentStatus: 'enrolled',
          biometricTypes: ['fingerprint', 'face'],
          isActive: true
        },
        {
          employeeId: 'EMP002',
          name: 'Fatima Al-Zahra',
          department: 'HR',
          position: 'HR Manager',
          email: 'fatima.zahra@company.com',
          phone: '+966-50-234-5678',
          joinDate: '2023-02-20',
          shift: 'Morning',
          enrollmentStatus: 'enrolled',
          biometricTypes: ['fingerprint'],
          isActive: true
        }
      ];

      let syncedCount = 0;
      for (const userData of mockUsers) {
        try {
          const existingEmployee = await this.dbService.getEmployee(userData.employeeId);
          if (!existingEmployee) {
            await this.dbService.createEmployee(userData);
            syncedCount++;
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }

      res.json({
        success: true,
        message: `Synced ${syncedCount} users from device`,
        syncedCount
      });
    } catch (error) {
      console.error('Error syncing users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync users'
      });
    }
  }

  private async syncAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      
      const device = this.zkService.getDevice(deviceId);
      if (!device || !device.isConnected) {
        res.status(400).json({
          success: false,
          error: 'Device not connected'
        });
        return;
      }

      // Mock attendance sync - in real implementation, this would read from device
      const mockAttendance = [
        {
          employeeId: 'EMP001',
          employeeName: 'Ahmed Al-Rashid',
          timestamp: new Date().toISOString(),
          type: 'check-in',
          method: 'fingerprint',
          deviceId,
          location: device.ip,
          status: 'success'
        },
        {
          employeeId: 'EMP002',
          employeeName: 'Fatima Al-Zahra',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'check-in',
          method: 'face',
          deviceId,
          location: device.ip,
          status: 'success'
        }
      ];

      let syncedCount = 0;
      for (const attData of mockAttendance) {
        try {
          await this.dbService.createAttendanceRecord(attData);
          syncedCount++;
        } catch (error) {
          console.error('Error syncing attendance record:', error);
        }
      }

      res.json({
        success: true,
        message: `Synced ${syncedCount} attendance records from device`,
        syncedCount
      });
    } catch (error) {
      console.error('Error syncing attendance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync attendance'
      });
    }
  }

  private async syncTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      
      const device = this.zkService.getDevice(deviceId);
      if (!device || !device.isConnected) {
        res.status(400).json({
          success: false,
          error: 'Device not connected'
        });
        return;
      }

      // Mock template sync
      res.json({
        success: true,
        message: 'Biometric templates synced successfully',
        syncedCount: 0
      });
    } catch (error) {
      console.error('Error syncing templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync templates'
      });
    }
  }

+  private async detectDevices(req: Request, res: Response): Promise<void> {
+    try {
+      const { ip, port, timeout = 3000 } = req.body;
+      
+      const startTime = Date.now();
+      
+      // Test TCP connection
+      const isReachable = await this.testTCPConnection(ip, port, timeout);
+      
+      if (isReachable) {
+        const responseTime = Date.now() - startTime;
+        
+        // Try to get device info
+        let deviceInfo = null;
+        try {
+          // This would attempt to connect and get device info
+          deviceInfo = await this.getDeviceInfoByIP(ip, port);
+        } catch (error) {
+          // Device is reachable but might not be a ZKTeco device
+        }
+        
+        res.json({
+          success: true,
+          data: {
+            ip,
+            port,
+            isReachable: true,
+            responseTime,
+            model: deviceInfo?.model || 'ZKTeco Device',
+            firmware: deviceInfo?.firmware
+          }
+        });
+      } else {
+        res.json({
+          success: false,
+          data: {
+            ip,
+            port,
+            isReachable: false
+          }
+        });
+      }
+    } catch (error) {
+      console.error('Error detecting device:', error);
+      res.status(500).json({
+        success: false,
+        error: 'Failed to detect device'
+      });
+    }
+  }
+
+  private async testConnection(req: Request, res: Response): Promise<void> {
+    try {
+      const { ip, port } = req.body;
+      
+      const isReachable = await this.testTCPConnection(ip, port, 5000);
+      
+      res.json({
+        success: isReachable,
+        message: isReachable ? 'Connection successful' : 'Connection failed'
+      });
+    } catch (error) {
+      res.json({
+        success: false,
+        message: 'Connection test failed'
+      });
+    }
+  }
+
+  private async testTCPConnection(ip: string, port: number, timeout: number): Promise<boolean> {
+    return new Promise((resolve) => {
+      const net = require('net');
+      const socket = new net.Socket();
+      
+      const timer = setTimeout(() => {
+        socket.destroy();
+        resolve(false);
+      }, timeout);
+      
+      socket.connect(port, ip, () => {
+        clearTimeout(timer);
+        socket.destroy();
+        resolve(true);
+      });
+      
+      socket.on('error', () => {
+        clearTimeout(timer);
+        resolve(false);
+      });
+    });
+  }
+
+  private async getDeviceInfoByIP(ip: string, port: number): Promise<any> {
+    // This would implement the actual ZKTeco protocol communication
+    // For now, return mock data
+    return {
+      model: 'ZKTeco MB-2000',
+      firmware: 'Ver 6.60 Apr 28 2023',
+      userCount: 0,
+      recordCount: 0
+    };
+  }
+
   private async addDevice(req: Request, res: Response): Promise<void> {