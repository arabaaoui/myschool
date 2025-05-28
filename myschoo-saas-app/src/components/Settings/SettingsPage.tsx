import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom'; // Import Link and Outlet
import HelpTooltip from '../common/HelpTooltip';
// Sub-page components are now rendered via <Outlet /> based on nested routes
// No need to import them directly here for rendering, but they will be defined in App.tsx routes

const settingsNavItems = [
  { path: 'academic-years', label: 'Academic Years', helpKey: 'academicYears_intro' },
  { path: 'marking-periods', label: 'Marking Periods', helpKey: 'markingPeriods_intro' },
  { path: 'attendance-codes', label: 'Attendance Codes', helpKey: 'attendanceCodes_intro' },
  { path: 'assignment-types', label: 'Assignment Types', helpKey: 'assignmentTypes_intro' },
  { path: 'discipline-incident-types', label: 'Discipline Types', helpKey: 'disciplineIncidentTypes_intro' },
  { path: 'fee-types', label: 'Fee Types', helpKey: 'feeTypes_intro' },
  { path: 'parent-student-links', label: 'Parent/Student Links', helpKey: 'parentStudentLinks_intro' },
  { path: 'manage-announcements', label: 'Manage Announcements', helpKey: 'announcements_manage_intro' },
  // { path: 'general', label: 'General Settings', helpKey: 'general_settings_intro' }, // Example for future
];

const SettingsPage: React.FC = () => {
  const location = useLocation();

  // Determine the active sub-page based on the current route
  const currentSubPath = location.pathname.split('/settings/')[1] || 'academic-years';


  const NavLink: React.FC<{ to: string; label: string; isActive: boolean }> = ({ to, label, isActive }) => (
    <Link
      to={to}
      className={`px-3 py-2 md:px-4 text-sm md:text-base rounded-md font-medium transition-colors
        ${isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
        }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">School Settings</h1>
          <HelpTooltip helpKey="settings_intro" position="right" className="ml-2" />
        </div>
      </div>

      <div className="mb-6 bg-white shadow-sm rounded-lg p-2 md:p-3">
        <nav className="flex flex-wrap items-center gap-2 md:gap-3" aria-label="Settings Navigation">
          {settingsNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path} // Relative path for nested routes
              label={item.label}
              isActive={currentSubPath === item.path}
            />
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-0 md:p-2">
        <Outlet /> {/* This is where nested route components will render */}
      </div>
    </div>
  );
};

export default SettingsPage;
