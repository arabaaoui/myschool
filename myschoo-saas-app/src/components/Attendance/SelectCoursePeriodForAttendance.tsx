import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../App'; // To get current user ID for teacher
import HelpTooltip from '../common/HelpTooltip';

// Assuming CoursePeriod and related types are defined elsewhere and imported
// For simplicity, defining a basic structure here if not already globally available
interface CoursePeriodForAttendance {
  id: string;
  name: string; // e.g., "Algebra 101 - Section A"
  courses?: { name?: string }; // For display: "Algebra 101"
  marking_periods?: { name?: string }; // For display: "Semester 1"
}

interface SelectCoursePeriodForAttendanceProps {
  onSelection: (coursePeriodId: string, date: string) => void;
}

const SelectCoursePeriodForAttendance: React.FC<SelectCoursePeriodForAttendanceProps> = ({ onSelection }) => {
  const { user } = useAuth();
  const [coursePeriods, setCoursePeriods] = useState<CoursePeriodForAttendance[]>([]);
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherCoursePeriods = async () => {
      if (!user?.id) {
        setError("User not found. Cannot load course periods.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch course periods assigned to the current teacher
        // Also fetch related course name and marking period name for better display
        const { data, error: fetchError } = await supabase
          .from('course_periods')
          .select(`
            id,
            name,
            courses (name),
            marking_periods (name)
          `)
          .eq('teacher_id', user.id) // Filter by current logged-in teacher
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCoursePeriods(data || []);
        if (data && data.length > 0) {
          setSelectedCoursePeriodId(data[0].id); // Default to first course period
        }
      } catch (err: any) {
        console.error('Error fetching course periods:', err);
        setError('Failed to load your classes. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCoursePeriods();
  }, [user?.id]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCoursePeriodId) {
      alert("Please select a class.");
      return;
    }
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }
    onSelection(selectedCoursePeriodId, selectedDate);
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4">Loading your classes...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded">{error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow-md rounded-lg space-y-4 max-w-lg mx-auto">
      <h3 className="text-lg font-medium text-gray-700">Select Class and Date for Attendance</h3>
      <div>
        <label htmlFor="course_period_id_attendance" className="flex items-center text-sm font-medium text-gray-700">
          Class/Section
          <HelpTooltip helpKey="takeAttendance_selectClass" position="right" className="ml-1.5" />
        </label>
        <select
          id="course_period_id_attendance"
          value={selectedCoursePeriodId}
          onChange={(e) => setSelectedCoursePeriodId(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select your class</option>
          {coursePeriods.length === 0 && <option value="" disabled>No classes assigned to you.</option>}
          {coursePeriods.map(cp => (
            <option key={cp.id} value={cp.id}>
              {cp.courses?.name || 'Course'} - {cp.name} ({cp.marking_periods?.name || 'Marking Period'})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="attendance_date_selector" className="flex items-center text-sm font-medium text-gray-700">
          Date
          <HelpTooltip helpKey="takeAttendance_selectDate" position="right" className="ml-1.5" />
        </label>
        <input
          type="date"
          id="attendance_date_selector"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!selectedCoursePeriodId || !selectedDate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50 transition ease-in-out duration-150"
        >
            Load Roster
            <HelpTooltip helpKey="takeAttendance_loadRosterButton" position="left" className="ml-1.5 inline-flex align-middle" />
        </button>
      </div>
    </form>
  );
};

export default SelectCoursePeriodForAttendance;
