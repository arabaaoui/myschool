import React from 'react';
import HelpTooltip from '../../common/HelpTooltip';

// This interface should match the columns from report_card_data_view
export interface ReportCardData {
  student_id: string;
  student_name: string;
  student_identifier?: string | null;
  marking_period_name: string;
  marking_period_start_date: string;
  marking_period_end_date: string;
  academic_year_name: string;
  course_period_id: string;
  course_name: string;
  course_period_name: string; // Section name
  teacher_name?: string | null;
  course_overall_percentage?: number | null;
  course_letter_grade?: string | null; // Placeholder
  course_comment?: string | null;
  course_total_absences?: number | null;
  course_total_tardies?: number | null;
  grade_level_name?: string | null;
}

interface ReportCardViewProps {
  data: ReportCardData[]; // Array of course entries for the report card
  studentName?: string; // For the header
  markingPeriodName?: string; // For the header
  academicYearName?: string; // For the header
  gradeLevelName?: string; // For the header
}

const ReportCardView: React.FC<ReportCardViewProps> = ({ 
    data, 
    studentName, 
    markingPeriodName,
    academicYearName,
    gradeLevelName
}) => {

  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-6">No data available to generate the report card for the selected criteria.</p>;
  }
  
  // Use details from the first record for overall report card headers, if not passed as props
  const reportStudentName = studentName || data[0]?.student_name;
  const reportMarkingPeriod = markingPeriodName || data[0]?.marking_period_name;
  const reportAcademicYear = academicYearName || data[0]?.academic_year_name;
  const reportGradeLevel = gradeLevelName || data[0]?.grade_level_name;


  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="bg-white p-6 md:p-8 shadow-lg rounded-lg printable-area">
      {/* Report Card Header */}
      <div className="text-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Report Card</h1>
        {/* Assuming school name could come from tenant info or be hardcoded for now */}
        <p className="text-lg text-gray-600">MySchoo Educational Institution</p> 
      </div>

      {/* Student and Period Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-8 text-sm">
        <div><strong>Student:</strong> {reportStudentName || 'N/A'}</div>
        <div><strong>Student ID:</strong> {data[0]?.student_identifier || 'N/A'}</div>
        <div><strong>Grade Level:</strong> {reportGradeLevel || 'N/A'}</div>
        <div><strong>Marking Period:</strong> {reportMarkingPeriod || 'N/A'}</div>
        <div><strong>Academic Year:</strong> {reportAcademicYear || 'N/A'}</div>
        <div><strong>Date Issued:</strong> {formatDate(new Date().toISOString())}</div>
      </div>

      {/* Courses Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Teacher</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade (%)</th>
              {/* <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Letter</th> */}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Absences</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Tardies</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Comment</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.course_period_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-normal break-words text-sm font-medium text-gray-800">
                    {item.course_name} <span className="text-gray-500 text-xs">({item.course_period_name})</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{item.teacher_name || 'N/A'}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-600">
                  {item.course_overall_percentage !== null && item.course_overall_percentage !== undefined 
                    ? `${item.course_overall_percentage.toFixed(1)}%` 
                    : 'N/A'}
                </td>
                {/* <td className="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-600">{item.course_letter_grade || 'N/A'}</td> */}
                <td className="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-600">{item.course_total_absences ?? 0}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap text-sm text-gray-600">{item.course_total_tardies ?? 0}</td>
                <td className="px-4 py-3 whitespace-pre-wrap text-xs text-gray-600 min-w-[200px]">{item.course_comment || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* General Comments / Footer (Optional) */}
      <div className="mt-8 pt-4 border-t">
        <h4 className="text-md font-semibold text-gray-700 mb-2">General Notes:</h4>
        <p className="text-sm text-gray-600 italic">
          This report card reflects the student's performance for the specified marking period. 
          For detailed assignment grades, please refer to the Parent/Student Portal.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact; /* Chrome, Safari */
            color-adjust: exact; /* Firefox */
          }
          .printable-area {
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          table, th, td {
            border-width: 1px !important; /* Ensure borders print */
            border-color: #ccc !important;
          }
          thead {
            background-color: #f3f4f6 !important; /* Light gray for header */
          }
          .print\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportCardView;
