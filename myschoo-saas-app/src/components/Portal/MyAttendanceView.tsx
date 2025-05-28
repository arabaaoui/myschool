import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';

interface AttendanceRecordDisplay {
  attendance_date: string;
  course_period_name: string;
  course_name: string;
  attendance_code: string;
  attendance_description: string;
  attendance_comments?: string | null;
}

interface MyAttendanceViewProps {
  studentId: string;
}

const MyAttendanceView: React.FC<MyAttendanceViewProps> = ({ studentId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordDisplay[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);

    try {
      // Use the attendance_summary_report_view for easier data fetching
      let query = supabase
        .from('attendance_summary_report_view')
        .select('attendance_date, course_period_name, course_name, attendance_code, attendance_description, attendance_comments')
        .eq('student_id', studentId);

      if (startDate) query = query.gte('attendance_date', startDate);
      if (endDate) query = query.lte('attendance_date', endDate);
      
      query = query.order('attendance_date', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAttendanceRecords(data || []);
      if (data?.length === 0) {
        setError('No attendance records found for the selected criteria.');
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance records: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, startDate, endDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);
  
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendance();
  };


  return (
    <div className="p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          My Attendance
          <HelpTooltip helpKey="portal_myAttendance" position="right" className="ml-2" />
        </h2>
      </div>
      
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg shadow print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="att_start_date" className="block text-sm font-medium text-gray-700">Start Date:</label>
            <input type="date" id="att_start_date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="att_end_date" className="block text-sm font-medium text-gray-700">End Date:</label>
            <input type="date" id="att_end_date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            Filter Attendance
          </button>
        </div>
      </form>

      {loading && <p className="text-center text-gray-500 py-4">Loading attendance records...</p>}
      {error && <p className="text-center text-red-500 py-4 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {!loading && !error && attendanceRecords.length === 0 && (
         <p className="text-center text-gray-500 py-6">
            <HelpTooltip helpKey="portal_attendance_noRecords" position="bottom" /> No attendance records found for the selected period.
        </p>
      )}

      {!loading && attendanceRecords.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Class</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{new Date(record.attendance_date + 'T00:00:00').toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-normal break-words text-sm text-gray-500">{record.course_name} - {record.course_period_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span title={record.attendance_description}>{record.attendance_code}</span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 whitespace-normal break-words text-sm text-gray-500">{record.attendance_comments || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyAttendanceView;
