import React from 'react';
import { useAuth } from '../../../App'; // To get current user id

// Define types for display - these might need to be adjusted based on actual query results
export interface MessageThreadParticipant {
  id: string; // user_profiles.id of the participant
  full_name?: string | null;
  email?: string;
}
export interface MessageThreadDisplay {
  id: string; // thread_id
  subject?: string | null;
  last_message_snippet?: string | null;
  last_message_at?: string | null; // ISO string
  participants: MessageThreadParticipant[]; // All participants except the current user
  unread_count?: number;
  // Need to fetch user_profiles for participants to get names
  // This might be better handled by a view or a more complex query in MessagingPage
  // For now, assume participant user_id is available and names can be fetched/mapped.
  other_participants_display?: string; // e.g., "John Doe, Jane Smith"
  message_threads?: any; // If data is nested
  user_profiles?: any; // If data is nested
  messages?: {content: string, created_at: string}[]; // For last message
}


interface ThreadListProps {
  threads: MessageThreadDisplay[];
  onSelectThread: (threadId: string) => void;
  selectedThreadId?: string | null;
  loading: boolean;
  error?: string | null;
}

const ThreadList: React.FC<ThreadListProps> = ({ 
    threads, 
    onSelectThread, 
    selectedThreadId,
    loading,
    error
}) => {
  const { user } = useAuth();

  const getParticipantNames = (participants: MessageThreadParticipant[]): string => {
    return participants
      .filter(p => p.id !== user?.id) // Exclude current user
      .map(p => p.full_name || p.email || 'Unknown User')
      .join(', ');
  };
  
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // More sophisticated date formatting (e.g., "Yesterday", "10:30 AM", "Mon") can be added
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };


  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading threads...</div>;
  }
  if (error) {
    return <div className="p-4 text-sm text-red-500 bg-red-50 rounded">Error: {error}</div>;
  }
  if (threads.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No message threads found. Start a new conversation!</div>;
  }

  return (
    <div className="border-r border-gray-200 h-full overflow-y-auto">
      <ul className="divide-y divide-gray-200">
        {threads.map(thread => {
          // Determine participant names for display
          // This logic depends on how participants are fetched and structured in thread object
          let displayNames = thread.other_participants_display;
          if (!displayNames && thread.participants) {
            displayNames = getParticipantNames(thread.participants);
          } else if (!displayNames && thread.message_threads?.participants) { // Example if nested
            displayNames = getParticipantNames(thread.message_threads.participants.map((p:any) => p.user_profiles));
          }
          
          // Last message snippet and time
          const lastMessage = thread.messages && thread.messages.length > 0 ? thread.messages[0] : null;
          const snippet = thread.last_message_snippet || lastMessage?.content || 'No messages yet';
          const time = thread.last_message_at || lastMessage?.created_at;


          return (
            <li key={thread.id}>
              <button
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left p-3 sm:p-4 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors
                  ${selectedThreadId === thread.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate max-w-[calc(100%-50px)]">
                    {thread.subject || displayNames || 'Thread'}
                  </h3>
                  {time && (
                    <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(time)}</p>
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate">{snippet}</p>
                {thread.unread_count && thread.unread_count > 0 && (
                  <span className="mt-1 float-right inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {thread.unread_count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ThreadList;
