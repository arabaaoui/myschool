import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

// Page Imports
import AuthPage from './components/AuthPage';
import StudentsPage from './components/Students/StudentsPage';
import CourseManagementPage from './components/Courses/CourseManagementPage';
import SettingsPage from './components/Settings/SettingsPage';
import StaffPage from './components/Staff/StaffPage';
import EnrollmentsPage from './components/Enrollments/EnrollmentsPage';
import TakeAttendancePage from './components/Attendance/TakeAttendancePage';
import AssignmentsPage from './components/Grades/Assignments/AssignmentsPage';
import GradebookPage from './components/Grades/Gradebook/GradebookPage';
import PortalDashboard from './components/Portal/PortalDashboard';
import DisciplinePage from './components/Discipline/DisciplinePage';
import BillingPage from './components/Billing/BillingPage';
import CourseCommentsPage from './components/Grades/CourseComments/CourseCommentsPage';
import ViewAnnouncementsPage from './components/Communications/Announcements/ViewAnnouncements/ViewAnnouncementsPage';
import MessagingPage from './components/Communications/Messaging/MessagingPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFoundPage from './components/common/NotFoundPage';

// Report related pages
import ReportsLandingPage from './components/Reports/ReportsLandingPage';
import StudentProgressReportPage from './components/Reports/StudentProgressReportPage';
import AttendanceSummaryReportPage from './components/Reports/AttendanceSummaryReportPage';
import ReportCardsPage from './components/Reports/ReportCards/ReportCardsPage';

// Settings Sub-Pages (for routing)
import AcademicYearsPage from './components/Settings/AcademicYears/AcademicYearsPage';
import MarkingPeriodsPage from './components/Settings/MarkingPeriods/MarkingPeriodsPage';
import AttendanceCodesPage from './components/Settings/AttendanceCodes/AttendanceCodesPage';
import AssignmentTypesPage from './components/Settings/AssignmentTypes/AssignmentTypesPage';
import DisciplineIncidentTypesPage from './components/Settings/DisciplineIncidentTypes/IncidentTypesPage';
import FeeTypesPage from './components/Settings/FeeTypes/FeeTypesPage';
import ParentStudentLinksPage from './components/Settings/ParentStudentLinks/ParentStudentLinksPage';
import ManageAnnouncementsPage from './components/Communications/Announcements/ManageAnnouncements/ManageAnnouncementsPage';

// Course Management Sub-Pages (for routing)
import SubjectsPage from './components/Courses/Subjects/SubjectsPage';
import CoursesPage from './components/Courses/Courses/CoursesPage';
import CoursePeriodsPage from './components/Courses/CoursePeriods/CoursePeriodsPage';


import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from './types';
import HelpTooltip from './components/common/HelpTooltip';
import AnnouncementsDisplay from './components/Communications/Announcements/ViewAnnouncements/AnnouncementsDisplay';

// Toast Context
interface ToastContextType {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  showInfoToast: (message: string) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};
const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSuccessToast = (message: string) => toast.success(message);
  const showErrorToast = (message: string) => toast.error(message);
  const showInfoToast = (message: string) => toast(message);

  return (
    <ToastContext.Provider value={{ showSuccessToast, showErrorToast, showInfoToast }}>
      {children}
    </ToastContext.Provider>
  );
};


