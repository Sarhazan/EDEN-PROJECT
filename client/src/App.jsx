import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MobileDrawer from './components/layout/MobileDrawer';
import HamburgerButton from './components/layout/HamburgerButton';
import DataControls from './components/layout/DataControls';
import Modal from './components/shared/Modal';
import TaskForm from './components/forms/TaskForm';
import SystemForm from './components/forms/SystemForm';
import SupplierForm from './components/forms/SupplierForm';
import EmployeeForm from './components/forms/EmployeeForm';
import LocationForm from './components/forms/LocationForm';
import LoginPage from './pages/LoginPage';
import MyDayPage from './pages/MyDayPage';
import AllTasksPage from './pages/AllTasksPage';
import HistoryPage from './pages/HistoryPage';
import SystemsPage from './pages/SystemsPage';
import SuppliersPage from './pages/SuppliersPage';
import EmployeesPage from './pages/EmployeesPage';
import LocationsPage from './pages/LocationsPage';
import SettingsPage from './pages/SettingsPage';
import TaskConfirmationPage from './pages/TaskConfirmationPage';
import { FaPlus, FaHome, FaTasks, FaHistory, FaCog, FaTruck, FaUsers, FaMapMarkerAlt, FaWrench } from 'react-icons/fa';
import { useMediaQuery } from './hooks/useMediaQuery';

function MainContent() {
  const { isTaskModalOpen, setIsTaskModalOpen, editingTask, setEditingTask, isAuthenticated, login } = useApp();
  const location = useLocation();

  // State for entity modals
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Mobile drawer state and breakpoint detection
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Navigation items for mobile drawer
  const navItems = [
    { path: '/', icon: FaHome, label: 'היום שלי' },
    { path: '/tasks', icon: FaTasks, label: 'משימות' },
    { path: '/history', icon: FaHistory, label: 'היסטוריה' },
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/settings', icon: FaWrench, label: 'הגדרות' }
  ];

  // Auto-close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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

  // Check if we're on the confirmation page (public route)
  const isPublicRoute = location.pathname.startsWith('/confirm/');

  // Show login page if not authenticated and not on public route
  if (!isAuthenticated && !isPublicRoute) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!isPublicRoute && isDesktop && <Sidebar className="hidden lg:block" />}
      {!isPublicRoute && <DataControls />}

      {/* Mobile Hamburger Button */}
      {!isPublicRoute && isMobile && (
        <HamburgerButton
          onClick={() => setDrawerOpen(true)}
          className="fixed top-4 right-4 z-30 lg:hidden"
        />
      )}

      {/* Mobile Drawer */}
      {!isPublicRoute && (
        <MobileDrawer
          isOpen={drawerOpen && isMobile}
          onClose={() => setDrawerOpen(false)}
          navItems={navItems}
        />
      )}

      <main className={isPublicRoute ? 'flex-1' : (isDesktop ? 'mr-72 flex-1' : 'flex-1')}>
        <Routes>
          <Route path="/" element={<MyDayPage />} />
          <Route path="/tasks" element={<AllTasksPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/confirm/:token" element={<TaskConfirmationPage />} />
        </Routes>
      </main>

      {/* Floating Add Button */}
      {!isPublicRoute && buttonConfig.show && (
        <button
          onClick={buttonConfig.onClick}
          className="fixed top-1/2 -translate-y-1/2 right-6 bg-primary hover:bg-indigo-700 text-white rounded-full min-h-[56px] min-w-[56px] shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-90 flex items-center justify-center gap-2 group z-50"
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
