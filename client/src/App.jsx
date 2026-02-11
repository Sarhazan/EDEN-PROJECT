import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MobileDrawer from './components/layout/MobileDrawer';
import HamburgerButton from './components/layout/HamburgerButton';
import Modal from './components/shared/Modal';
import QuickTaskModal from './components/forms/QuickTaskModal';
import TaskForm from './components/forms/TaskForm';
import SystemForm from './components/forms/SystemForm';
import SupplierForm from './components/forms/SupplierForm';
import EmployeeForm from './components/forms/EmployeeForm';
import LocationForm from './components/forms/LocationForm';
import BuildingForm from './components/forms/BuildingForm';
import LoginPage from './pages/LoginPage';
import MyDayPage from './pages/MyDayPage';
import AllTasksPage from './pages/AllTasksPage';
import HistoryPage from './pages/HistoryPage';
import SystemsPage from './pages/SystemsPage';
import SuppliersPage from './pages/SuppliersPage';
import EmployeesPage from './pages/EmployeesPage';
import LocationsPage from './pages/LocationsPage';
import BuildingsPage from './pages/BuildingsPage';
import SettingsPage from './pages/SettingsPage';
import TaskConfirmationPage from './pages/TaskConfirmationPage';
import HQDashboardPage from './pages/HQDashboardPage';
import { FaHome, FaTasks, FaHistory, FaCog, FaTruck, FaUsers, FaMapMarkerAlt, FaBuilding, FaWrench, FaPlus, FaChartLine } from 'react-icons/fa';
import { useMediaQuery } from './hooks/useMediaQuery';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MainContent() {
  const { isTaskModalOpen, setIsTaskModalOpen, editingTask, setEditingTask, isAuthenticated, login } = useApp();
  const location = useLocation();

  // State for entity modals
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);

  // Mobile drawer state and breakpoint detection
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Navigation items for mobile drawer
  const navItems = [
    { path: '/', icon: FaHome, label: 'היום שלי' },
    { path: '/tasks', icon: FaTasks, label: 'משימות' },
    { path: '/history', icon: FaHistory, label: 'היסטוריה' },
    { path: '/hq-dashboard', icon: FaChartLine, label: 'דשבורד HQ' },
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/buildings', icon: FaBuilding, label: 'מבנים' },
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

  const handleCloseBuildingModal = () => {
    setIsBuildingModalOpen(false);
  };

  // Check if we're on the confirmation page (public route)
  const isPublicRoute = location.pathname.startsWith('/confirm/');

  // Show login page if not authenticated and not on public route
  if (!isAuthenticated && !isPublicRoute) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!isPublicRoute && isDesktop && (
        <Sidebar
          className="hidden lg:block"
          onAddTask={() => setIsTaskModalOpen(true)}
          onAddSystem={() => setIsSystemModalOpen(true)}
          onAddSupplier={() => setIsSupplierModalOpen(true)}
          onAddEmployee={() => setIsEmployeeModalOpen(true)}
          onAddLocation={() => setIsLocationModalOpen(true)}
          onAddBuilding={() => setIsBuildingModalOpen(true)}
        />
      )}

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

      {/* Mobile FAB - Add Task */}
      {!isPublicRoute && isMobile && (
        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="fixed bottom-6 left-6 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95 transition-transform duration-150 lg:hidden"
          aria-label="משימה חדשה"
        >
          <FaPlus className="text-xl" />
        </button>
      )}

      <main className={isPublicRoute ? 'flex-1' : (isDesktop ? 'mr-72 flex-1' : 'flex-1 w-full overflow-x-hidden')}>
        <Routes>
          <Route path="/" element={<MyDayPage />} />
          <Route path="/tasks" element={<AllTasksPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/hq-dashboard" element={<HQDashboardPage />} />
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/buildings" element={<BuildingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/confirm/:token" element={<TaskConfirmationPage />} />
        </Routes>
      </main>

      {/* Quick Task Modal (new tasks) */}
      {isTaskModalOpen && !editingTask && (
        <QuickTaskModal isOpen={true} onClose={handleCloseTaskModal} />
      )}

      {/* Edit Task Modal (existing tasks) */}
      {isTaskModalOpen && editingTask && (
        <Modal
          isOpen={true}
          onClose={handleCloseTaskModal}
          title="ערוך משימה"
        >
          <TaskForm task={editingTask} onClose={handleCloseTaskModal} />
        </Modal>
      )}

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

      {/* Building Modal */}
      <Modal
        isOpen={isBuildingModalOpen}
        onClose={handleCloseBuildingModal}
        title="מבנה חדש"
      >
        <BuildingForm building={null} onClose={handleCloseBuildingModal} />
      </Modal>

      {/* Toast Container */}
      <ToastContainer
        position="bottom-center"
        autoClose={2000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="light"
      />
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
