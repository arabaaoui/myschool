import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { MarkingPeriod } from '../Settings/MarkingPeriods/MarkingPeriodForm'; // For filtering

interface ScheduleEntry {
  course_period_id: string;
  course_period_name: string;
  course_name: string;
  teacher_name?: string | null;
  room?: string | null;
  marking_period_name: string;
  marking_period_id: string;
  // Add timeslot info if available in course_periods
}

interface MyScheduleViewProps {
  studentId: string;
}

const MyScheduleView: React.FC<MyScheduleViewProps> = ({ studentId }) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]);
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active marking periods for filtering
  useEffect(() => {
    const fetchMarkingPeriods = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error: mpError } = await supabase
          .from('marking_periods')
          .select('id, name, start_date, end_date')
          // .lte('start_date', today) // Optionally filter for current/future
          // .gte('end_date', today)
          .order('start_date', { ascending: false });
        if (mpError) throw mpError;
        setMarkingPeriods(data || []);
        // Auto-select the most recent or current marking period if possible
        if (data && data.length > 0) {
            const currentOrMostRecent = data.find(mp => mp.start_date <= today && mp.end_date >= today) || data[0];
            setSelectedMarkingPeriodId(currentOrMostRecent.id);
        }
      } catch (err: any) {
        setError('Failed to load marking periods: ' + err.message);
      }
    };
    fetchMarkingPeriods();
  }, []);

  const fetchSchedule = useCallback(async () => {
    if (!studentId || !selectedMarkingPeriodId) {
        setSchedule([]);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch student enrollments for the selected marking period
      // RLS will ensure only this student's (or linked child's) enrollments are returned
      const { data, error: scheduleError } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          course_periods (
            id, name, room,
            courses (name),
            user_profiles (full_name),
            marking_periods (id, name)
          )
        `)
        .eq('student_id', studentId)
        .eq('course_periods.marking_period_id', selectedMarkingPeriodId) // Filter by selected marking period
        .is('withdrawal_date', null); // Only active enrollments

      if (scheduleError) throw scheduleError;

      const formattedSchedule: ScheduleEntry[] = (data || []).map((enrollment: any) => ({
        course_period_id: enrollment.course_periods.id,
        course_period_name: enrollment.course_periods.name,
        course_name: enrollment.course_periods.courses.name,
        teacher_name: enrollment.course_periods.user_profiles?.full_name,
        room: enrollment.course_periods.room,
        marking_period_name: enrollment.course_periods.marking_periods.name,
        marking_period_id: enrollment.course_periods.marking_periods.id,
      }));
      setSchedule(formattedSchedule);
      if (formattedSchedule.length === 0) {
        setError('No schedule found for the selected marking period.');
      }
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedMarkingPeriodId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return (
    <div className="p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          My Schedule
          <HelpTooltip helpKey="portal_mySchedule" position="right" className="ml-2" />
        </h2>
        <div>
          <label htmlFor="schedule_mp_filter" className="text-sm font-medium text-gray-700 mr-2">Marking Period:</label>
          <select
            id="schedule_mp_filter"
            value={selectedMarkingPeriodId}
            onChange={(e) => setSelectedMarkingPeriodId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select Marking Period</option>
            {markingPeriods.map(mp => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="text-center text-gray-500 py-4">Loading schedule...</p>}
      {error && <p className="text-center text-red-500 py-4 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {!loading && !error && schedule.length === 0 && (
        <p className="text-center text-gray-500 py-6">
            <HelpTooltip helpKey="portal_schedule_noSchedule" position="bottom" /> No schedule information available for the selected period.
        </p>
      )}

      {!loading && schedule.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Course</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Class/Section</th>
                <th className="hidden sm:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Teacher</th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Room</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.map(item => (
                <tr key={item.course_period_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.course_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.course_period_name}</td>
                  <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.teacher_name || 'N/A'}</td>
                  <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.room || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyScheduleView;
