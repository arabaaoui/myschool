import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabaseClient';
import { Announcement } from '../ManageAnnouncements/AnnouncementForm'; // Re-use type
import { useAuth } from '../../../../App'; // To get user role for filtering (if RLS doesn't cover all cases or for UI hints)
import { UserProfile } from '../../../../types';

// Extended Announcement for display purposes to include creator's name
export interface DisplayableAnnouncementForView extends Announcement {
    user_profiles?: Pick<UserProfile, 'full_name' | 'email'>; // Creator's details
    creator_name?: string; // Processed name
}


interface AnnouncementsDisplayProps {
  // Props to customize fetching, e.g., limit, specific roles to always show for (though RLS handles most)
  limit?: number;
  showToRoles?: string[]; // For client-side pre-filtering or highlighting, RLS is primary
}

const AnnouncementsDisplay: React.FC<AnnouncementsDisplayProps> = ({ limit }) => {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<DisplayableAnnouncementForView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);


  const fetchViewableAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // RLS on 'announcements' table handles filtering by publication status, dates, and target_roles.
      // The client just needs to fetch.
      let query = supabase
        .from('announcements')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .eq('is_published', true)
        .lte('start_date', new Date().toISOString()) // Start date is now or in the past
        // End date is NULL (ongoing) OR in the future
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('start_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const displayData = (data || []).map(ann => ({
        ...ann,
        creator_name: ann.user_profiles?.full_name || ann.user_profiles?.email || 'System',
      }));
      setAnnouncements(displayData);

    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, user]); // user dependency if RLS relies on auth.uid() directly in complex ways, or for role checks client-side

  useEffect(() => {
    fetchViewableAnnouncements();
  }, [fetchViewableAnnouncements]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedAnnouncementId(expandedAnnouncementId === id ? null : id);
  };


  if (loading) {
    return <p className="text-center text-gray-500 py-4">Loading announcements...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 p-2 rounded">{error}</p>;
  }

  if (announcements.length === 0) {
    return <p className="text-center text-gray-500 py-4">No current announcements.</p>;
  }

  return (
    <div className="space-y-6">
      {announcements.map((ann) => {
        const isExpanded = expandedAnnouncementId === ann.id;
        const displayContent = isExpanded || !ann.content || ann.content.length <= 200
            ? ann.content
            : `${ann.content.substring(0, 200)}...`;

        return (
            <div key={ann.id} className="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 ease-in-out">
                <h3 className="text-xl font-semibold text-indigo-700 mb-2">{ann.title}</h3>
                <p
                    className={`text-gray-700 text-sm leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'max-h-24 overflow-hidden'}`}
                    style={{ WebkitLineClamp: isExpanded ? 'none' : 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis'}}
                >
                    {displayContent}
                </p>
                {!isExpanded && ann.content && ann.content.length > 200 && (
                    <button
                        onClick={() => toggleExpand(ann.id!)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2"
                    >
                        Read More
                    </button>
                )}
                {isExpanded && (
                     <button
                        onClick={() => toggleExpand(ann.id!)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2"
                    >
                        Show Less
                    </button>
                )}
                <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                    <p>Posted on: {formatDate(ann.start_date)} by {ann.creator_name}</p>
                    {ann.end_date && <p>Visible until: {formatDate(ann.end_date)}</p>}
                    {ann.target_roles && ann.target_roles.length > 0 && (
                        <p>For: {ann.target_roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}</p>
                    )}
                </div>
            </div>
        );
      })}
    </div>
  );
};

export default AnnouncementsDisplay;
