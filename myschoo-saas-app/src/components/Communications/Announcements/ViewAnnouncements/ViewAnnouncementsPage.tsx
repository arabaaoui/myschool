import React from 'react';
import AnnouncementsDisplay from './AnnouncementsDisplay';
import HelpTooltip from '../../../common/HelpTooltip';

const ViewAnnouncementsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">School Announcements</h1>
          <HelpTooltip helpKey="announcements_view_intro" position="right" className="ml-2" />
        </div>
      </div>
      <AnnouncementsDisplay limit={20} /> {/* Show more on dedicated page, perhaps with pagination later */}
    </div>
  );
};

// Add a help key for announcements_view_intro if not already present
// "announcements_view_intro": "View current school-wide announcements. Stay updated with the latest news and events.",

export default ViewAnnouncementsPage;
