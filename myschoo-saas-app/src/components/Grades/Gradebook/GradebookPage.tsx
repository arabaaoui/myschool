import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import SelectCoursePeriodForGradebook from './SelectCoursePeriodForGradebook';
import GradebookSheet from './GradebookSheet';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

interface CoursePeriodForDisplay {
    id: string;
    name: string; 
    courses?: { name?: string }; 
  }

const GradebookPage: React.FC = () => {
  const { user, isTeacher, isTenantAdmin } = useAuth();
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string | null>(null);
  const [selectedCoursePeriodName, setSelectedCoursePeriodName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false); // General loading for page or initial selections
  const [error, setError] = useState<string | null>(null);
  
  const handleCoursePeriodSelect = async (coursePeriodId: string) => {
    setSelectedCoursePeriodId(coursePeriodId);
    if (coursePeriodId) {
        setLoading(true);
        try {
            const { data, error: cpError } = await supabase
                .from('course_periods')
                .select('name, courses(name)')
                .eq('id', coursePeriodId)
                .single();
            if (cpError) throw cpError;
            setSelectedCoursePeriodName(data ? `${data.courses?.name} - ${data.name}` : 'Selected Class');
        } catch (err: any) {
            setError("Failed to fetch class details: " + err.message);
            setSelectedCoursePeriodName('Error loading name');
        } finally {
            setLoading(false);
        }
    } else {
        setSelectedCoursePeriodName(null);
    }
  };
  
  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to manage gradebooks.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gradebook</h1>
          <HelpTooltip helpKey="gradebook_intro" position="right" className="ml-2" />
        </div>
      </div>

      <SelectCoursePeriodForGradebook 
        onCoursePeriodSelect={handleCoursePeriodSelect}
        currentSelection={selectedCoursePeriodId}
      />

      {error && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {loading && selectedCoursePeriodId && (
          <p className="mt-6 text-center text-gray-500">Loading class details...</p>
      )}

      {!loading && selectedCoursePeriodId && (
        <GradebookSheet 
            coursePeriodId={selectedCoursePeriodId} 
            coursePeriodName={selectedCoursePeriodName || undefined}
        />
      )}
      {!selectedCoursePeriodId && !loading && (
        <p className="mt-6 text-center text-gray-500">Please select a class to view its gradebook.</p>
      )}
    </div>
  );
};

export default GradebookPage;
