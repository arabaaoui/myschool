import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { MarkingPeriod } from '../../Settings/MarkingPeriods/MarkingPeriodForm'; // Re-use type

interface SelectMarkingPeriodForCommentsProps {
  onMarkingPeriodSelect: (markingPeriodId: string, markingPeriodName: string) => void;
  currentSelection?: string | null;
  // Optionally, pass academicYearId from selected CoursePeriod to filter marking periods
  academicYearId?: string | null; 
}

const SelectMarkingPeriodForComments: React.FC<SelectMarkingPeriodForCommentsProps> = ({ 
    onMarkingPeriodSelect, 
    currentSelection,
    academicYearId
}) => {
  const [markingPeriods, setMarkingPeriods] = useState<MarkingPeriod[]>([]);
  const [selectedMarkingPeriodId, setSelectedMarkingPeriodId] = useState<string>(currentSelection || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkingPeriods = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('marking_periods')
          .select('id, name, academic_year_id, start_date') // Fetch start_date for ordering
          .order('start_date', { ascending: false }); // Show most recent first

        if (academicYearId) {
          query = query.eq('academic_year_id', academicYearId);
        }
        
        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setMarkingPeriods(data || []);
        if (data && data.length > 0 && !currentSelection) {
          // Optionally pre-select
        } else if (currentSelection) {
            setSelectedMarkingPeriodId(currentSelection);
        }
      } catch (err: any) {
        console.error('Error fetching marking periods:', err);
        setError('Failed to load marking periods. ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkingPeriods();
  }, [academicYearId, currentSelection]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectionId = e.target.value;
    setSelectedMarkingPeriodId(newSelectionId);
    if (newSelectionId) {
        const selectedMP = markingPeriods.find(mp => mp.id === newSelectionId);
        const name = selectedMP ? selectedMP.name : 'Selected Marking Period';
        onMarkingPeriodSelect(newSelectionId, name);
    } else {
        onMarkingPeriodSelect('', 'None');
    }
  };
  
  if (error) {
    return <p className="text-sm text-red-500 py-2 bg-red-50 p-2 rounded">{error}</p>;
  }

  return (
    <div className="mb-4">
      <label htmlFor="marking_period_selector_comments" className="flex items-center text-sm font-medium text-gray-700 mb-1">
        Select Marking Period
        <HelpTooltip helpKey="courseComments_selectMarkingPeriod" position="right" className="ml-1.5" />
      </label>
      <select
        id="marking_period_selector_comments"
        value={selectedMarkingPeriodId}
        onChange={handleChange}
        disabled={loading}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option value="">-- Select a Marking Period --</option>
        {loading && <option value="" disabled>Loading periods...</option>}
        {!loading && markingPeriods.length === 0 && <option value="" disabled>No marking periods found{academicYearId ? ' for selected year' : ''}.</option>}
        {markingPeriods.map(mp => (
          <option key={mp.id} value={mp.id!}>
            {mp.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectMarkingPeriodForComments;
