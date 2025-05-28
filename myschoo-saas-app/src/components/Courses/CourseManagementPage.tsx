import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import HelpTooltip from '../common/HelpTooltip';

const courseManagementNavItems = [
  { path: 'subjects', label: 'Manage Subjects', helpKey: 'subjects_intro' },
  { path: 'courses', label: 'Manage Courses', helpKey: 'courses_intro' },
  { path: 'periods', label: 'Manage Classes/Sections', helpKey: 'coursePeriods_intro' },
];

const CourseManagementPage: React.FC = () => {
  const location = useLocation();
  // Determine the active sub-page based on the current route
  // e.g., if path is /course-management/subjects, currentSubPath will be 'subjects'
  // Default to 'subjects' if no sub-path or an unrecognized one.
  const pathSegments = location.pathname.split('/');
  const currentSubPath = pathSegments[pathSegments.length -1] !== 'course-management' ? pathSegments[pathSegments.length - 1] : 'subjects';


  const NavLink: React.FC<{ to: string; label: string; isActive: boolean }> = ({ to, label, isActive }) => (
    <Link
      to={to} // Relative path for nested routes
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Course Management</h1>
          <HelpTooltip helpKey="courseManagement_intro" position="right" className="ml-2" />
        </div>
      </div>

      <div className="mb-6 bg-white shadow-sm rounded-lg p-2 md:p-3">
        <nav className="flex flex-wrap items-center gap-2 md:gap-3" aria-label="Course Management Navigation">
          {courseManagementNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path} // Relative path
              label={item.label}
              isActive={currentSubPath === item.path}
            />
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-0 md:p-2">
        <Outlet /> {/* Nested route components will render here */}
      </div>
    </div>
  );
};

export default CourseManagementPage;
