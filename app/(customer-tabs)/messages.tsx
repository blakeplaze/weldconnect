import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { MessageCircle, Trash2, CheckSquare, Square } from 'lucide-react-native';

interface Conversation {
  id: string;
  job_id: string;
  customer_id: string;
  business_id: string;
  last_message_at: string;
  job_title: string;
  other_user_name: string;
  other_user_id: string;
  last_message: string | null;
  unread_count: number;
}

export default function MessagesScreen() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const { data: convos, error } = await supabase
        .from('conversations')
        .select(`
          id,
          job_id,
          customer_id,
          business_id,
          last_message_at,
          jobs!inner(title),
          customer:profiles!conversations_customer_id_fkey(id, full_name),
          business:profiles!conversations_business_id_fkey(id, full_name)
        `)
        .or(`customer_id.eq.${userProfile.id},business_id.eq.${userProfile.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo: any) => {
          const isCustomer = convo.customer_id === userProfile.id;
          const otherUserId = isCustomer ? convo.business_id : convo.customer_id;
          const otherUserName = isCustomer
            ? convo.business?.full_name
            : convo.customer?.full_name;

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('message_text')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .neq('sender_id', userProfile.id)
            .is('read_at', null);

          return {
            id: convo.id,
            job_id: convo.job_id,
            customer_id: convo.customer_id,
            business_id: convo.business_id,
            last_message_at: convo.last_message_at,
            job_title: convo.jobs?.title || 'Unknown Job',
            other_user_name: otherUserName || 'Unknown User',
            other_user_id: otherUserId,
            last_message: lastMessage?.message_text || null,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (userProfile?.id) {
      const subscription = supabase
        .channel('messages_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userProfile?.id, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (userProfile?.id) {
        loadConversations();
      }
    }, [userProfile?.id, loadConversations])
  );

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedConversations(new Set());
  };

  const toggleConversationSelection = (id: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedConversations(newSelected);
  };

  const deleteSelectedConversations = async () => {
    if (selectedConversations.size === 0) return;

    Alert.alert(
      'Delete Conversations',
      `Are you sure you want to delete ${selectedConversations.size} conversation${selectedConversations.size > 1 ? 's' : ''}? This will also delete all messages in ${selectedConversations.size > 1 ? 'these conversations' : 'this conversation'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('conversations')
                .delete()
                .in('id', Array.from(selectedConversations));

              if (error) throw error;

              setConversations(
                conversations.filter((c) => !selectedConversations.has(c.id))
              );
              setSelectedConversations(new Set());
              setSelectionMode(false);
            } catch (error) {
              console.error('Error deleting conversations:', error);
              Alert.alert('Error', 'Failed to delete conversations');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isSelected = selectedConversations.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isSelected && styles.conversationItemSelected,
        ]}
        onPress={() => {
          if (selectionMode) {
            toggleConversationSelection(item.id);
          } else {
            router.push(`/chat/${item.id}`);
          }
        }}
      >
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <CheckSquare size={24} color="#007AFF" />
            ) : (
              <Square size={24} color="#CCC" />
            )}
          </View>
        )}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{item.other_user_name}</Text>
            <Text style={styles.timeText}>{formatTime(item.last_message_at)}</Text>
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <View style={styles.messagePreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MessageCircle size={64} color="#CCC" />
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>
          Messages will appear here when you start chatting
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {conversations.length > 0 && (
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={toggleSelectionMode}
          >
            <Text style={styles.selectButtonText}>
              {selectionMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
          {selectionMode && selectedConversations.size > 0 && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteSelectedConversations}
            >
              <Trash2 size={20} color="#FFF" />
              <Text style={styles.deleteButtonText}>
                Delete ({selectedConversations.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  selectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  listContainer: {
    padding: 0,
  },
  conversationItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  timeText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  jobTitle: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 15,
    color: '#8E8E93',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
