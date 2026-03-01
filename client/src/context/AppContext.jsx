import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL, LS_KEYS } from '../config';

const AppContext = createContext();

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
    return localStorage.getItem(LS_KEYS.IS_AUTHENTICATED) === 'true';
  });
  const [authRole, setAuthRole] = useState(() => {
    // site | hq
    return localStorage.getItem(LS_KEYS.AUTH_ROLE) || null;
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
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
    });

    // Listen for task created
    socket.on('task:created', (data) => {
      setTasks(prevTasks => [...prevTasks, data.task]);
    });

    // Listen for task updated
    socket.on('task:updated', async (data) => {

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
        return updated;
      });

      // Refresh employee stats when task status changes
      fetchEmployees();
    });

    // Listen for task deleted
    socket.on('task:deleted', (data) => {
      setTasks(prevTasks =>
        prevTasks.filter(task => task.id !== data.task.id)
      );
    });

    // Listen for bulk task updates (e.g. autoclose, mass status change)
    socket.on('tasks:bulk_updated', () => {
      fetchTasks();
      fetchEmployees();
    });

    // Store socket in ref for cleanup
    socketRef.current = socket;

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('tasks:bulk_updated');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫₧╫⌐╫ש╫₧╫פ');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫₧╫⌐╫ש╫₧╫פ');
    await fetchTasks();
  };

  const updateTaskStatus = async (id, status) => {
    const response = await fetch(`${API_URL}/tasks/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫í╫ר╫ר╫ץ╫í');
    await fetchTasks();
    await fetchEmployees(); // Refresh employee stats when task status changes
  };

  const toggleTaskStar = async (id) => {
    const response = await fetch(`${API_URL}/tasks/${id}/star`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫¢╫ץ╫¢╫ס');
    await fetchTasks();
  };

  const deleteTask = async (id) => {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      let errMsg = 'שגיאה במחיקת משימה';
      try { const d = await response.json(); if (d?.error) errMsg = d.error; } catch (_) {}
      throw new Error(errMsg);
    }
    await fetchTasks();
  };

  const deleteTaskSeries = async (id) => {
    const response = await fetch(`${API_URL}/tasks/${id}/series`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫í╫ף╫¿╫¬ ╫₧╫⌐╫ש╫₧╫ץ╫¬');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫₧╫ó╫¿╫¢╫¬');
    await fetchSystems();
  };

  const updateSystem = async (id, system) => {
    const response = await fetch(`${API_URL}/systems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(system)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫₧╫ó╫¿╫¢╫¬');
    await fetchSystems();
  };

  const deleteSystem = async (id) => {
    const response = await fetch(`${API_URL}/systems/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫₧╫ó╫¿╫¢╫¬');
    await fetchSystems();
  };

  // Employees
  const fetchEmployees = async () => {
    const response = await fetch(`${API_URL}/employees`);
    const data = await response.json();
    setEmployees(data);
  };

  const addEmployee = async (employee) => {
    const response = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫ó╫ץ╫ס╫ף');
    await fetchEmployees();
  };

  const updateEmployee = async (id, employee) => {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫ó╫ץ╫ס╫ף');
    const updatedEmployee = await response.json();
    await fetchEmployees();
  };

  const deleteEmployee = async (id) => {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫ó╫ץ╫ס╫ף');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫í╫ñ╫º');
    await fetchSuppliers();
  };

  const updateSupplier = async (id, supplier) => {
    const response = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplier)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫í╫ñ╫º');
    await fetchSuppliers();
  };

  const markSupplierAsPaid = async (id) => {
    const response = await fetch(`${API_URL}/suppliers/${id}/pay`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫¬╫⌐╫£╫ץ╫¥');
    await fetchSuppliers();
  };

  const deleteSupplier = async (id) => {
    const response = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫í╫ñ╫º');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫₧╫ש╫º╫ץ╫¥');
    await fetchLocations();
  };

  const updateLocation = async (id, location) => {
    const response = await fetch(`${API_URL}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫₧╫ש╫º╫ץ╫¥');
    await fetchLocations();
  };

  const deleteLocation = async (id) => {
    const response = await fetch(`${API_URL}/locations/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫₧╫ש╫º╫ץ╫¥');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫₧╫ס╫á╫פ');
    await fetchBuildings();
  };

  const updateBuilding = async (id, building) => {
    const response = await fetch(`${API_URL}/buildings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(building)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫₧╫ס╫á╫פ');
    await fetchBuildings();
  };

  const deleteBuilding = async (id) => {
    const response = await fetch(`${API_URL}/buildings/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫₧╫ס╫á╫פ');
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
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ש╫ª╫ש╫¿╫¬ ╫ף╫ש╫ש╫¿');
    await fetchTenants();
  };

  const updateTenant = async (id, tenant) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ó╫ף╫¢╫ץ╫ƒ ╫ף╫ש╫ש╫¿');
    await fetchTenants();
  };

  const deleteTenant = async (id) => {
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫₧╫ק╫ש╫º╫¬ ╫ף╫ש╫ש╫¿');
    await fetchTenants();
  };

  // Data management
  const seedData = async () => {
    const response = await fetch(`${API_URL}/data/seed`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫ר╫ó╫ש╫á╫¬ ╫á╫¬╫ץ╫á╫ש ╫ף╫₧╫פ');
    await fetchAllData();
  };

  const clearData = async () => {
    const response = await fetch(`${API_URL}/data/clear`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('╫⌐╫ע╫ש╫נ╫פ ╫ס╫á╫ש╫º╫ץ╫ש ╫á╫¬╫ץ╫á╫ש╫¥');
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
    localStorage.setItem(LS_KEYS.IS_AUTHENTICATED, 'true');
    localStorage.setItem(LS_KEYS.AUTH_ROLE, role);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthRole(null);
    localStorage.removeItem(LS_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(LS_KEYS.AUTH_ROLE);
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
    deleteTaskSeries,
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
