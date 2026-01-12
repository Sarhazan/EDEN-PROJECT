import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import DataControls from './components/layout/DataControls';
import Modal from './components/shared/Modal';
import TaskForm from './components/forms/TaskForm';
import SystemForm from './components/forms/SystemForm';
import SupplierForm from './components/forms/SupplierForm';
import EmployeeForm from './components/forms/EmployeeForm';
import LocationForm from './components/forms/LocationForm';
import MyDayPage from './pages/MyDayPage';
import AllTasksPage from './pages/AllTasksPage';
import SystemsPage from './pages/SystemsPage';
import SuppliersPage from './pages/SuppliersPage';
import EmployeesPage from './pages/EmployeesPage';
import LocationsPage from './pages/LocationsPage';
import SettingsPage from './pages/SettingsPage';
import { FaPlus } from 'react-icons/fa';

function MainContent() {
  const { isTaskModalOpen, setIsTaskModalOpen, editingTask, setEditingTask } = useApp();
  const location = useLocation();

  // State for entity modals
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleCloseSystemModal = () => {
    setIsSystemModalOpen(false);
  };

  const handleCloseSupplierModal = () => {
    setIsSupplierModalOpen(false);
  };

  const handleCloseEmployeeModal = () => {
    setIsEmployeeModalOpen(false);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
  };

  // Determine floating button action based on current route
  const getFloatingButtonConfig = () => {
    const path = location.pathname;

    if (path === '/' || path === '/tasks') {
      return {
        show: true,
        label: 'הוסף משימה',
        onClick: () => setIsTaskModalOpen(true)
      };
    }

    if (path === '/systems') {
      return {
        show: true,
        label: 'הוסף מערכת',
        onClick: () => setIsSystemModalOpen(true)
      };
    }

    if (path === '/suppliers') {
      return {
        show: true,
        label: 'הוסף ספק',
        onClick: () => setIsSupplierModalOpen(true)
      };
    }

    if (path === '/employees') {
      return {
        show: true,
        label: 'הוסף עובד',
        onClick: () => setIsEmployeeModalOpen(true)
      };
    }

    if (path === '/locations') {
      return {
        show: true,
        label: 'הוסף מיקום',
        onClick: () => setIsLocationModalOpen(true)
      };
    }

    return { show: false };
  };

  const buttonConfig = getFloatingButtonConfig();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DataControls />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<MyDayPage />} />
          <Route path="/tasks" element={<AllTasksPage />} />
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Floating Add Button */}
      {buttonConfig.show && (
        <button
          onClick={buttonConfig.onClick}
          className="fixed top-1/2 -translate-y-1/2 right-6 bg-primary hover:bg-orange-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group z-50"
          title={buttonConfig.label}
        >
          <FaPlus className="text-2xl" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            {buttonConfig.label}
          </span>
        </button>
      )}

      {/* Global Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        title={editingTask ? 'ערוך משימה' : 'משימה חדשה'}
      >
        <TaskForm task={editingTask} onClose={handleCloseTaskModal} />
      </Modal>

      {/* System Modal */}
      <Modal
        isOpen={isSystemModalOpen}
        onClose={handleCloseSystemModal}
        title="מערכת חדשה"
      >
        <SystemForm system={null} onClose={handleCloseSystemModal} />
      </Modal>

      {/* Supplier Modal */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={handleCloseSupplierModal}
        title="ספק חדש"
      >
        <SupplierForm supplier={null} onClose={handleCloseSupplierModal} />
      </Modal>

      {/* Employee Modal */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={handleCloseEmployeeModal}
        title="עובד חדש"
      >
        <EmployeeForm employee={null} onClose={handleCloseEmployeeModal} />
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={handleCloseLocationModal}
        title="מיקום חדש"
      >
        <LocationForm onClose={handleCloseLocationModal} />
      </Modal>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <MainContent />
      </Router>
    </AppProvider>
  );
}

export default App;
