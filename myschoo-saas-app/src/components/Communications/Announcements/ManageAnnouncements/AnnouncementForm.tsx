import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../supabaseClient';
import HelpTooltip from '../../../common/HelpTooltip';
import { useAuth } from '../../../../App';

export interface Announcement {
  id?: string;
  tenant_id?: string; // Handled by RLS
  title: string;
  content: string;
  created_by_user_id?: string;
  start_date?: string; // TIMESTAMPTZ
  end_date?: string | null;   // TIMESTAMPTZ
  target_roles?: string[] | null; // Array of role names
  is_published?: boolean;
}

const AVAILABLE_TARGET_ROLES = ['student', 'parent', 'teacher', 'support_staff', 'admin'];

interface AnnouncementFormProps {
  announcementToEdit?: Announcement | null;
  onSave: (announcement: Announcement) => void;
  onCancel: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ announcementToEdit, onSave, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Announcement>({
    title: '',
    content: '',
    start_date: new Date().toISOString().slice(0, 16), // Default to now for datetime-local
    end_date: null,
    target_roles: [], // Default to empty array (interpreted as "all roles" by RLS if empty/NULL)
    is_published: true,
    ...announcementToEdit,
    // Ensure target_roles is always an array for the form state
    target_roles: announcementToEdit?.target_roles || [], 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcementToEdit) {
      setFormData({
        ...announcementToEdit,
        start_date: announcementToEdit.start_date ? new Date(announcementToEdit.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0,16),
        end_date: announcementToEdit.end_date ? new Date(announcementToEdit.end_date).toISOString().slice(0, 16) : null,
        target_roles: announcementToEdit.target_roles || [],
        is_published: announcementToEdit.is_published === undefined ? true : announcementToEdit.is_published,
      });
    } else {
      setFormData({
        title: '',
        content: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: null,
        target_roles: [],
        is_published: true,
        created_by_user_id: user?.id,
      });
    }
  }, [announcementToEdit, user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "target_roles") {
        const roleValue = value;
        setFormData(prev => ({
            ...prev,
            target_roles: checked 
                ? [...(prev.target_roles || []), roleValue] 
                : (prev.target_roles || []).filter(r => r !== roleValue)
        }));
    } else {
        setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.title.trim()) { setError('Title cannot be empty.'); setLoading(false); return; }
    if (!formData.content.trim()) { setError('Content cannot be empty.'); setLoading(false); return; }
    if (!formData.start_date) { setError('Start date is required.'); setLoading(false); return; }
    if (formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
        setError('End date must be after start date.'); setLoading(false); return;
    }

    try {
      let resultAnnouncement: Announcement;
      const dataToSave = { 
        ...formData,
        created_by_user_id: formData.created_by_user_id || user?.id,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        // Ensure empty array for target_roles is treated as NULL by DB if desired, or handle in RLS.
        // For now, an empty array will be stored. RLS policy handles NULL or empty array as "all roles".
        target_roles: formData.target_roles && formData.target_roles.length > 0 ? formData.target_roles : null,
      };

      if (announcementToEdit && announcementToEdit.id) {
        const { id, tenant_id, created_at, ...updateData } = dataToSave; // created_by_user_id is fine in updateData
        const { data, error: updateError } = await supabase
          .from('announcements')
          .update(updateData)
          .eq('id', announcementToEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        resultAnnouncement = data as Announcement;
      } else {
        const { id, tenant_id, ...insertData } = dataToSave;
        const { data, error: insertError } = await supabase
          .from('announcements')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        resultAnnouncement = data as Announcement;
      }
      onSave(resultAnnouncement);
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
        {announcementToEdit ? 'Edit Announcement' : 'Create New Announcement'}
      </h2>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="title" className="flex items-center text-sm font-medium text-gray-700">
          Title <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="announcements_form_title" />
        </label>
        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full input-class" />
      </div>

      <div>
        <label htmlFor="content" className="flex items-center text-sm font-medium text-gray-700">
          Content <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="announcements_form_content" />
        </label>
        <textarea name="content" id="content" value={formData.content} onChange={handleChange} required rows={5} className="mt-1 block w-full input-class"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="start_date" className="flex items-center text-sm font-medium text-gray-700">
            Start Date & Time <span className="text-red-500 ml-1">*</span>
            <HelpTooltip helpKey="announcements_form_startDate" />
          </label>
          <input type="datetime-local" name="start_date" id="start_date" value={formData.start_date || ''} onChange={handleChange} required className="mt-1 block w-full input-class" />
        </div>
        <div>
          <label htmlFor="end_date" className="flex items-center text-sm font-medium text-gray-700">
            End Date & Time (Optional)
            <HelpTooltip helpKey="announcements_form_endDate" />
          </label>
          <input type="datetime-local" name="end_date" id="end_date" value={formData.end_date || ''} onChange={handleChange} className="mt-1 block w-full input-class" />
        </div>
      </div>
      
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
            Target Roles (Optional - leave blank for all)
            <HelpTooltip helpKey="announcements_form_targetRoles" />
        </label>
        <div className="mt-2 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {AVAILABLE_TARGET_ROLES.map(role => (
                <div key={role} className="flex items-center">
                    <input 
                        id={`role-${role}`} 
                        name="target_roles" 
                        type="checkbox" 
                        value={role}
                        checked={(formData.target_roles || []).includes(role)}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor={`role-${role}`} className="ml-2 text-sm text-gray-700 capitalize">{role}</label>
                </div>
            ))}
        </div>
      </div>

       <div className="flex items-start">
        <div className="flex items-center h-5">
            <input id="is_published" name="is_published" type="checkbox" checked={formData.is_published || false} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor="is_published" className="flex items-center font-medium text-gray-700">
            Published <HelpTooltip helpKey="announcements_form_isPublished" />
            </label>
            <p className="text-gray-500 text-xs">Unpublished announcements are saved as drafts and not visible to users.</p>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 pt-2 space-y-2 sm:space-y-0">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="w-full sm:w-auto btn-primary disabled:opacity-50">
          {loading ? (announcementToEdit ? 'Saving...' : 'Creating...') : (announcementToEdit ? 'Save Changes' : 'Create Announcement')}
        </button>
      </div>
       <style jsx>{`
        .input-class {
          /* Common input styling */
          px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm;
        }
        .btn-primary {
          /* Primary button styling */
          display: inline-flex; justify-content: center; align-items: center; 
          padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; 
          border-width: 1px; border-color: transparent; 
          border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
          font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; 
          color: white; background-color: #4f46e5; /* indigo-600 */
        }
        .btn-primary:hover { background-color: #4338ca; /* indigo-700 */ }
        .btn-secondary {
          /* Secondary button styling */
          display: inline-flex; justify-content: center; align-items: center; 
          padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; 
          border-width: 1px; border-color: #D1D5DB; /* gray-300 */
          border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
          font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; 
          color: #374151; /* gray-700 */ background-color: white;
        }
        .btn-secondary:hover { background-color: #F9FAFB; /* gray-50 */ }
      `}</style>
    </form>
  );
};

export default AnnouncementForm;
