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

interface SelectCoursePeriodForCommentsProps {
  onCoursePeriodSelect: (coursePeriodId: string, coursePeriodName: string) => void;
  currentSelection?: string | null;
}

const SelectCoursePeriodForComments: React.FC<SelectCoursePeriodForCommentsProps> = ({
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
          // Optionally pre-select or leave empty until user interaction
        } else if (currentSelection) {
            setSelectedCoursePeriodId(currentSelection);
        }
      } catch (err: any) {
        console.error('Error fetching course periods for comments:', err);
        setError('Failed to load your classes. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCoursePeriods();
  }, [user?.id, currentSelection]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectionId = e.target.value;
    setSelectedCoursePeriodId(newSelectionId);
    if (newSelectionId) {
        const selectedCP = coursePeriods.find(cp => cp.id === newSelectionId);
        const name = selectedCP ? `${selectedCP.courses?.name} - ${selectedCP.name}` : 'Selected Class';
        onCoursePeriodSelect(newSelectionId, name);
    } else {
        onCoursePeriodSelect('', 'None');
    }
  };

  if (error) { // Show error prominently if loading fails
    return <p className="text-sm text-red-500 py-2 bg-red-50 p-2 rounded">{error}</p>;
  }


  return (
    <div className="mb-4">
      <label htmlFor="course_period_selector_comments" className="flex items-center text-sm font-medium text-gray-700 mb-1">
        Select Class
        <HelpTooltip helpKey="courseComments_selectClass" position="right" className="ml-1.5" />
      </label>
      <select
        id="course_period_selector_comments"
        value={selectedCoursePeriodId}
        onChange={handleChange}
        disabled={loading}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option value="">-- Select a Class --</option>
        {loading && <option value="" disabled>Loading classes...</option>}
        {!loading && coursePeriods.length === 0 && <option value="" disabled>No classes assigned to you.</option>}
        {coursePeriods.map(cp => (
          <option key={cp.id} value={cp.id}>
            {cp.courses?.name || 'Course'} - {cp.name} ({cp.marking_periods?.name || 'Marking Period'})
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectCoursePeriodForComments;
