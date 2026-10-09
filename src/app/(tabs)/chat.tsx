/**
 * Chat Tab Screen ('/(tabs)/chat')
 *
 * Minimalist, clean conversational companion UI:
 * - Scrollable message thread
 * - Floating prompt bar (+ attachment, input box, voice mic, send action)
 * - Simple on-click Toast triggers
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Add01Icon,
  Mic01Icon,
  SentIcon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { INITIAL_CHAT_MESSAGES } from '@/constants/dummyData';
import { ChatMessage } from '@/types';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import { MascotAvatar } from '@/components/common';

export default function ChatScreen() {
  const { agent } = useAgent();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Calculate header height offset for iOS KeyboardAvoidingView (SafeAreaView top + AppHeader height)
  const headerOffset = Platform.OS === 'ios' ? insets.top + 98 : 0;

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => sub.remove();
  }, []);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Demo reply so the agent's personality shows up in the conversation
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: `Got it! I'm ${agent.name}${agent.subtitle ? `, your ${agent.subtitle.toLowerCase()}` : ''}. Let's work on this together — tell me a bit more.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 700);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerOffset}>
      <View style={styles.content}>
        {/* Scrollable Messages Thread */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.scrollInner}>
              {/* Centered Date Badge */}
              <View style={styles.dateBadgeContainer}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>Today</Text>
                </View>
              </View>

              {/* Messages */}
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                // The seeded agent message shows the agent's customizable greeting
                const text = msg.id === 'msg-2' ? agent.greeting : msg.text;
                return (
                  <TouchableOpacity
                    key={msg.id}
                    activeOpacity={0.8}
                    onPress={() => showToast(text)}
                    style={[
                      styles.messageRow,
                      isUser ? styles.userMessageRow : styles.agentMessageRow,
                    ]}>
                    {!isUser && <MascotAvatar size={28} style={styles.messageAvatar} />}
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.agentBubble,
                      ]}>
                      <Text
                        style={[
                          styles.bubbleText,
                          isUser ? styles.userBubbleText : styles.agentBubbleText,
                        ]}>
                        {text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {/* Floating Input Pill */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputBar}>
            {/* Plus Attach Button */}
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => showToast('Attach file')}
              activeOpacity={0.7}>
              <HugeiconsIcon icon={Add01Icon} size={20} color={Colors.iconDark} strokeWidth={2.2} />
            </TouchableOpacity>

            {/* Prompt Text Input */}
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              placeholder={`Message ${agent.name}`}
              placeholderTextColor={Colors.iconMuted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />

            {/* Right Action: Voice or Send */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                style={[styles.circleBtn, { backgroundColor: agent.color }]}
                onPress={handleSend}
                activeOpacity={0.8}>
                <HugeiconsIcon icon={SentIcon} size={18} color={Colors.white} strokeWidth={2.4} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => showToast('Voice input')}
                activeOpacity={0.7}>
                <HugeiconsIcon icon={Mic01Icon} size={20} color={Colors.iconDark} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
  },
  dateBadgeContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateBadgeText: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    color: Colors.textMuted,
  },
  messageRow: {
    marginBottom: 12,
    width: '100%',
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  agentMessageRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  userBubble: {
    backgroundColor: Colors.chatBubbleUser,
    borderBottomRightRadius: 8,
  },
  agentBubble: {
    backgroundColor: Colors.chatBubbleAi,
    borderWidth: 1,
    borderColor: Colors.chatBubbleAiBorder,
    borderBottomLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 15.5,
    fontFamily: Typography.regular,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  userBubbleText: {
    color: Colors.userBubbleText,
    fontFamily: Typography.medium,
  },
  agentBubbleText: {
    color: Colors.iconDark,
    fontFamily: Typography.regular,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 6,
    backgroundColor: Colors.background,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
});