interface LinkedStudent {
  id: string;
  name: string;
}
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  logout: () => Promise<void>;
  isTenantAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  isStaff: boolean;
  linkedStudents: LinkedStudent[] | null;
  currentStudentId: string | null;
  setCurrentStudentId: React.Dispatch<React.SetStateAction<string | null>>;
  refreshUserProfile: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[] | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);


  const fetchUserProfileAndRoles = async (currentUser: User | null) => {
    if (currentUser) {
      const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

      if (profileError) console.error("Error fetching user profile:", profileError.message);
      setProfile(userProfile as UserProfile | null);

      const userRole = userProfile?.role || currentUser.app_metadata?.role;
      setIsTenantAdmin(userRole === 'admin');
      setIsTeacher(userRole === 'teacher');
      setIsStudent(userRole === 'student');
      setIsParent(userRole === 'parent');
      setIsStaff(userRole === 'admin' || userRole === 'teacher' || userRole === 'support_staff');


      if (userRole === 'student') {
          const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('id')
              .eq('user_profile_id', currentUser.id)
              .single();
          if (studentError && studentError.code !== 'PGRST116') {
            console.error("Error fetching student record for student user:", studentError.message);
          }
          if (studentData) setCurrentStudentId(studentData.id);
          else setCurrentStudentId(null);
          setLinkedStudents(null);
      } else if (userRole === 'parent') {
          const { data: linksData, error: linksError } = await supabase
              .from('parent_student_links')
              .select('students (id, first_name, last_name)')
              .eq('parent_user_id', currentUser.id);
          if (linksError) console.error("Error fetching linked students for parent:", linksError.message);
          const students = linksData?.map((link: any) => ({
              id: link.students.id,
              name: `${link.students.first_name} ${link.students.last_name}`
          })) || [];
          setLinkedStudents(students);
          if (students.length > 0 && (!currentStudentId || !students.find(s => s.id === currentStudentId))) {
              setCurrentStudentId(students[0].id);
          } else if (students.length === 0) {
            setCurrentStudentId(null);
          }
      } else {
        setLinkedStudents(null);
      }
    } else {
      setIsTenantAdmin(false);
      setIsTeacher(false);
      setIsStudent(false);
      setIsParent(false);
      setIsStaff(false);
      setProfile(null);
      setLinkedStudents(null);
      setCurrentStudentId(null);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      setLoadingAuth(true);
      await fetchUserProfileAndRoles(user);
      setLoadingAuth(false);
    }
  };


  useEffect(() => {
    const getInitialSession = async () => {
      setLoadingAuth(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await fetchUserProfileAndRoles(currentUser);
      setLoadingAuth(false);
    };
    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setLoadingAuth(true);
        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);
        await fetchUserProfileAndRoles(currentUser);
        setLoadingAuth(false);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session, user, profile, logout,
    isTenantAdmin, isTeacher, isStudent, isParent, isStaff,
    linkedStudents, currentStudentId, setCurrentStudentId,
    refreshUserProfile,
    loading: loadingAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// AppContent component, now primarily for handling activation prompt and rendering <Outlet />
// This component will be rendered inside MainLayout if activation logic is needed.
const AppContent: React.FC = () => {
  const { user, profile, loading, refreshUserProfile } = useAuth();
  const [showActivationPrompt, setShowActivationPrompt] = useState(false);
  const [activationFullName, setActivationFullName] = useState('');
  const toasts = useToasts();

  useEffect(() => {
    if (profile) {
        setActivationFullName(profile.full_name || '');
        if (!profile.is_active && profile.role && !['pending', 'student', 'parent'].includes(profile.role) ) {
            setShowActivationPrompt(true);
        } else {
            setShowActivationPrompt(false);
        }
    } else if (!loading) {
        setShowActivationPrompt(false);
    }
  }, [profile, loading]);

  const handleActivateAccount = async () => {
    if (!user || !profile) return;
    try {
        const updates: Partial<UserProfile> = { is_active: true };
        if (activationFullName.trim() && activationFullName.trim() !== profile.full_name) {
            updates.full_name = activationFullName.trim();
        }
        const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', user.id);
        if (error) throw error;

        await refreshUserProfile();
        setShowActivationPrompt(false);
        toasts.showSuccessToast("Account activated successfully!");
    } catch (err:any) {
        console.error("Error activating account:", err);
        toasts.showErrorToast("Failed to activate account: " + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Initializing application content...</p></div>;
  }

  if (showActivationPrompt) {
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Welcome to MySchoo!</h2>
                <p className="text-gray-600 mb-4">Please complete your profile to activate your account.</p>
                <div>
                    <label htmlFor="activation_full_name" className="block text-sm font-medium text-gray-700">
                        Full Name
                        <HelpTooltip helpKey="userActivation_fullName" />
                    </label>
                    <input
                        type="text"
                        id="activation_full_name"
                        value={activationFullName}
                        onChange={(e) => setActivationFullName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter your full name"
                    />
                </div>
                <button
                    onClick={handleActivateAccount}
                    className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    Activate My Account
                    <HelpTooltip helpKey="userActivation_activateButton" />
                </button>
            </div>
        </div>
    );
  }

  return <Outlet />; // Renders the actual page components
};


// Main Layout Component that includes Navbar and Outlet for content
const MainLayout: React.FC = () => {
  const { logout, isTenantAdmin, isTeacher, isStudent, isParent, isStaff, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading application data...</p></div>;
  }

  let defaultPath = "/dashboard";
  if (isStudent || isParent) defaultPath = "/portal";

  if (!profile && !loading) {
      return <div className="flex justify-center items-center min-h-screen"><p>Verifying user profile...</p> <button onClick={logout} className="ml-4 p-2 bg-red-500 text-white rounded">Logout</button></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4 shadow-md print:hidden">
        <div className="container mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <Link to={defaultPath} className="text-xl font-bold mb-2 sm:mb-0">MySchoo SaaS</Link>
          <div className="flex flex-wrap items-center -mx-1">
            {(isTeacher || isTenantAdmin || isStaff) && !isStudent && !isParent && (
                <Link to="/dashboard" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/dashboard') ? 'bg-indigo-800' : ''}`}>Dashboard</Link>
            )}
            {(isStudent || isParent) && (
                 <Link to="/portal" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/portal') ? 'bg-indigo-800' : ''}`}>Portal</Link>
            )}
            <Link to="/announcements" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/announcements') ? 'bg-indigo-800' : ''}`}>Announcements</Link>
            <Link to="/messages" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/messages') ? 'bg-indigo-800' : ''}`}>Messages</Link>

            {(isTeacher || isTenantAdmin) && (
                <>
                    <Link to="/students" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/students') ? 'bg-indigo-800' : ''}`}>Students</Link>
                    <Link to="/course-management" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/course-management') ? 'bg-indigo-800' : ''}`}>Courses</Link>
                    <Link to="/take-attendance" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/take-attendance') ? 'bg-indigo-800' : ''}`}>Attendance</Link>
                    <Link to="/assignments" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/assignments') ? 'bg-indigo-800' : ''}`}>Assignments</Link>
                    <Link to="/gradebook" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/gradebook') ? 'bg-indigo-800' : ''}`}>Gradebook</Link>
                    <Link to="/course-comments" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/course-comments') ? 'bg-indigo-800' : ''}`}>Comments</Link>
                    <Link to="/reports" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/reports') ? 'bg-indigo-800' : ''}`}>Reports</Link>
                </>
            )}
             {(isStaff || isTenantAdmin) && (
                <Link to="/discipline" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/discipline') ? 'bg-indigo-800' : ''}`}>Discipline</Link>
            )}
            {isTenantAdmin && (
              <>
                <Link to="/enrollments" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/enrollments') ? 'bg-indigo-800' : ''}`}>Enrollments</Link>
                <Link to="/billing" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/billing') ? 'bg-indigo-800' : ''}`}>Billing</Link>
                <Link to="/staff" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/staff') ? 'bg-indigo-800' : ''}`}>Staff</Link>
                <Link to="/settings" className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 mx-1 ${location.pathname.startsWith('/settings') ? 'bg-indigo-800' : ''}`}>Settings</Link>
              </>
            )}
            <button onClick={logout} className="ml-auto sm:ml-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium bg-red-500 hover:bg-red-600 mx-1">Logout</button>
          </div>
        </div>
      </nav>
      <main>
        <Outlet /> {/* Changed from <AppContent /> to <Outlet /> */}
      </main>
    </div>
  );
};


// Helper to redirect from index based on role after login
const NavigateToDashboardOrPortal: React.FC = () => {
  const { isStudent, isParent, isStaff, isTenantAdmin, isTeacher, loading } = useAuth();
  if (loading) return null;

  if (isStudent || isParent) return <Navigate to="/portal" replace />;
  if (isStaff || isTeacher || isTenantAdmin) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/auth" replace />;
};


const DashboardContent: React.FC = () => {
  const { user, profile } = useAuth();
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to MySchoo!</h1>
        <p className="text-gray-600 mt-2">You are logged in as: {user?.email} (Role: {profile?.role})</p>
        {profile?.tenant_id && (
          <p className="text-sm text-gray-500">Tenant ID: {profile.tenant_id}</p>
        )}
        <p className="mt-4 text-lg mb-6">This is your main dashboard. Use the navigation above to go to different modules.</p>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Recent Announcements</h2>
        <AnnouncementsDisplay limit={3} />
      </div>
    </div>
  );
};

const SettingsPageWithRoutes: React.FC = () => (
    <Routes>
        <Route path="/" element={<SettingsPage />}>
            <Route index element={<Navigate to="academic-years" replace />} />
            <Route path="academic-years" element={<AcademicYearsPage />} />
            <Route path="marking-periods" element={<MarkingPeriodsPage />} />
            <Route path="attendance-codes" element={<AttendanceCodesPage />} />
            <Route path="assignment-types" element={<AssignmentTypesPage />} />
            <Route path="discipline-incident-types" element={<DisciplineIncidentTypesPage />} />
            <Route path="fee-types" element={<FeeTypesPage />} />
            <Route path="parent-student-links" element={<ParentStudentLinksPage />} />
            <Route path="manage-announcements" element={<ManageAnnouncementsPage />} />
        </Route>
    </Routes>
);

const CourseManagementPageWithRoutes: React.FC = () => (
    <Routes>
        <Route path="/" element={<CourseManagementPage />}>
            <Route index element={<Navigate to="subjects" replace />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="periods" element={<CoursePeriodsPage />} />
        </Route>
    </Routes>
);

const ReportsRouter: React.FC = () => (
    <Routes>
        <Route index element={<ReportsLandingPage />} />
        <Route path="student-progress" element={<StudentProgressReportPage />} />
        <Route path="attendance-summary" element={<AttendanceSummaryReportPage />} />
        <Route path="report-cards" element={<ReportCardsPage />} />
    </Routes>
);


// This is now the main exported App component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} >
                 {/* AppContent now acts as a layout for pages needing activation check, it renders its own Outlet */}
                <Route element={<AppContent />}>
                    <Route index element={<NavigateToDashboardOrPortal />} />

                    <Route path="dashboard" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'support_staff']}><DashboardContent /></ProtectedRoute>} />
                    <Route path="announcements" element={<ViewAnnouncementsPage />} />
                    <Route path="messages" element={<MessagingPage />} />

                    <Route path="students" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><StudentsPage /></ProtectedRoute>} />
                    <Route path="course-management/*" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><CourseManagementPageWithRoutes /></ProtectedRoute>} />
                    <Route path="take-attendance" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><TakeAttendancePage /></ProtectedRoute>} />
                    <Route path="assignments" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><AssignmentsPage /></ProtectedRoute>} />
                    <Route path="gradebook" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><GradebookPage /></ProtectedRoute>} />
                    <Route path="course-comments" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><CourseCommentsPage /></ProtectedRoute>} />
                    <Route path="reports/*" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><ReportsRouter /></ProtectedRoute>} />
                    <Route path="discipline" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'support_staff']}><DisciplinePage /></ProtectedRoute>} />

                    <Route path="enrollments" element={<ProtectedRoute allowedRoles={['admin']}><EnrollmentsPage /></ProtectedRoute>} />
                    <Route path="billing" element={<ProtectedRoute allowedRoles={['admin']}><BillingPage /></ProtectedRoute>} />
                    <Route path="staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffPage /></ProtectedRoute>} />
                    <Route path="settings/*" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPageWithRoutes /></ProtectedRoute>} />

                    <Route path="portal/*" element={<ProtectedRoute allowedRoles={['student', 'parent']}><PortalDashboard /></ProtectedRoute>} />
                    {/* This catch-all is for routes under MainLayout/AppContent */}
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Route>
            {/* This is the top-level catch-all */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
