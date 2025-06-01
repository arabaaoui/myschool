import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Student } from '../Students/StudentForm'; // Assuming Student type
import { MarkingPeriod } from '../Settings/MarkingPeriods/MarkingPeriodForm'; // Assuming MarkingPeriod type
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

interface StudentProgressData {
  course_period_name: string;
  teacher_name?: string | null;
  assignment_title: string;
  assignment_due_date?: string | null;
  assignment_max_points: number;
  points_earned?: number | null;
  grade_percentage?: number | null;
  assignment_type_name?: string | null;
  // Add other fields from the view as needed for display
}

const StudentProgressReportPage: React.FC = () => {
  const { user, isTeacher, isTenantAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string>(''); // Optional

  const [reportData, setReportData] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReportStudentName, setGeneratedReportStudentName] = useState<string>('');

  // Fetch students and marking periods for dropdowns
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

        const { data: mpData, error: mpError } = await supabase
          .from('marking_periods')
          .select('id, name')
          .order('start_date', { ascending: false }); // Or by sort_order
        if (mpError) throw mpError;
        setMarkingPeriods(mpData || []);

      } catch (err: any) {
        setError('Failed to load filter data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (isTeacher || isTenantAdmin) {
        fetchFiltersData();
    }
  }, [isTeacher, isTenantAdmin]);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedStudentId) {
      setError('Please select a student.');
      setReportData([]);
      return;
    }
    setLoading(true);
    setError(null);
    setReportData([]);
    const student = students.find(s => s.id === selectedStudentId);
    setGeneratedReportStudentName(student ? `${student.first_name} ${student.last_name}` : '');

    try {
      let query = supabase.from('student_progress_report_view').select('*').eq('student_id', selectedStudentId);
      if (selectedMarkingPeriodId) {
        query = query.eq('marking_period_id', selectedMarkingPeriodId);
      }
      query = query.order('course_period_name').order('assignment_due_date', {nullsLast: true});


      const { data, error: reportError } = await query;
      if (reportError) throw reportError;
      setReportData(data || []);
      if (data?.length === 0) {
        setError('No progress data found for the selected criteria.');
      }
    } catch (err: any) {
      console.error('Error generating student progress report:', err);
      setError('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, selectedMarkingPeriodId, students]);

  const handlePrint = () => {
    window.print();
  };

  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to view reports.</p>;
  }

  // Group data by course_period_name for rendering
  const groupedReportData = reportData.reduce((acc, item) => {
    const courseKey = item.course_period_name;
    if (!acc[courseKey]) {
      acc[courseKey] = {
        teacher_name: item.teacher_name,
        assignments: [],
      };
    }
    acc[courseKey].assignments.push(item);
    return acc;
  }, {} as Record<string, { teacher_name?: string | null; assignments: StudentProgressData[] }>);


  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Student Progress Report</h2>
          <HelpTooltip helpKey="report_studentProgress_intro" position="right" className="ml-2" />
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="student_select" className="flex items-center text-sm font-medium text-gray-700">
              Select Student <span className="text-red-500 ml-1">*</span>
              <HelpTooltip helpKey="report_studentProgress_selectStudent" />
            </label>
            <select
              id="student_select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- Select Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name} ({s.student_identifier || s.id?.substring(0,8)})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="marking_period_select" className="flex items-center text-sm font-medium text-gray-700">
              Marking Period (Optional)
              <HelpTooltip helpKey="report_studentProgress_selectMarkingPeriod" />
            </label>
            <select
              id="marking_period_select"
              value={selectedMarkingPeriodId}
              onChange={(e) => setSelectedMarkingPeriodId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">-- All Marking Periods --</option>
              {markingPeriods.map(mp => <option key={mp.id} value={mp.id!}>{mp.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading || !selectedStudentId}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Generate Report
             <HelpTooltip helpKey="report_studentProgress_generateButton" />
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-4">Loading report data...</p>}
      {error && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}

      {reportData.length > 0 && (
        <div id="progressReportContent" className="bg-white p-6 shadow-lg rounded-lg">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-2xl font-bold text-gray-800">Progress Report for {generatedReportStudentName}</h3>
            <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 print:hidden">
                Print Report <HelpTooltip helpKey="report_studentProgress_printButton" />
            </button>
          </div>

          {Object.entries(groupedReportData).map(([coursePeriodName, data]) => (
            <div key={coursePeriodName} className="mb-8 last:mb-0">
              <h4 className="text-xl font-semibold text-indigo-700 mb-1">{coursePeriodName}</h4>
              {data.teacher_name && <p className="text-sm text-gray-600 mb-3">Teacher: {data.teacher_name}</p>}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Assignment</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Due Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Max Points</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Points Earned</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.assignments.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.assignment_title}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.assignment_type_name || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.assignment_due_date ? new Date(item.assignment_due_date  + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap text-sm text-gray-500">{Number(item.assignment_max_points).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap text-sm font-semibold text-gray-700">{item.points_earned !== null && item.points_earned !== undefined ? Number(item.points_earned).toFixed(2) : '-'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap text-sm text-gray-500">
                            {item.points_earned !== null && item.points_earned !== undefined && item.assignment_max_points > 0 ?
                             ((Number(item.points_earned) / Number(item.assignment_max_points)) * 100).toFixed(1) + '%' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentProgressReportPage;
