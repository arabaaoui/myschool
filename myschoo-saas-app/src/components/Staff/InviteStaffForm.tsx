import React, { useState } from 'react';
import { supabase } from '../../supabaseClient'; 
import HelpTooltip from '../common/HelpTooltip';
import { useAuth } from '../../App'; 
import { useToasts } from '../../App'; // Import useToasts

const STAFF_ROLES_FOR_INVITE = ['teacher', 'support_staff', 'admin']; 

interface InviteStaffFormProps {
  onInvitationSent: () => void; 
  onCancel: () => void;
}

const InviteStaffForm: React.FC<InviteStaffFormProps> = ({ onInvitationSent, onCancel }) => {
  const { session } = useAuth(); 
  const toasts = useToasts(); // Use the toasts hook
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(STAFF_ROLES_FOR_INVITE[0]); 
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Keep local error for form-specific display if needed
  // const [successMessage, setSuccessMessage] = useState<string | null>(null); // Replaced by toasts

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // setSuccessMessage(null); // Replaced

    if (!email.trim()) { setError('Email is required.'); setLoading(false); return; }
    if (!role) { setError('Role is required.'); setLoading(false); return; }

    try {
      const { data, error: funcError } = await supabase.functions.invoke('invite-user', {
        body: { 
            email, 
            role, 
            full_name: fullName.trim() === '' ? undefined : fullName.trim(),
        },
      });

      if (funcError) {
        let readableError = funcError.message;
        try {
            const parsedError = JSON.parse(funcError.message);
            if (parsedError && parsedError.error) { 
                readableError = parsedError.error;
            } else if (parsedError && parsedError.message) { 
                 readableError = parsedError.message;
            }
        } catch (e) { /* ignore parsing error, use original message */ }

        if (readableError.includes("User already registered") || readableError.includes("already registered")) {
             const specificError = "This email address is already registered. If the user needs to be added to this organization, an administrator may need to update their profile manually or they may need to use a different email.";
             setError(specificError); // Show form-specific error
             toasts.showErrorToast(specificError); // Also show toast
        } else {
            setError(`Invitation failed: ${readableError}`); // Show form-specific error
            toasts.showErrorToast(`Invitation failed: ${readableError}`); // Also show toast
        }
        throw new Error(readableError); 
      }

      console.log('Invite function response:', data);
      toasts.showSuccessToast(`Invitation successfully sent to ${email} with role ${role}.`);
      setEmail('');
      setRole(STAFF_ROLES_FOR_INVITE[0]);
      setFullName('');
      onInvitationSent(); 
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      if (!error) { 
        const message = err.message || 'An unexpected error occurred while sending invitation.';
        setError(message); // Set local error if not already set by specific checks
        toasts.showErrorToast(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        Invite New Staff Member
      </h2>
      {/* Form-specific error can still be shown if desired, toasts are supplemental */}
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}
      {/* Success message is now handled by toast */}

      <div>
        <label htmlFor="invite_email" className="flex items-center text-sm font-medium text-gray-700">
          Email Address <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="inviteStaffForm_email" position="right" className="ml-1.5" />
        </label>
        <input
          type="email"
          name="email"
          id="invite_email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="user@example.com"
        />
      </div>
      
      <div>
        <label htmlFor="invite_full_name" className="flex items-center text-sm font-medium text-gray-700">
          Full Name (Optional)
          <HelpTooltip helpKey="inviteStaffForm_fullName" position="right" className="ml-1.5" />
        </label>
        <input
          type="text"
          name="fullName"
          id="invite_full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Jane Doe"
        />
      </div>

      <div>
        <label htmlFor="invite_role" className="flex items-center text-sm font-medium text-gray-700">
          Role <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="inviteStaffForm_role" position="right" className="ml-1.5" />
        </label>
        <select
          name="role"
          id="invite_role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {STAFF_ROLES_FOR_INVITE.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
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
          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Sending Invitation...' : 'Send Invitation'}
          <HelpTooltip helpKey="inviteStaffForm_sendInviteButton" position="top" className="ml-1.5 inline-flex" />
        </button>
      </div>
    </form>
  );
};

export default InviteStaffForm;
