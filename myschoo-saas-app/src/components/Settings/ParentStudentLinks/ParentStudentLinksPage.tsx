import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import LinkParentStudentForm, { ParentStudentLink } from './LinkParentStudentForm';
import ParentStudentLinksList, { DisplayableParentStudentLink } from './ParentStudentLinksList';
import HelpTooltip from '../../common/HelpTooltip';
import { useAuth } from '../../../App';

const ParentStudentLinksPage: React.FC = () => {
  const { isTenantAdmin } = useAuth();
  const [links, setLinks] = useState<DisplayableParentStudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No separate form visibility state, form is always above the list

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch links with parent and student details
      const { data, error: fetchError } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          parent_user_id,
          student_id,
          relationship_type,
          created_at,
          parents:user_profiles (full_name, email),
          students (first_name, last_name, student_identifier)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Map data to DisplayableParentStudentLink if needed, though select does most of it
      const displayableLinks = (data || []).map(link => ({
        ...link,
        parent_name: link.parents?.full_name,
        parent_email: link.parents?.email,
        student_name: `${link.students?.first_name || ''} ${link.students?.last_name || ''}`.trim(),
        student_identifier: link.students?.student_identifier
      }));
      setLinks(displayableLinks);

    } catch (err: any) {
      console.error('Error fetching parent-student links:', err);
      setError('Failed to load links. ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTenantAdmin) {
      fetchLinks();
    } else {
      setLoading(false);
      setError("You do not have permission to manage parent-student links.");
    }
  }, [fetchLinks, isTenantAdmin]);

  const handleLinkCreated = (newLink: ParentStudentLink) => {
    // Refetch to get the newly created link with all details
    fetchLinks();
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!window.confirm('Are you sure you want to remove this link?')) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('parent_student_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;
      setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkId));
      alert('Link removed successfully.');
    } catch (err: any) {
      console.error('Error removing link:', err);
      setError('Failed to remove link. ' + err.message);
    }
  };

  if (!isTenantAdmin && !loading) { // Check after initial loading attempt
      return (
          <div className="p-4 md:p-6">
              <p className="text-red-500">{error || "You do not have permission to manage parent-student links."}</p>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Manage Parent-Student Links</h2>
          <HelpTooltip helpKey="parentStudentLinks_intro" position="right" className="ml-2" />
        </div>
      </div>

      {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm md:text-base">{error}</p>}

      <LinkParentStudentForm onLinkCreated={handleLinkCreated} existingLinks={links} />

      <ParentStudentLinksList
        links={links}
        onRemoveLink={handleRemoveLink}
        loading={loading}
        // Error display is handled above the form and list for general fetch errors
      />
    </div>
  );
};

export default ParentStudentLinksPage;
