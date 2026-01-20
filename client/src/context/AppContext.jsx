import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext();

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3001/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [systems, setSystems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
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
    socket.on('task:updated', (data) => {
      console.log('✅ Task updated via WebSocket:', data.task);
      console.log('   Task ID:', data.task.id, '| New Status:', data.task.status);
      setTasks(prevTasks => {
        const updated = prevTasks.map(task =>
          task.id === data.task.id ? data.task : task
        );
        console.log('   Tasks after update:', updated.length, 'tasks');
        return updated;
      });
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
        fetchLocations()
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
    const data = await response.json();
    setTasks(data);
  };

  const addTask = async (task) => {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('שגיאה ביצירת משימה');
    await fetchTasks();
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
    if (!response.ok) throw new Error('שגיאה ביצירת עובד');
    await fetchEmployees();
  };

  const updateEmployee = async (id, employee) => {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    if (!response.ok) throw new Error('שגיאה בעדכון עובד');
    await fetchEmployees();
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

  const value = {
    tasks,
    systems,
    employees,
    suppliers,
    locations,
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
    // Data management
    seedData,
    clearData,
    refreshData: fetchAllData,
    // WhatsApp
    whatsappConnected,
    checkWhatsAppConnection,
    // WebSocket
    connectionStatus
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
