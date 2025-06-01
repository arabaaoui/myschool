import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import StaffList from './StaffList';
import StaffForm from './StaffForm';
import InviteStaffForm from './InviteStaffForm'; // Import the new InviteStaffForm
import { UserProfile } from '../../types';
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App';

const StaffPage: React.FC = () => {
  const { user, isTenantAdmin } = useAuth();
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false); // State for invite form
  const [staffToEdit, setStaffToEdit] = useState<UserProfile | null>(null);

  const fetchStaffMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setStaffMembers(data || []);
    } catch (err: any) {
      console.error('Error fetching staff members:', err);
      setError('Failed to load staff members. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
        fetchStaffMembers();
    } else {
        setLoading(false);
        setError("You do not have permission to manage staff.");
    }
  }, [fetchStaffMembers, isTenantAdmin]);

  const handleInviteStaffClick = () => {
    setStaffToEdit(null); // Ensure no one is being edited
    setShowEditForm(false);
    setShowInviteForm(true);
  };

  const handleEditStaff = (staffMember: UserProfile) => {
    setStaffToEdit(staffMember);
    setShowInviteForm(false);
    setShowEditForm(true);
  };

  const handleFormSave = (savedStaffMember: UserProfile) => {
    // This is for the StaffForm (edit existing staff)
    setStaffMembers((prevStaff) =>
      prevStaff.map((s) => (s.id === savedStaffMember.id ? savedStaffMember : s))
    );
    setStaffMembers(currentStaff => [...currentStaff].sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || ''))
    );
    setShowEditForm(false);
    setStaffToEdit(null);
  };

  const handleInvitationSent = () => {
    setShowInviteForm(false);
    // Optionally, refresh the staff list to show the invited user (who will be inactive)
    // Or inform the admin that the invitation has been sent and the user will appear once they accept.
    // For now, we can just close the form. A full refresh might be good UX.
    fetchStaffMembers();
  };


  const handleFormCancel = () => {
    setShowEditForm(false);
    setShowInviteForm(false);
    setStaffToEdit(null);
  };

  if (!isTenantAdmin && !loading) {
      return (
          <div className="p-4 md:p-6">
              <p className="text-red-500">{error || "You do not have permission to manage staff."}</p>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Staff</h2>
          <HelpTooltip helpKey="staffManagement_intro" position="right" className="ml-2" />
        </div>
        {!showEditForm && !showInviteForm && (
          <div className="flex items-center">
            <button
                onClick={handleInviteStaffClick} // Changed from placeholder action
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
            >
                Invite New Staff
            </button>
            <HelpTooltip helpKey="staff_inviteNewButton" position="left" className="ml-1.5" />
          </div>
        )}
      </div>

      {error && !showEditForm && !showInviteForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showInviteForm ? (
        <InviteStaffForm
            onInvitationSent={handleInvitationSent}
            onCancel={handleFormCancel}
        />
      ) : showEditForm && staffToEdit ? (
        <StaffForm
          staffMemberToEdit={staffToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <StaffList
          staffMembers={staffMembers}
          onEdit={handleEditStaff}
          loading={loading}
        />
      )}
    </div>
  );
};

export default StaffPage;
