import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import SelectCoursePeriodForAssignments from './SelectCoursePeriodForAssignments';
import AssignmentListByCourse from './AssignmentListByCourse';
import AssignmentForm, { Assignment } from './AssignmentForm';
import { AssignmentType } from '../../Settings/AssignmentTypes/AssignmentTypeForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

interface CoursePeriodForDisplay {
    id: string;
    name: string;
    courses?: { name?: string };
  }

const AssignmentsPage: React.FC = () => {
  const { user, isTeacher, isTenantAdmin } = useAuth();
  const [selectedCoursePeriodId, setSelectedCoursePeriodId] = useState<string | null>(null);
  const [selectedCoursePeriodName, setSelectedCoursePeriodName] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentTypes, setAssignmentTypes] = useState<AssignmentType[]>([]);

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null);

  // Fetch assignment types once
  useEffect(() => {
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const { data, error: typesError } = await supabase
          .from('assignment_types')
          .select('*')
          .order('sort_order', { ascending: true, nullsLast: true })
          .order('name', { ascending: true });
        if (typesError) throw typesError;
        setAssignmentTypes(data || []);
      } catch (err: any) {
        setError('Failed to load assignment types. ' + err.message);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  const fetchAssignments = useCallback(async (coursePeriodId: string) => {
    if (!coursePeriodId) return;
    setLoadingAssignments(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_period_id', coursePeriodId)
        .order('due_date', { ascending: true, nullsLast: true })
        .order('title', { ascending: true });

      if (fetchError) throw fetchError;
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments. ' + err.message);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCoursePeriodId) {
      fetchAssignments(selectedCoursePeriodId);
    } else {
      setAssignments([]); // Clear assignments if no course period is selected
    }
  }, [selectedCoursePeriodId, fetchAssignments]);

  const handleCoursePeriodSelect = async (coursePeriodId: string) => {
    setSelectedCoursePeriodId(coursePeriodId);
    // Fetch and set the name of the selected course period for context
    if (coursePeriodId) {
        const { data } = await supabase
            .from('course_periods')
            .select('name, courses(name)')
            .eq('id', coursePeriodId)
            .single();
        setSelectedCoursePeriodName(data ? `${data.courses?.name} - ${data.name}` : 'Selected Class');
    } else {
        setSelectedCoursePeriodName(null);
    }
  };

  const handleAddClick = () => {
    if (!selectedCoursePeriodId) {
      alert("Please select a class first to add an assignment.");
      return;
    }
    setAssignmentToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (assignment: Assignment) => {
    setAssignmentToEdit(assignment);
    setShowForm(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This will also delete all associated student grades.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment. ' + err.message);
    }
  };

  const handleFormSave = (savedAssignment: Assignment) => {
    if (assignmentToEdit) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === savedAssignment.id ? savedAssignment : a))
      );
    } else {
      setAssignments((prev) => [...prev, savedAssignment]);
    }
     // Re-sort
    setAssignments(currentAssignments => [...currentAssignments].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        if(dateA !== dateB) return dateA - dateB;
        return a.title.localeCompare(b.title);
    }));
    setShowForm(false);
    setAssignmentToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setAssignmentToEdit(null);
  };

  if (!isTeacher && !isTenantAdmin) {
    return <p className="p-4 text-red-500">You do not have permission to manage assignments.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Assignments</h1>
          <HelpTooltip helpKey="assignments_intro" position="right" className="ml-2" />
        </div>
        {!showForm && selectedCoursePeriodId && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Assignment
          </button>
        )}
      </div>

      <SelectCoursePeriodForAssignments
        onCoursePeriodSelect={handleCoursePeriodSelect}
        currentSelection={selectedCoursePeriodId}
      />

      {error && <p className="my-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {selectedCoursePeriodId && (
        showForm ? (
          <AssignmentForm
            assignmentToEdit={assignmentToEdit}
            coursePeriodId={selectedCoursePeriodId}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        ) : (
          <AssignmentListByCourse
            assignments={assignments}
            assignmentTypes={assignmentTypes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loadingAssignments || loadingTypes}
            coursePeriodName={selectedCoursePeriodName || undefined}
          />
        )
      )}
      {!selectedCoursePeriodId && !loadingAssignments && (
        <p className="mt-6 text-center text-gray-500">Please select a class to view or manage its assignments.</p>
      )}
    </div>
  );
};

export default AssignmentsPage;
