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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Image as ImageIcon, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/lib/uploadImage';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id && userProfile?.id) {
      const initializeChat = async () => {
        try {
          await loadConversationDetails();
          await loadMessages();
          await markMessagesAsRead();
        } catch (error) {
          console.error('Error initializing chat:', error);
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
      setLoading(false);
    }
  }, [id, userProfile?.id]);

  const loadConversationDetails = async () => {
    if (!id || !userProfile?.id) return;

    try {
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
      if (!data) return;

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
    } catch (error) {
      console.error('Error loading conversation details:', error);
    }
  };

  const loadMessages = async () => {
    if (!id) return;

    try {
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
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
  };

  const sendImageMessage = async (imageUri: string) => {
    if (!id || !userProfile?.id) return;

    const tempId = `temp-${Date.now()}`;

    try {
      setSending(true);

      const imageUrl = await uploadImage(imageUri, 'message-images');

      const tempMessage: Message = {
        id: tempId,
        conversation_id: id,
        sender_id: userProfile.id,
        message_text: 'Sent an image',
        image_url: imageUrl,
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
          message_text: 'Sent an image',
          image_url: imageUrl,
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
      console.error('Error sending image:', error);
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
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>{item.sender_name}</Text>
        )}
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.messageImage} />
        )}
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.message_text}
        </Text>
        <Text style={styles.messageTime}>{formatMessageTime(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {conversationDetails?.other_user_name}
          </Text>
          <Text style={styles.headerSubtitle}>
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

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={pickImage}
          disabled={sending}
        >
          <ImageIcon size={24} color="#007AFF" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
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
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
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
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
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
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  imageButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
