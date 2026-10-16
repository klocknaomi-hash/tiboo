/**
 * SidebarDrawer Component
 *
 * Fullscreen sliding drawer interface providing session management:
 * 1. Top bar: Agent title & right arrow dismissal button
 * 2. Main Chat: Quick jump capsule back to primary conversation
 * 3. Side Chats: Filterable list of parallel conversation threads with unread indicators
 * 4. Bottom Toolbar: Settings gear shortcut, search filter input, and compose new chat button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  ArrowRight01Icon,
  Delete02Icon,
  Settings01Icon,
  Search01Icon,
  Edit02Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import { useChat } from '@/context/ChatContext';
import { MAIN_THREAD_ID } from '@/lib/chatService';
import MascotAvatar from './MascotAvatar';
import TibooLogo from './TibooLogo';

export interface SidebarDrawerProps {
  /** Visibility state of the drawer modal */
  visible: boolean;
  /** Active chat session identifier */
  activeChatId?: string;
  /** Agent name displayed in drawer header (defaults to the active agent's) */
  agentName?: string;
  /** Callback fired to close the drawer */
  onClose: () => void;
  /** Callback fired when a conversation item is tapped */
  onSelectChat?: (chatTitle: string) => void;
  /** Callback fired to initiate a clean chat session */
  onNewChat?: () => void;
  /** Callback fired to navigate directly to settings */
  onOpenSettings?: () => void;
  /** Callback fired to navigate to Chat History screen */
  onOpenHistory?: () => void;
  /** Callback fired to clear all side chat topics */
  onClearSideChats?: () => void;
}

/**
 * Slide-in Session History Drawer
 */
