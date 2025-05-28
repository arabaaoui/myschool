import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import HelpTooltip from '../../common/HelpTooltip';
import { UserProfile } from '../../../types';
import { Student } from '../../Students/StudentForm';

export interface ParentStudentLink {
  id?: string;
  tenant_id?: string;
  parent_user_id: string;
  student_id: string;
  relationship_type?: string | null;
}

interface LinkParentStudentFormProps {
  onLinkCreated: (link: ParentStudentLink) => void;
  existingLinks?: ParentStudentLink[]; // To help prevent creating duplicate links in UI before backend check
}

const LinkParentStudentForm: React.FC<LinkParentStudentFormProps> = ({ onLinkCreated, existingLinks = [] }) => {
  const [parentUserId, setParentUserId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('');

  const [parents, setParents] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setError(null);
      try {
        const { data: parentsData, error: parentsError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role')
          .eq('role', 'parent') // Assuming 'parent' role exists
          .order('full_name', { ascending: true });
        if (parentsError) throw parentsError;
        setParents(parentsData || []);

        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_identifier')
          .order('last_name', { ascending: true });
        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

      } catch (err: any) {
        setError('Failed to load parents or students: ' + err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!parentUserId) { setError('Please select a parent.'); setLoading(false); return; }
    if (!studentId) { setError('Please select a student.'); setLoading(false); return; }
    if (!relationshipType.trim()) { setError('Relationship type cannot be empty.'); setLoading(false); return; }

    // Check if this link already exists in the UI to prevent noise, though DB has UNIQUE constraint
    const linkExists = existingLinks.some(link => link.parent_user_id === parentUserId && link.student_id === studentId);
    if (linkExists) {
        setError('This parent is already linked to this student.');
        setLoading(false);
        return;
    }

    try {
      const newLink: Omit<ParentStudentLink, 'id' | 'tenant_id'> = {
        parent_user_id: parentUserId,
        student_id: studentId,
        relationship_type: relationshipType.trim(),
      };

      const { data, error: insertError } = await supabase
        .from('parent_student_links')
        .insert(newLink)
        .select()
        .single();

      if (insertError) throw insertError;
      
      onLinkCreated(data as ParentStudentLink);
      // Reset form
      setParentUserId('');
      setStudentId('');
      setRelationshipType('');
      alert('Parent-Student link created successfully!');

    } catch (err: any) {
      console.error('Error creating link:', err);
      if ((err as any).code === '23505') { // Unique violation
        setError('This parent is already linked to this student (checked by database).');
      } else {
        setError((err as any).message || 'Failed to create link.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (loadingDropdowns) {
    return <p className="text-center text-gray-500 py-4">Loading form data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-white shadow-md rounded-lg max-w-xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Link Parent to Student</h3>
      {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}

      <div>
        <label htmlFor="parent_user_id_link" className="flex items-center text-sm font-medium text-gray-700">
          Parent <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="linkParentStudentForm_parent" />
        </label>
        <select id="parent_user_id_link" name="parent_user_id" value={parentUserId} onChange={(e) => setParentUserId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Parent --</option>
          {parents.map(p => <option key={p.id} value={p.id!}>{p.full_name || p.email} (Role: {p.role})</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="student_id_link" className="flex items-center text-sm font-medium text-gray-700">
          Student <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="linkParentStudentForm_student" />
        </label>
        <select id="student_id_link" name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Student --</option>
          {students.map(s => <option key={s.id} value={s.id!}>{s.last_name}, {s.first_name} ({s.student_identifier || 'ID N/A'})</option>)}
        </select>
      </div>
      
      <div>
        <label htmlFor="relationship_type" className="flex items-center text-sm font-medium text-gray-700">
          Relationship Type <span className="text-red-500 ml-1">*</span>
          <HelpTooltip helpKey="linkParentStudentForm_relationship" />
        </label>
        <input 
            type="text" 
            id="relationship_type" 
            name="relationship_type" 
            value={relationshipType} 
            onChange={(e) => setRelationshipType(e.target.value)} 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Mother, Father, Guardian"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading || loadingDropdowns} className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {loading ? 'Creating Link...' : 'Create Link'}
          <HelpTooltip helpKey="linkParentStudentForm_createButton" />
        </button>
      </div>
    </form>
  );
};

export default LinkParentStudentForm;
