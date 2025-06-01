import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabaseClient';
import AnnouncementList, { DisplayableAnnouncement } from './AnnouncementList';
import AnnouncementForm, { Announcement } from './AnnouncementForm';
import HelpTooltip from '../../../common/HelpTooltip';
import { useAuth } from '../../../../App';

const ManageAnnouncementsPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<DisplayableAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins fetch all announcements for their tenant
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
       const displayData = (data || []).map(ann => ({
        ...ann,
        // user_profiles might be null if created_by_user_id is not set or user deleted
        creator_name: ann.user_profiles?.full_name || ann.user_profiles?.email || 'Unknown User',
      }));
      setAnnouncements(displayData);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
        fetchAnnouncements();
    } else {
        setLoading(false);
        setError("You do not have permission to manage announcements.");
    }
  }, [fetchAnnouncements, isTenantAdmin]);

  const handleAddClick = () => {
    setAnnouncementToEdit(null);
    setShowForm(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setAnnouncementToEdit(announcement);
    setShowForm(true);
  };

  const handleDelete = async (announcementId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (deleteError) throw deleteError;
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setError('Failed to delete announcement. ' + err.message);
    }
  };

  const handleFormSave = (savedAnnouncement: Announcement) => {
    fetchAnnouncements(); // Refetch to get the latest list with creator name
    setShowForm(false);
    setAnnouncementToEdit(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setAnnouncementToEdit(null);
  };

  if (!isTenantAdmin && !loading) {
    return (
        <div className="p-4 md:p-6">
            <p className="text-red-500">{error || "You do not have permission to manage announcements."}</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Announcements</h2>
          <HelpTooltip helpKey="announcements_manage_intro" position="right" className="ml-2" />
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Create New Announcement
          </button>
        )}
      </div>

      {error && !showForm && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      {showForm ? (
        <AnnouncementForm
          announcementToEdit={announcementToEdit}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <AnnouncementList
          announcements={announcements}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
    </div>
  );
};

export default ManageAnnouncementsPage;
