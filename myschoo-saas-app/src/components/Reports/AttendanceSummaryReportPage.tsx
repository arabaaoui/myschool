import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Student } from '../Students/StudentForm';
import { CoursePeriod } from '../Courses/CoursePeriods/CoursePeriodForm';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

interface AttendanceSummaryData {
  student_first_name: string;
  student_last_name: string;
  course_period_name: string;
  attendance_date: string;
  attendance_code: string;
  attendance_description: string;
  // Add other fields from the view as needed
}

const AttendanceSummaryReportPage: React.FC = () => {
  const { user, isTeacher, isTenantAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [coursePeriods, setCoursePeriods] = useState<CoursePeriod[]>([]); // Assuming CoursePeriod has id and name

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [reportData, setReportData] = useState<AttendanceSummaryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch students and course periods for dropdowns
  useEffect(() => {
    const fetchFiltersData = async () => {
      setLoading(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        // Fetch course periods (teachers might see only their own, admins all)
        let cpQuery = supabase.from('course_periods').select('id, name, courses(name)');
        if (isTeacher && !isTenantAdmin && user?.id) {
            cpQuery = cpQuery.eq('teacher_id', user.id);
        }
        cpQuery = cpQuery.order('name', { ascending: true });
        const { data: cpData, error: cpError } = await cpQuery;
        if (cpError) throw cpError;
        setCoursePeriods(cpData || []);

      } catch (err: any) {
        setError('Failed to load filter data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (isTeacher || isTenantAdmin) {
        fetchFiltersData();
    }
  }, [isTeacher, isTenantAdmin, user?.id]);

  const handleGenerateReport = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Please select a start and end date for the report.');
      setReportData([]);
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      setReportData([]);
      return;
    }

    setLoading(true);
    setError(null);
    setReportData([]);

    try {
      let query = supabase.from('attendance_summary_report_view').select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (selectedStudentId) {
        query = query.eq('student_id', selectedStudentId);
      }
      if (selectedCoursePeriodId) {
        query = query.eq('course_period_id', selectedCoursePeriodId);
      }
      query = query.order('attendance_date', { ascending: false }).order('student_last_name').order('student_first_name');

      const { data, error: reportError } = await query;
      if (reportError) throw reportError;
      setReportData(data || []);
      if (data?.length === 0) {
        setError('No attendance data found for the selected criteria.');
      }
    } catch (err: any) {
      console.error('Error generating attendance summary report:', err);
      setError('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, selectedCoursePeriodId, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to view reports.</p>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Attendance Summary Report</h2>
          <HelpTooltip helpKey="report_attendanceSummary_intro" position="right" className="ml-2" />
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Student Filter */}
          <div>
            <label htmlFor="student_filter_att" className="flex items-center text-sm font-medium text-gray-700">
              Student (Optional) <HelpTooltip helpKey="report_attendanceSummary_selectStudent" />
            </label>
            <select
              id="student_filter_att"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- All Students --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          </div>
          {/* Course Period Filter */}
          <div>
            <label htmlFor="cp_filter_att" className="flex items-center text-sm font-medium text-gray-700">
              Class (Optional) <HelpTooltip helpKey="report_attendanceSummary_selectClass" />
            </label>
            <select
              id="cp_filter_att"
              value={selectedCoursePeriodId}
              onChange={(e) => setSelectedCoursePeriodId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- All Classes --</option>
              {coursePeriods.map(cp => <option key={cp.id} value={cp.id}>{(cp as any).courses?.name} - {cp.name}</option>)}
            </select>
          </div>
          {/* Date Range Filters */}
          <div>
            <label htmlFor="start_date_att" className="flex items-center text-sm font-medium text-gray-700">
              Start Date <span className="text-red-500 ml-1">*</span> <HelpTooltip helpKey="report_attendanceSummary_dateRange" />
            </label>
            <input type="date" id="start_date_att" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="end_date_att" className="flex items-center text-sm font-medium text-gray-700">
              End Date <span className="text-red-500 ml-1">*</span> <HelpTooltip helpKey="report_attendanceSummary_dateRange" />
            </label>
            <input type="date" id="end_date_att" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading || !startDate || !endDate}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Generate <HelpTooltip helpKey="report_attendanceSummary_generateButton" />
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-4">Loading report data...</p>}
      {error && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}

      {reportData.length > 0 && (
        <div id="attendanceReportContent" className="bg-white p-6 shadow-lg rounded-lg">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-2xl font-bold text-gray-800">Attendance Summary</h3>
            <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 print:hidden">
                Print Report <HelpTooltip helpKey="report_attendanceSummary_printButton" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.student_first_name} {item.student_last_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.course_period_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(item.attendance_date + 'T00:00:00').toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.attendance_code}</td>
                    <td className="px-4 py-2 whitespace-normal break-words text-sm text-gray-500">{item.attendance_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummaryReportPage;
