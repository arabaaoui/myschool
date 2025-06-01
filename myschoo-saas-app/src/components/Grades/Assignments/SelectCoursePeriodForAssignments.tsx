import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../App';
import HelpTooltip from '../../common/HelpTooltip';

interface CoursePeriodForDisplay {
  id: string;
  name: string;
  courses?: { name?: string };
  marking_periods?: { name?: string };
}

interface SelectCoursePeriodForAssignmentsProps {
  onCoursePeriodSelect: (coursePeriodId: string) => void;
  currentSelection?: string | null;
}

const SelectCoursePeriodForAssignments: React.FC<SelectCoursePeriodForAssignmentsProps> = ({
    onCoursePeriodSelect,
    currentSelection
}) => {
  const { user } = useAuth();
  const [coursePeriods, setCoursePeriods] = useState<CoursePeriodForDisplay[]>([]);
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string>(currentSelection || '');
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
        const { data, error: fetchError } = await supabase
          .from('course_periods')
          .select(`
            id,
            name,
            courses (name),
            marking_periods (name)
          `)
          .eq('teacher_id', user.id)
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCoursePeriods(data || []);
        if (data && data.length > 0 && !currentSelection) {
          // setSelectedCoursePeriodId(data[0].id); // Optionally pre-select
        } else if (currentSelection) {
            setSelectedCoursePeriodId(currentSelection);
        }
      } catch (err: any) {
        console.error('Error fetching course periods:', err);
        setError('Failed to load your classes. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCoursePeriods();
  }, [user?.id, currentSelection]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelection = e.target.value;
    setSelectedCoursePeriodId(newSelection);
    if (newSelection) {
        onCoursePeriodSelect(newSelection);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 py-2">Loading your classes...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500 py-2 bg-red-50 p-2 rounded">{error}</p>;
  }


  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <label htmlFor="course_period_selector_assignments" className="flex items-center text-sm font-medium text-gray-700 mb-1">
        Select Class to Manage Assignments
        <HelpTooltip helpKey="assignments_selectClass" position="right" className="ml-1.5" />
      </label>
      <select
        id="course_period_selector_assignments"
        value={selectedCoursePeriodId}
        onChange={handleChange}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option value="">-- Select a Class --</option>
        {coursePeriods.length === 0 && <option value="" disabled>No classes assigned to you.</option>}
        {coursePeriods.map(cp => (
          <option key={cp.id} value={cp.id}>
            {cp.courses?.name || 'Course'} - {cp.name} ({cp.marking_periods?.name || 'Marking Period'})
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectCoursePeriodForAssignments;
