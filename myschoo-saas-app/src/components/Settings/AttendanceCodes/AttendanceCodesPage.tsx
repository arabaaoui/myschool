import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import AttendanceCodeList from './AttendanceCodeList';
import AttendanceCodeForm, { AttendanceCode } from './AttendanceCodeForm';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App'; // To check admin role

const AttendanceCodesPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [codes, setCodes] = useState<AttendanceCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [codeToEdit, setCodeToEdit] = useState<AttendanceCode | null>(null);

  const fetchAttendanceCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('attendance_codes')
        .select('*')
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('code', { ascending: true });

      if (fetchError) throw fetchError;
      setCodes(data || []);
    } catch (err: any) {
      console.error('Error fetching attendance codes:', err);
      setError('Failed to load attendance codes. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) { // Only fetch if user is admin
        fetchAttendanceCodes();
    } else {
        setLoading(false);
        setError("You do not have permission to manage attendance codes.");
    }
  }, [fetchAttendanceCodes, isTenantAdmin]);

  const handleAddClick = () => {
    setCodeToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (code: AttendanceCode) => {
    setCodeToEdit(code);
    setShowForm(true);
  };

  const handleDelete = async (codeId: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance code? This might fail if it is in use by attendance records.')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('attendance_codes')
        .delete()
        .eq('id', codeId);

      if (deleteError) throw deleteError;
      setCodes((prev) => prev.filter((c) => c.id !== codeId));
    } catch (err: any) {
      console.error('Error deleting attendance code:', err);
      setError('Failed to delete attendance code. It might be in use. ' + err.message);
    }
  };

  const handleFormSave = (savedCode: AttendanceCode) => {
    if (codeToEdit) {
      setCodes((prev) =>
        prev.map((c) => (c.id === savedCode.id ? savedCode : c))
      );
    } else {
      setCodes((prev) => [...prev, savedCode]);
    }
    // Re-sort codes after adding/editing
    setCodes(currentCodes => [...currentCodes].sort((a, b) => {
        const sortOrderA = a.sort_order ?? Infinity;
        const sortOrderB = b.sort_order ?? Infinity;
        if (sortOrderA !== sortOrderB) {
            return sortOrderA - sortOrderB;
        }
        return a.code.localeCompare(b.code);
    }));
    setShowForm(false);
    setCodeToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setCodeToEdit(null);
  };

  if (!isTenantAdmin && !loading) { // If not admin and finished initial loading check
    return (
        <div className="p-4 md:p-6">
            <p className="text-red-500">{error || "You do not have permission to manage attendance codes."}</p>
        </div>
    );
  }


  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Attendance Codes</h2>
          <HelpTooltip helpKey="attendanceCodes_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Add New Code
          </button>
        )}
      </div>

      {error && !showForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <AttendanceCodeForm
          codeToEdit={codeToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <AttendanceCodeList
          codes={codes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AttendanceCodesPage;
