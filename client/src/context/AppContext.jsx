import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext();

// In production, use relative URLs (same origin). In development, use localhost
const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  ? import.meta.env.VITE_SOCKET_URL
  : (import.meta.env.PROD ? window.location.origin : 'http://localhost:3002');

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage on initial load
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [authRole, setAuthRole] = useState(() => {
    // site | hq
    return localStorage.getItem('authRole') || null;
  });
  const socketRef = useRef(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
    checkWhatsAppConnection();
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
    });

    // Listen for task created
    socket.on('task:created', (data) => {
      console.log('Task created via WebSocket:', data.task);
      setTasks(prevTasks => [...prevTasks, data.task]);
    });

    // Listen for task updated
    socket.on('task:updated', async (data) => {
      console.log('✅ Task updated via WebSocket:', data.task);
      console.log('   Task ID:', data.task.id, '| New Status:', data.task.status);

      // Fetch attachments for updated task
      try {
        const attachmentsResponse = await fetch(`${API_URL}/tasks/${data.task.id}/attachments`);
        const attachments = await attachmentsResponse.json();
        data.task.attachments = attachments;
      } catch (error) {
        console.error('Error fetching attachments for updated task:', error);
        data.task.attachments = [];
      }

      setTasks(prevTasks => {
        const updated = prevTasks.map(task =>
          task.id === data.task.id ? data.task : task
        );
        console.log('   Tasks after update:', updated.length, 'tasks');
        return updated;
      });

      // Refresh employee stats when task status changes
      fetchEmployees();
    });

    // Listen for task deleted
    socket.on('task:deleted', (data) => {
      console.log('Task deleted via WebSocket:', data.task);
      setTasks(prevTasks =>
        prevTasks.filter(task => task.id !== data.task.id)
      );
    });

    // Store socket in ref for cleanup
    socketRef.current = socket;

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.disconnect();
    };
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchSystems(),
        fetchEmployees(),
        fetchSuppliers(),
        fetchLocations(),
        fetchBuildings(),
        fetchTenants()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tasks
  const fetchTasks = async () => {
    const response = await fetch(`${API_URL}/tasks`);
    const tasksData = await response.json();

    // Fetch attachments for each task
    const tasksWithAttachments = await Promise.all(
      tasksData.map(async (task) => {
        try {
          const attachmentsResponse = await fetch(`${API_URL}/tasks/${task.id}/attachments`);
          const attachments = await attachmentsResponse.json();
          return { ...task, attachments };
        } catch (error) {
          console.error(`Error fetching attachments for task ${task.id}:`, error);
          return { ...task, attachments: [] };
        }
      })
    );

    setTasks(tasksWithAttachments);
  };

  const addTask = async (task) => {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת משימה');
    const createdTask = await response.json();
    await fetchTasks();
    return createdTask;
  };

  const updateTask = async (id, task) => {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון משימה');
    await fetchTasks();
  };

  const updateTaskStatus = async (id, status) => {
    const response = await fetch(`${API_URL}/tasks/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('שגיאה בעדכון סטטוס');
    await fetchTasks();
    await fetchEmployees(); // Refresh employee stats when task status changes
  };

  const toggleTaskStar = async (id) => {
    const response = await fetch(`${API_URL}/tasks/${id}/star`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('שגיאה בעדכון כוכב');
    await fetchTasks();
  };

  const deleteTask = async (id) => {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת משימה');
    await fetchTasks();
  };

  // Systems
  const fetchSystems = async () => {
    const response = await fetch(`${API_URL}/systems`);
    const data = await response.json();
    setSystems(data);
  };

  const addSystem = async (system) => {
    const response = await fetch(`${API_URL}/systems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(system)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת מערכת');
    await fetchSystems();
  };

  const updateSystem = async (id, system) => {
    const response = await fetch(`${API_URL}/systems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(system)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון מערכת');
    await fetchSystems();
  };

  const deleteSystem = async (id) => {
    const response = await fetch(`${API_URL}/systems/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת מערכת');
    await fetchSystems();
  };

  // Employees
  const fetchEmployees = async () => {
    console.log('[DEBUG fetchEmployees] Starting fetch...');
    const response = await fetch(`${API_URL}/employees`);
    const data = await response.json();
    console.log('[DEBUG fetchEmployees] Received data:', data);
    console.log('[DEBUG fetchEmployees] Sample employee:', data[0]);
    setEmployees(data);
    console.log('[DEBUG fetchEmployees] State updated');
  };

  const addEmployee = async (employee) => {
    const response = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת עובד');
    await fetchEmployees();
  };

  const updateEmployee = async (id, employee) => {
    console.log('[DEBUG updateEmployee] Updating employee', id, 'with data:', employee);
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון עובד');
    const updatedEmployee = await response.json();
    console.log('[DEBUG updateEmployee] Server returned:', updatedEmployee);
    await fetchEmployees();
    console.log('[DEBUG updateEmployee] fetchEmployees completed');
  };

  const deleteEmployee = async (id) => {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת עובד');
    await fetchEmployees();
  };

  // Suppliers
  const fetchSuppliers = async () => {
    const response = await fetch(`${API_URL}/suppliers`);
    const data = await response.json();
    setSuppliers(data);
  };

  const addSupplier = async (supplier) => {
    const response = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplier)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת ספק');
    await fetchSuppliers();
  };

  const updateSupplier = async (id, supplier) => {
    const response = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplier)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון ספק');
    await fetchSuppliers();
  };

  const markSupplierAsPaid = async (id) => {
    const response = await fetch(`${API_URL}/suppliers/${id}/pay`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('שגיאה בעדכון תשלום');
    await fetchSuppliers();
  };

  const deleteSupplier = async (id) => {
    const response = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת ספק');
    await fetchSuppliers();
  };

  // Locations
  const fetchLocations = async () => {
    const response = await fetch(`${API_URL}/locations`);
    const data = await response.json();
    setLocations(data);
  };

  const addLocation = async (location) => {
    const response = await fetch(`${API_URL}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת מיקום');
    await fetchLocations();
  };

  const updateLocation = async (id, location) => {
    const response = await fetch(`${API_URL}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון מיקום');
    await fetchLocations();
  };

  const deleteLocation = async (id) => {
    const response = await fetch(`${API_URL}/locations/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת מיקום');
    await fetchLocations();
  };

  // Buildings
  const fetchBuildings = async () => {
    const response = await fetch(`${API_URL}/buildings`);
    const data = await response.json();
    setBuildings(data);
  };

  const addBuilding = async (building) => {
    const response = await fetch(`${API_URL}/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(building)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת מבנה');
    await fetchBuildings();
  };

  const updateBuilding = async (id, building) => {
    const response = await fetch(`${API_URL}/buildings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(building)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון מבנה');
    await fetchBuildings();
  };

  const deleteBuilding = async (id) => {
    const response = await fetch(`${API_URL}/buildings/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת מבנה');
    await fetchBuildings();
    await fetchTenants();
  };

  // Tenants
  const fetchTenants = async () => {
    const response = await fetch(`${API_URL}/tenants`);
    const data = await response.json();
    setTenants(data);
  };

  const addTenant = async (tenant) => {
    const response = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת דייר');
    await fetchTenants();
  };

  const updateTenant = async (id, tenant) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון דייר');
    await fetchTenants();
  };

  const deleteTenant = async (id) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה במחיקת דייר');
    await fetchTenants();
  };

  // Data management
  const seedData = async () => {
    const response = await fetch(`${API_URL}/data/seed`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('שגיאה בטעינת נתוני דמה');
    await fetchAllData();
  };

  const clearData = async () => {
    const response = await fetch(`${API_URL}/data/clear`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('שגיאה בניקוי נתונים');
    await fetchAllData();
  };

  // WhatsApp connection management
  const checkWhatsAppConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/whatsapp/status`);
      const data = await response.json();
      setWhatsappConnected(data.isReady);
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
      setWhatsappConnected(false);
    }
  };

  // Authentication methods
  const login = (role = 'site') => {
    setIsAuthenticated(true);
    setAuthRole(role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authRole', role);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthRole(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authRole');
  };

  const value = {
    tasks,
    systems,
    employees,
    suppliers,
    locations,
    buildings,
    tenants,
    loading,
    // Task modal state
    isTaskModalOpen,
    setIsTaskModalOpen,
    editingTask,
    setEditingTask,
    // Task methods
    addTask,
    updateTask,
    updateTaskStatus,
    toggleTaskStar,
    deleteTask,
    // System methods
    addSystem,
    updateSystem,
    deleteSystem,
    // Employee methods
    addEmployee,
    updateEmployee,
    deleteEmployee,
    // Supplier methods
    addSupplier,
    updateSupplier,
    markSupplierAsPaid,
    deleteSupplier,
    // Location methods
    addLocation,
    updateLocation,
    deleteLocation,
    // Building methods
    addBuilding,
    updateBuilding,
    deleteBuilding,
    // Tenant methods
    addTenant,
    updateTenant,
    deleteTenant,
    // Data management
    seedData,
    clearData,
    refreshData: fetchAllData,
    // WhatsApp
    whatsappConnected,
    checkWhatsAppConnection,
    // WebSocket
    connectionStatus,
    // Authentication
    isAuthenticated,
    authRole,
    login,
    logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
