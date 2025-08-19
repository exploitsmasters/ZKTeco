import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ZKTecoService } from '../services/ZKTecoService';
import { RealtimeService } from '../services/RealtimeService';

export class EmployeeController {
  public router: Router;

  constructor(
    private dbService: DatabaseService,
    private zkService: ZKTecoService,
    private realtimeService: RealtimeService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getEmployees.bind(this));
    this.router.get('/:employeeId', this.getEmployee.bind(this));
    this.router.post('/', this.createEmployee.bind(this));
    this.router.put('/:employeeId', this.updateEmployee.bind(this));
    this.router.delete('/:employeeId', this.deleteEmployee.bind(this));
    this.router.post('/:employeeId/enroll', this.enrollEmployee.bind(this));
    this.router.delete('/:employeeId/enroll/:deviceId', this.removeEmployeeFromDevice.bind(this));
    this.router.get('/:employeeId/attendance', this.getEmployeeAttendance.bind(this));
  }

  private async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const {
        department,
        status,
        search,
        page = 1,
        limit = 50
      } = req.query;

      let employees = await this.dbService.getEmployees();

      // Apply filters
      if (department) {
        employees = employees.filter(emp => 
          emp.department.toLowerCase() === (department as string).toLowerCase()
        );
      }

      if (status) {
        employees = employees.filter(emp => emp.enrollmentStatus === status);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        employees = employees.filter(emp =>
          emp.name.toLowerCase().includes(searchTerm) ||
          emp.employeeId.toLowerCase().includes(searchTerm) ||
          emp.email.toLowerCase().includes(searchTerm)
        );
      }

      // Implement pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedEmployees = employees.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedEmployees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: employees.length,
          totalPages: Math.ceil(employees.length / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employees'
      });
    }
  }

  private async getEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      
      const employee = await this.dbService.getEmployee(employeeId);
      
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employee'
      });
    }
  }

  private async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const employeeData = req.body;
      
      // Validate required fields
      const requiredFields = ['employeeId', 'name', 'department', 'position', 'email', 'joinDate'];
      for (const field of requiredFields) {
        if (!employeeData[field]) {
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
          return;
        }
      }

      // Check if employee ID already exists
      const existingEmployee = await this.dbService.getEmployee(employeeData.employeeId);
      if (existingEmployee) {
        res.status(409).json({
          success: false,
          error: 'Employee ID already exists'
        });
        return;
      }

      // Set defaults
      const employee = {
        ...employeeData,
        enrollmentStatus: employeeData.enrollmentStatus || 'pending',
        biometricTypes: employeeData.biometricTypes || [],
        isActive: employeeData.isActive !== undefined ? employeeData.isActive : true,
        shift: employeeData.shift || 'Morning'
      };

      const createdEmployee = await this.dbService.createEmployee(employee);
      
      // Broadcast to connected clients
      this.realtimeService.broadcastEmployeeUpdate(createdEmployee, 'created');

      res.status(201).json({
        success: true,
        data: createdEmployee
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create employee'
      });
    }
  }

  private async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const updates = req.body;

      const existingEmployee = await this.dbService.getEmployee(employeeId);
      if (!existingEmployee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      const updatedEmployee = await this.dbService.updateEmployee(employeeId, updates);
      
      if (!updatedEmployee) {
        res.status(500).json({
          success: false,
          error: 'Failed to update employee'
        });
        return;
      }

      // Broadcast to connected clients
      this.realtimeService.broadcastEmployeeUpdate(updatedEmployee, 'updated');

      res.json({
        success: true,
        data: updatedEmployee
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update employee'
      });
    }
  }

  private async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;

      const employee = await this.dbService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      // Remove from all devices first
      const devices = this.zkService.getDevices();
      for (const device of devices) {
        if (device.isConnected) {
          try {
            await this.zkService.deleteUser(device.id, employeeId);
          } catch (error) {
            console.error(`Failed to remove employee from device ${device.id}:`, error);
          }
        }
      }

      const deleted = await this.dbService.deleteEmployee(employeeId);
      
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete employee'
        });
        return;
      }

      // Broadcast to connected clients
      this.realtimeService.broadcastEmployeeUpdate(employee, 'deleted');

      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete employee'
      });
    }
  }

  private async enrollEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { deviceIds, biometricTypes } = req.body;

      const employee = await this.dbService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      const enrollmentResults = [];

      for (const deviceId of deviceIds || []) {
        const device = this.zkService.getDevice(deviceId);
        if (!device || !device.isConnected) {
          enrollmentResults.push({
            deviceId,
            success: false,
            error: 'Device not connected'
          });
          continue;
        }

        try {
          // Create mock biometric templates (in real implementation, you'd capture actual biometric data)
          const templates = (biometricTypes || ['fingerprint']).map((type: string) => ({
            userId: employeeId,
            templateType: type,
            templateData: Buffer.from('mock_template_data'), // This would be actual biometric data
            quality: 85
          }));

          const success = await this.zkService.enrollUser(deviceId, employeeId, templates);
          
          enrollmentResults.push({
            deviceId,
            success,
            error: success ? null : 'Enrollment failed'
          });

          if (success) {
            // Update employee enrollment status
            await this.dbService.updateEmployee(employeeId, {
              enrollmentStatus: 'enrolled',
              biometricTypes: biometricTypes || ['fingerprint']
            });
          }
        } catch (error) {
          enrollmentResults.push({
            deviceId,
            success: false,
            error: (error as Error).message
          });
        }
      }

      const successfulEnrollments = enrollmentResults.filter(r => r.success).length;
      const overallSuccess = successfulEnrollments > 0;

      if (overallSuccess) {
        const updatedEmployee = await this.dbService.getEmployee(employeeId);
        this.realtimeService.broadcastEmployeeUpdate(updatedEmployee, 'updated');
      }

      res.json({
        success: overallSuccess,
        message: `Employee enrolled on ${successfulEnrollments} out of ${enrollmentResults.length} devices`,
        results: enrollmentResults
      });
    } catch (error) {
      console.error('Error enrolling employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll employee'
      });
    }
  }

  private async removeEmployeeFromDevice(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, deviceId } = req.params;

      const employee = await this.dbService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

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

      const success = await this.zkService.deleteUser(deviceId, employeeId);

      if (success) {
        // Check if employee is enrolled on other devices
        const devices = this.zkService.getDevices();
        const connectedDevices = devices.filter(d => d.isConnected && d.id !== deviceId);
        
        // If this was the last device, update enrollment status
        if (connectedDevices.length === 0) {
          await this.dbService.updateEmployee(employeeId, {
            enrollmentStatus: 'pending',
            biometricTypes: []
          });
        }

        const updatedEmployee = await this.dbService.getEmployee(employeeId);
        this.realtimeService.broadcastEmployeeUpdate(updatedEmployee, 'updated');
      }

      res.json({
        success,
        message: success 
          ? `Employee removed from device ${deviceId}` 
          : 'Failed to remove employee from device'
      });
    } catch (error) {
      console.error('Error removing employee from device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove employee from device'
      });
    }
  }

  private async getEmployeeAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate, page = 1, limit = 50 } = req.query;

      const employee = await this.dbService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
        return;
      }

      const filters = {
        employeeId,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const records = await this.dbService.getAttendanceRecords(filters);
      
      // Implement pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedRecords = records.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          employee: {
            employeeId: employee.employeeId,
            name: employee.name,
            department: employee.department
          },
          attendance: paginatedRecords
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: records.length,
          totalPages: Math.ceil(records.length / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employee attendance'
      });
    }
  }
}