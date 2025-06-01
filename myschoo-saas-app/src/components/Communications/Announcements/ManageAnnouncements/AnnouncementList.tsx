import React from 'react';
import { Announcement } from './AnnouncementForm'; // Re-use type
import HelpTooltip from '../../../common/HelpTooltip';
import { UserProfile } from '../../../../types'; // For created_by_user_id

// Extend Announcement for display purposes to include creator's name
export interface DisplayableAnnouncement extends Announcement {
    user_profiles?: Pick<UserProfile, 'full_name' | 'email'>; // Creator's details
}


interface AnnouncementListProps {
  announcements: DisplayableAnnouncement[];
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcementId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  onEdit,
  onDelete,
  loading,
  error,
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading announcements...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (announcements.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No announcements found. Create one to get started!</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th scope="col" className="hidden md:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visible From</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visible Until</th>
            <th scope="col" className="hidden lg:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Roles</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {announcements.map((ann) => (
            <tr key={ann.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-normal break-words">
                <div className="text-sm font-medium text-gray-900">{ann.title}</div>
                <div className="text-xs text-gray-500 mt-1 truncate hover:whitespace-normal max-w-xs">{ann.content}</div>
              </td>
              <td className="hidden md:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ann.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {ann.is_published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(ann.start_date)}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(ann.end_date) || 'Ongoing'}
              </td>
               <td className="hidden lg:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {(ann.target_roles && ann.target_roles.length > 0) ? ann.target_roles.join(', ') : 'All Roles'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onEdit(ann)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit Announcement"
                  >
                    Edit
                  </button>
                  {/* <HelpTooltip helpKey="announcementList_editButton" position="left" className="inline-flex" /> */}
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button
                    onClick={() => ann.id && onDelete(ann.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete Announcement"
                    disabled={!ann.id}
                  >
                    Delete
                  </button>
                  {/* <HelpTooltip helpKey="announcementList_deleteButton" position="left" className="inline-flex" /> */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnnouncementList;
