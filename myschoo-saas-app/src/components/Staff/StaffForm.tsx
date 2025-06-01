import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import HelpTooltip from '../common/HelpTooltip';
import { UserProfile } from '../../types'; // Import UserProfile type

// Define available roles for staff members
const STAFF_ROLES = ['admin', 'teacher', 'support_staff', 'pending'];

interface StaffFormProps {
  staffMemberToEdit: UserProfile; // Editing existing staff, so staffMemberToEdit is required
  onSave: (staffMember: UserProfile) => void;
  onCancel: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ staffMemberToEdit, onSave, onCancel }) => {
  const [formData, setFormData] = useState<UserProfile>({
    ...staffMemberToEdit,
    // Ensure is_active is a boolean, defaulting to true if undefined from staffMemberToEdit
    is_active: staffMemberToEdit.is_active === undefined ? true : staffMemberToEdit.is_active,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
        ...staffMemberToEdit,
        is_active: staffMemberToEdit.is_active === undefined ? true : staffMemberToEdit.is_active,
    });
  }, [staffMemberToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.full_name?.trim()) {
      setError('Full name cannot be empty.');
      setLoading(false);
      return;
    }
    if (!formData.role) {
      setError('Role is required.');
      setLoading(false);
      return;
    }

    try {
      // Only 'full_name', 'role', and 'is_active' can be updated through this form.
      // 'email' and 'id' are read-only. 'tenant_id' is implicit.
      const updates = {
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(), // Manually set updated_at
      };

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', staffMemberToEdit.id) // Ensure we are updating the correct profile
        .select()
        .single();

      if (updateError) throw updateError;

      // Supabase returns the updated record in `data`.
      // We should merge this with any fields not sent in `updates` if necessary,
      // but since we're selecting the whole record back, `data` should be complete.
      onSave(data as UserProfile);

    } catch (err: any) {
      console.error('Error updating staff member:', err);
      setError(err.message || 'Failed to update staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        Edit Staff Member
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      {/* Email (Read-only) */}
      <div>
        <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
          Email
          <HelpTooltip helpKey="staffForm_email" position="right" className="ml-1.5" />
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={formData.email || ''}
          readOnly
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
        />
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="flex items-center text-sm font-medium text-gray-700">
          Full Name <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="staffForm_fullName" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="full_name"
          id="full_name"
          value={formData.full_name || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Role Dropdown */}
      <div>
        <label htmlFor="role" className="flex items-center text-sm font-medium text-gray-700">
          Role <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="staffForm_role" position="right" className="ml-1.5" />
        </label>
        <select
          name="role"
          id="role"
          value={formData.role || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="" disabled>Select a role</option>
          {STAFF_ROLES.map(role => (
            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Active Status Checkbox */}
      <div className="flex items-center">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          checked={formData.is_active || false}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="ml-2 flex items-center text-sm font-medium text-gray-700">
          Account Active
          <HelpTooltip helpKey="staffForm_isActive" position="right" className="ml-1.5" />
        </label>
      </div>


      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 pt-2 space-y-2 sm:space-y-0">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;
