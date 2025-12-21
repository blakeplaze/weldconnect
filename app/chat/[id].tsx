import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
  sender_name: string;
}

interface ConversationDetails {
  id: string;
  job_id: string;
  job_title: string;
  other_user_name: string;
  other_user_id: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id && userProfile?.id) {
      const initializeChat = async () => {
        try {
          setError(null);
          await loadConversationDetails();
          await loadMessages();
          await markMessagesAsRead();
        } catch (err) {
          console.error('Error initializing chat:', err);
          setError('Failed to load conversation');
          setLoading(false);
        }
      };

      initializeChat();

      const subscription = supabase
        .channel(`chat_${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${id}`,
          },
          (payload) => {
            const newMsg = payload.new as any;
            addNewMessage(newMsg);
            if (newMsg.sender_id !== userProfile.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else if (id && !userProfile?.id) {
      setError('Please log in to view messages');
      setLoading(false);
    }
  }, [id, userProfile?.id]);

  const loadConversationDetails = async () => {
    if (!id || !userProfile?.id) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        job_id,
        customer_id,
        business_id,
        jobs!inner(title),
        customer:profiles!conversations_customer_id_fkey(id, full_name),
        business:profiles!conversations_business_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Conversation not found');
    }

    const isCustomer = data.customer_id === userProfile.id;
    const customer = Array.isArray(data.customer) ? data.customer[0] : data.customer;
    const business = Array.isArray(data.business) ? data.business[0] : data.business;
    const job = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;

    const otherUserName = isCustomer
      ? business?.full_name
      : customer?.full_name;
    const otherUserId = isCustomer ? data.business_id : data.customer_id;

    setConversationDetails({
      id: data.id,
      job_id: data.job_id,
      job_title: job?.title || 'Unknown Job',
      other_user_name: otherUserName || 'Unknown User',
      other_user_id: otherUserId,
    });
  };

  const loadMessages = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        message_text,
        image_url,
        read_at,
        created_at,
        sender:profiles!messages_sender_id_fkey(full_name)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messagesWithSender = (data || []).map((msg: any) => ({
      ...msg,
      sender_name: msg.sender?.full_name || 'Unknown',
    }));

    setMessages(messagesWithSender);
    setLoading(false);
  };

  const addNewMessage = async (newMsg: any) => {
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', newMsg.sender_id)
      .maybeSingle();

    const messageWithSender = {
      ...newMsg,
      sender_name: sender?.full_name || 'Unknown',
    };

    setMessages((prev) => {
      const exists = prev.some((m) => m.id === newMsg.id);
      if (exists) return prev;
      return [...prev, messageWithSender];
    });
  };

  const markMessagesAsRead = async () => {
    if (!id || !userProfile?.id) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', id)
        .neq('sender_id', userProfile.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !sending) || !id || !userProfile?.id) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      setSending(true);
      setNewMessage('');

      const tempMessage: Message = {
        id: tempId,
        conversation_id: id,
        sender_id: userProfile.id,
        message_text: messageText,
        image_url: null,
        read_at: null,
        created_at: new Date().toISOString(),
        sender_name: userProfile.full_name,
      };

      setMessages((prev) => [...prev, tempMessage]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          sender_id: userProfile.id,
          message_text: messageText,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...tempMessage, id: data.id } : msg))
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === userProfile?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#E9E9EB' },
        ]}
      >
        {!isOwnMessage && (
          <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>{item.sender_name}</Text>
        )}
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.messageImage} />
        )}
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? { color: '#FFF' } : { color: theme.colors.text },
          ]}
        >
          {item.message_text}
        </Text>
        <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>{formatMessageTime(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            setLoading(true);
            setError(null);
            if (id && userProfile?.id) {
              const retry = async () => {
                try {
                  await loadConversationDetails();
                  await loadMessages();
                  await markMessagesAsRead();
                } catch (err) {
                  console.error('Error retrying:', err);
                  setError('Failed to load conversation');
                  setLoading(false);
                }
              };
              retry();
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {conversationDetails?.other_user_name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {conversationDetails?.job_title}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.card, color: theme.colors.text }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={1000}
          editable={!sending}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault();
              if (newMessage.trim() && !sending) {
                sendMessage();
              }
            }
          }}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.colors.primary }, sending && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={sending || !newMessage.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    maxWidth: '75%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
