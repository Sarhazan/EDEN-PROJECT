import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import HQSidebar from './components/layout/HQSidebar';
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
import HQLoginPage from './pages/HQLoginPage';
import HQPlaceholderPage from './pages/HQPlaceholderPage';
import HQDispatchPage from './pages/HQDispatchPage';
import HQListsPage from './pages/HQListsPage';
import HQReportsPage from './pages/HQReportsPage';
import HQFormsPage from './pages/HQFormsPage';
import SiteFormsPage from './pages/SiteFormsPage';
import { FaHome, FaTasks, FaHistory, FaCog, FaTruck, FaUsers, FaMapMarkerAlt, FaBuilding, FaWrench, FaPlus, FaFileAlt } from 'react-icons/fa';
import { useMediaQuery } from './hooks/useMediaQuery';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MainContent() {
  const { isTaskModalOpen, setIsTaskModalOpen, editingTask, setEditingTask, isAuthenticated, authRole, login } = useApp();
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
    { path: '/systems', icon: FaCog, label: 'מערכות' },
    { path: '/suppliers', icon: FaTruck, label: 'ספקים' },
    { path: '/employees', icon: FaUsers, label: 'עובדים' },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'מיקומים' },
    { path: '/buildings', icon: FaBuilding, label: 'מבנים' },
    { path: '/forms', icon: FaFileAlt, label: 'טפסים' },
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

  // Route modes
  const isPublicRoute = location.pathname.startsWith('/confirm/');
  const isHQRoute = location.pathname.startsWith('/hq');

  // HQ portal auth gate (separate login/session role)
  if (isHQRoute) {
    if (location.pathname === '/hq/login') {
      return authRole === 'hq'
        ? <Navigate to="/hq/dashboard" replace />
        : <HQLoginPage onLogin={login} />;
    }

    if (!isAuthenticated || authRole !== 'hq') {
      return <Navigate to="/hq/login" replace />;
    }
  }

  // Main portal auth gate
  if (!isHQRoute && !isAuthenticated && !isPublicRoute) {
    return <LoginPage onLogin={login} />;
  }

  // If HQ user lands on main portal, redirect to HQ
  if (!isHQRoute && authRole === 'hq' && !isPublicRoute) {
    return <Navigate to="/hq/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!isPublicRoute && !isHQRoute && isDesktop && (
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

      {!isPublicRoute && isHQRoute && isDesktop && <HQSidebar />}

      {/* Mobile Hamburger Button */}
      {!isPublicRoute && !isHQRoute && isMobile && (
        <HamburgerButton
          onClick={() => setDrawerOpen(true)}
          className="fixed top-4 right-4 z-30 lg:hidden"
        />
      )}

      {/* Mobile Drawer */}
      {!isPublicRoute && !isHQRoute && (
        <MobileDrawer
          isOpen={drawerOpen && isMobile}
          onClose={() => setDrawerOpen(false)}
          navItems={navItems}
        />
      )}

      {/* Mobile FAB - Add Task */}
      {!isPublicRoute && !isHQRoute && isMobile && (
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
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/buildings" element={<BuildingsPage />} />
          <Route path="/forms" element={<SiteFormsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/confirm/:token" element={<TaskConfirmationPage />} />

          {/* HQ portal routes */}
          <Route path="/hq/dashboard" element={<HQDashboardPage />} />
          <Route path="/hq/managers" element={<HQPlaceholderPage title="מנהלי אזור/מתחמים" />} />
          <Route path="/hq/dispatch" element={<HQDispatchPage />} />
          <Route path="/hq/lists" element={<HQListsPage />} />
          <Route path="/hq/reports" element={<HQReportsPage />} />
          <Route path="/hq/forms" element={<HQFormsPage />} />
          <Route path="/hq/settings" element={<HQPlaceholderPage title="הגדרות HQ" />} />
          <Route path="/hq/login" element={<HQLoginPage onLogin={login} />} />
          <Route path="/hq/*" element={<Navigate to="/hq/dashboard" replace />} />
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
