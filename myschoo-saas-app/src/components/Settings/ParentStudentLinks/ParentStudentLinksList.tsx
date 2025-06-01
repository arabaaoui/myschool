import React from 'react';
import { ParentStudentLink } from './LinkParentStudentForm'; // Re-use type
import { UserProfile } from '../../../types';
import { Student } from '../../Students/StudentForm';
import HelpTooltip from '../../common/HelpTooltip';

// Extended type for displaying names
export interface DisplayableParentStudentLink extends ParentStudentLink {
  parent_name?: string;
  parent_email?: string;
  student_name?: string;
  student_identifier?: string;
  // For direct joins if preferred in query:
  parents?: Pick<UserProfile, 'full_name' | 'email'>;
  students?: Pick<Student, 'first_name' | 'last_name' | 'student_identifier'>;
}

interface ParentStudentLinksListProps {
  links: DisplayableParentStudentLink[];
  onRemoveLink: (linkId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const ParentStudentLinksList: React.FC<ParentStudentLinksListProps> = ({
  links,
  onRemoveLink,
  loading,
  error,
}) => {
  if (loading) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">Loading links...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 py-4 bg-red-100 rounded text-sm md:text-base">{error}</p>;
  }

  if (links.length === 0) {
    return <p className="text-center text-gray-500 py-4 text-sm md:text-base">No parent-student links found. Use the form above to create one.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg mt-8">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 p-4 border-b border-gray-200">Existing Links</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
            <th scope="col" className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
            <th scope="col" className="hidden sm:table-cell px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
            <th scope="col" className="relative px-4 py-2 sm:px-6 sm:py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {links.map((link) => (
            <tr key={link.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{link.parents?.full_name || link.parent_name || 'N/A'}</div>
                <div className="text-xs text-gray-500">{link.parents?.email || link.parent_email || 'N/A'}</div>
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{link.students?.last_name || 'N/A'}, {link.students?.first_name || ''}</div>
                <div className="text-xs text-gray-500">{link.students?.student_identifier || link.student_identifier || 'N/A'}</div>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                {link.relationship_type || 'N/A'}
              </td>
              <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
                  <button
                    onClick={() => link.id && onRemoveLink(link.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Remove Link"
                    disabled={!link.id}
                  >
                    Remove
                  </button>
                  <HelpTooltip helpKey="parentStudentLinkList_removeButton" position="left" className="inline-flex" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParentStudentLinksList;
