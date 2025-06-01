import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

// Removed onNavigate prop as navigation is now handled by <Link>
// interface ReportsLandingPageProps {
//   onNavigate: (reportView: 'studentProgress' | 'attendanceSummary' | 'reportCards' | 'main') => void;
// }

const ReportsLandingPage: React.FC = () => {
  const { isTeacher, isTenantAdmin } = useAuth();

  const reports = [
    {
      key: 'studentProgress',
      path: 'student-progress', // Path for react-router Link
      title: 'Student Progress Report',
      description: 'View detailed academic progress for individual students, including grades and assignments.',
      helpKey: 'report_studentProgress_intro',
      allowed: isTeacher || isTenantAdmin,
    },
    {
      key: 'attendanceSummary',
      path: 'attendance-summary',
      title: 'Attendance Summary Report',
      description: 'Generate summaries of student attendance for classes, specific students, or date ranges.',
      helpKey: 'report_attendanceSummary_intro',
      allowed: isTeacher || isTenantAdmin,
    },
    {
      key: 'reportCards',
      path: 'report-cards',
      title: 'Generate Report Cards',
      description: 'View and print official report cards for students for a selected marking period.',
      helpKey: 'reportCards_intro',
      allowed: isTeacher || isTenantAdmin,
    }
  ];

  const availableReports = reports.filter(report => report.allowed);

  return (
    <div className="container mx-auto p-4 md:p-6"> {/* Added container for consistent layout */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Available Reports</h1>
          <HelpTooltip helpKey="reports_intro" position="right" className="ml-2" />
        </div>
      </div>

      {availableReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableReports.map((report) => (
            <div
              key={report.key}
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-indigo-700 mb-2">{report.title}</h2>
                <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              </div>
              <Link
                to={report.path} // Use Link for navigation
                className="mt-4 w-full sm:w-auto self-start px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition ease-in-out duration-150"
              >
                View Report
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-10">No reports available for your role at the moment.</p>
      )}
    </div>
  );
};

export default ReportsLandingPage;
