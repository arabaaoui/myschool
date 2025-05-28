import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../App';
import ThreadList, { MessageThreadDisplay, MessageThreadParticipant } from './ThreadList';
import MessageView from './MessageView';
import StartNewMessageForm from './StartNewMessageForm';
import HelpTooltip from '../../common/HelpTooltip';
import { UserProfile } from '../../../types';

const MessagingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<MessageThreadDisplay[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [currentThreadParticipants, setCurrentThreadParticipants] = useState<{id: string, name: string}[]>([]);

  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!user?.id || !profile?.tenant_id) return;
    setLoadingThreads(true);
    setError(null);
    try {
      // Fetch threads where the current user is a participant
      const { data, error: threadsError } = await supabase
        .from('message_thread_participants')
        .select(`
          unread_count,
          last_read_at,
          message_threads (
            id,
            subject,
            updated_at, 
            messages ( content, created_at, sender_id ),
            participants:message_thread_participants (
              user_id,
              user_profiles (id, full_name, email)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id) // Ensure participant entry is for current tenant
        .order('updated_at', { foreignTable: 'message_threads', ascending: false });


      if (threadsError) throw threadsError;

      const formattedThreads = (data || []).map((mtp: any) => {
        const thread = mtp.message_threads;
        const lastMessage = thread.messages && thread.messages.length > 0 
            ? thread.messages.sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
            : null;
        
        const participants = (thread.participants || [])
            .filter((p: any) => p.user_profiles && p.user_id !== user.id) // Exclude self, ensure profile exists
            .map((p: any) => ({
                id: p.user_profiles.id,
                full_name: p.user_profiles.full_name,
                email: p.user_profiles.email,
            }));

        return {
          id: thread.id,
          subject: thread.subject,
          last_message_snippet: lastMessage?.content,
          last_message_at: lastMessage?.created_at || thread.updated_at,
          participants: participants,
          unread_count: mtp.unread_count,
          // For display in ThreadList more easily
          other_participants_display: participants.map((p: MessageThreadParticipant) => p.full_name || p.email).join(', ') || "N/A",
          messages: thread.messages // Keep messages if needed for snippet, already sorted by created_at desc in subquery if done there
        };
      }).filter(t => t !== null) as MessageThreadDisplay[];
      
      setThreads(formattedThreads);

    } catch (err: any) {
      console.error('Error fetching threads:', err);
      setError('Failed to load message threads. ' + err.message);
    } finally {
      setLoadingThreads(false);
    }
  }, [user?.id, profile?.tenant_id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Real-time subscription for changes to user's thread participation (e.g., new thread, unread count)
  useEffect(() => {
    if (!user?.id) return;

    const participantChannel = supabase
      .channel(`user-thread-participation-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_thread_participants', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Change in thread participation:', payload);
          fetchThreads(); // Refetch all threads on any change to participation records
        }
      )
      .on( // Also listen for new messages that might not directly update participant but should update thread's last message
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages'},
        (payload) => {
            // Check if the new message belongs to any of the current user's threads
            const message = payload.new as any;
            const isRelevant = threads.some(t => t.id === message.thread_id);
            if (isRelevant) {
                console.log('New message in one of user threads:', payload.new);
                fetchThreads();
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
    };
  }, [user?.id, fetchThreads, threads]);


  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setShowNewMessageForm(false); // Close new message form if open
    const currentThread = threads.find(t => t.id === threadId);
    if (currentThread) {
        setCurrentThreadParticipants(currentThread.participants.map(p => ({id: p.id, name: p.full_name || p.email || 'Unknown'})));
    }
     // Optimistically mark as read in UI, backend will confirm
    setThreads(prev => prev.map(t => t.id === threadId ? {...t, unread_count: 0} : t));
  };

  const handleNewMessageFormToggle = () => {
    setShowNewMessageForm(!showNewMessageForm);
    setSelectedThreadId(null); // Deselect any active thread
  };
  
  const handleNewThreadCreated = (newThreadId: string) => {
      fetchThreads(); // Refresh thread list
      setSelectedThreadId(newThreadId); // Select the new thread
      setShowNewMessageForm(false); // Close the form
  };

  return (
    <div className="container mx-auto p-0 md:p-4 h-[calc(100vh-var(--navbar-height,64px))]"> {/* Adjust navbar height as needed */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 px-4 pt-4 md:px-0 md:pt-0 print:hidden">
        <h1 className="text-2xl font-semibold text-gray-800">Messages</h1>
        {!showNewMessageForm && (
            <button
            onClick={handleNewMessageFormToggle}
            className="mt-2 sm:mt-0 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            >
            New Message
            </button>
        )}
      </div>

      {error && <p className="m-4 text-red-600 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
      
      {showNewMessageForm ? (
        <StartNewMessageForm 
            onNewThreadCreated={handleNewThreadCreated} 
            onCancel={handleNewMessageFormToggle} 
        />
      ) : (
        <div className="flex flex-col md:flex-row h-[calc(100%-80px)] md:h-[calc(100%-60px)] bg-white shadow-lg rounded-md overflow-hidden">
          <div className="w-full md:w-1/3 lg:w-1/4 border-b md:border-b-0 md:border-r border-gray-200 print:hidden">
            <ThreadList
              threads={threads}
              onSelectThread={handleSelectThread}
              selectedThreadId={selectedThreadId}
              loading={loadingThreads}
              // error={error} // Error is handled globally for the page
            />
          </div>
          <div className="flex-grow h-full"> {/* Ensure MessageView takes remaining height */}
            <MessageView 
                threadId={selectedThreadId} 
                onMessageSent={fetchThreads} // Refresh threads to update snippet/time/unread
                participants={currentThreadParticipants}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPage;
