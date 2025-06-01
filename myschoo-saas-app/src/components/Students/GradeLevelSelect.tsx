import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path as necessary

interface GradeLevel {
  id: string;
  name: string;
}

interface GradeLevelSelectProps {
  selectedGradeLevelId: string | null;
  onChange: (gradeLevelId: string) => void;
  className?: string; // Allows passing additional classes from parent
}

const GradeLevelSelect: React.FC<GradeLevelSelectProps> = ({
  selectedGradeLevelId,
  onChange,
  className, // Added className to props
}) => {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGradeLevels = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('grade_levels')
          .select('id, name')
          .order('sort_order', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }
        setGradeLevels(data || []);
      } catch (err: any) {
        console.error('Error fetching grade levels:', err);
        setError('Failed to load grade levels.'); // Simplified error message
      } finally {
        setLoading(false);
      }
    };

    fetchGradeLevels();
  }, []);

  if (loading) {
    // Consistent text size with other loading/error messages
    return <p className="text-sm text-gray-500 py-2">Loading grade levels...</p>;
  }

  if (error) {
    // Consistent text size and padding
    return <p className="text-sm text-red-500 py-2">{error}</p>;
  }

  return (
    <select
      value={selectedGradeLevelId || ''}
      onChange={(e) => onChange(e.target.value)}
      // Base classes for input styling, w-full ensures it takes parent width.
      // className prop allows parent to add more specific layout/spacing if needed.
      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className || ''}`}
      required
    >
      <option value="" disabled>
        Select a grade level
      </option>
      {gradeLevels.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {grade.name}
        </option>
      ))}
    </select>
  );
};

export default GradeLevelSelect;