export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  visible,
  activeChatId,
  agentName,
  onClose,
  onSelectChat,
  onNewChat,
  onOpenSettings,
  onOpenHistory,
  onClearSideChats,
}) => {
  const { agent } = useAgent();
  const {
    threads,
    activeThreadId: contextActiveThreadId,
    setActiveThreadId,
    createNewChat,
  } = useChat();

  const currentActiveId = activeChatId || contextActiveThreadId;
  const displayName = agentName ?? agent.name;
  const [searchQuery, setSearchQuery] = useState('');

  // Side chats are non-main threads
  const sideThreads = threads.filter((t) => t.id !== MAIN_THREAD_ID);

  // Filter side chat topics by active search query
  const filteredChats = sideThreads.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );



  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Fullscreen white sidebar with safe area */}
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom', 'left', 'right']}>
          {/* Top Bar: Center Name + Right Arrow Button */}
          <View style={styles.header}>
            <View style={styles.headerSideSpacer}>
              <TibooLogo size={26} />
            </View>

            <View style={styles.headerIdentity}>
              <MascotAvatar size={28} />
              <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
            </View>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Fermer la barre latérale">
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={22}
                color={Colors.iconDark}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>

          {/* Main Chat Capsule Button */}
          <View style={styles.mainChatWrapper}>
            <TouchableOpacity
              style={[
                styles.mainChatCapsule,
                currentActiveId === MAIN_THREAD_ID && [
                  styles.mainChatCapsuleActive,
                  { backgroundColor: `${agent.color}18`, borderColor: agent.color },
                ],
              ]}
              onPress={async () => {
                await setActiveThreadId(MAIN_THREAD_ID);
                showToast('Discussion principale');
                onSelectChat?.('Discussion principale');
                onClose();
              }}
              activeOpacity={0.8}>
              <Text style={[styles.mainChatText, currentActiveId === MAIN_THREAD_ID && { color: agent.color }]}>
                Discussion principale
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick link to Chat History */}
          <View style={styles.historyShortcutWrapper}>
            <TouchableOpacity
              style={styles.historyShortcutBtn}
              onPress={() => {
                onClose();
                onOpenHistory?.();
              }}
              activeOpacity={0.7}>
              <View style={styles.historyIconCircle}>
                <HugeiconsIcon icon={Clock01Icon} size={16} color={Colors.iconDark} strokeWidth={2} />
              </View>
              <Text style={styles.historyShortcutText}>Historique des chats</Text>
            </TouchableOpacity>
          </View>

          {/* Thin Divider Line */}
          <View style={styles.divider} />

          {/* Side Chats Section */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>Discussions secondaires</Text>

              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => {
                  showToast('Discussions secondaires effacées');
                  onClearSideChats?.();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Effacer les discussions secondaires">
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={20}
                  color={Colors.iconMuted}
                  strokeWidth={1.8}
                />
              </TouchableOpacity>
            </View>

            {/* Side Chats List */}
            {filteredChats.map((chat) => {
              const isActive = chat.id === currentActiveId;
              return (
                <TouchableOpacity
                  key={chat.id}
                  style={[styles.chatRow, isActive && [styles.chatRowActive, { backgroundColor: `${agent.color}12` }]]}
                  onPress={async () => {
                    await setActiveThreadId(chat.id);
                    showToast(chat.title);
                    onSelectChat?.(chat.title);
                    onClose();
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.chatRowText, isActive && [styles.chatRowTextActive, { color: agent.color }]]}
                    numberOfLines={1}>
                    {chat.title}
                  </Text>

                  {/* Active or unread indicator */}
                  {isActive ? (
                    <View style={[styles.activeDot, { backgroundColor: agent.color }]} />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {filteredChats.length === 0 && (
              <View style={styles.emptySideChats}>
                <Text style={styles.emptySideChatsText}>
                  {searchQuery ? 'Aucun résultat trouvé' : 'Aucune discussion secondaire'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Toolbar: Settings Gear (Left) + Search (Center) + Compose (Right) */}
          <View style={styles.bottomToolbar}>
            {/* Settings Gear Button */}
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => {
                showToast('Paramètres');
                onClose();
                onOpenSettings?.();
              }}
              activeOpacity={0.7}
              accessibilityLabel="Paramètres">
              <HugeiconsIcon
                icon={Settings01Icon}
                size={22}
                color={Colors.iconDark}
                strokeWidth={2}
              />
            </TouchableOpacity>

            {/* Search Capsule Input */}
            <View style={styles.searchCapsule}>
              <HugeiconsIcon
                icon={Search01Icon}
                size={18}
                color={Colors.iconMuted}
                strokeWidth={2}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une discussion…"
                placeholderTextColor={Colors.iconMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* New Chat Compose Button */}
            <TouchableOpacity
              style={[styles.circleBtn, { backgroundColor: agent.color }]}
              onPress={async () => {
                showToast('Nouvelle discussion');
                onClose();
                if (onNewChat) {
                  onNewChat();
                } else {
                  await createNewChat();
                }
              }}
              activeOpacity={0.8}
              accessibilityLabel="Nouvelle discussion">
              <HugeiconsIcon
                icon={Edit02Icon}
                size={20}
                color={Colors.white}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSideSpacer: {
    width: 48,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.2,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  mainChatWrapper: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  mainChatCapsule: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.tabActiveBg, // #E6E8EA
    borderRadius: 25,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mainChatCapsuleActive: {
    borderColor: Colors.border,
    backgroundColor: Colors.tabActiveBg,
  },
  mainChatText: {
    fontSize: 15.5,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  historyShortcutWrapper: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  historyShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyShortcutText: {
    fontSize: 13.5,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    width: '100%',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.iconMuted, // #8E8E93 / #9E9E9E
  },
  trashBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 10,
  },
  chatRowActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  chatRowText: {
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
    flex: 1,
    paddingRight: 10,
  },
  chatRowTextActive: {
    fontFamily: Typography.semibold,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptySideChats: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptySideChatsText: {
    fontSize: 13.5,
    fontFamily: Typography.regular,
    color: Colors.textMuted,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: Colors.surfaceElevated,
  },
  searchCapsule: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
    paddingVertical: 0,
  },
});

export default SidebarDrawer;
