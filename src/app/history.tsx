/**
 * Chat History Screen ('/history')
 *
 * Full conversation history manager:
 * - Conversations grouped by day (Aujourd'hui / Hier / 7 derniers jours / Plus ancien)
 * - Title + timestamp of last message on each thread row
 * - Prominent "+ New Chat" action creating a unique threadId and redirecting to chat
 * - Contextual menu per conversation (Rename / Delete) with live Supabase persistence
 * - Real-time title search filter
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  ArrowLeft01Icon,
  Add01Icon,
  MoreHorizontalIcon,
  Edit01Icon,
  Delete02Icon,
  Search01Icon,
  Comment01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { useChat } from '@/context/ChatContext';
import { useAgent } from '@/context/AgentContext';
import { showToast } from '@/context/ToastContext';
import { groupThreadsByDay } from '@/lib/chatService';
import { ChatThread } from '@/types';

export default function ChatHistoryScreen() {
  const router = useRouter();
  const { agent } = useAgent();
  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    createNewChat,
    renameThread,
    deleteThread,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const lower = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        (t.lastMessage && t.lastMessage.toLowerCase().includes(lower))
    );
  }, [threads, searchQuery]);

  // Group threads by day: Aujourd'hui / Hier / ...
  const sections = useMemo(() => groupThreadsByDay(filteredThreads), [filteredThreads]);

  // Open conversation
  const handleSelectThread = async (thread: ChatThread) => {
    await setActiveThreadId(thread.id);
    showToast(`Discussion : ${thread.title}`);
    router.replace('/(tabs)/chat' as any);
  };

  // "+ New Chat" Action (Requirement 5)
  const handleNewChat = async () => {
    const newThreadId = await createNewChat('Nouvelle discussion');
    showToast('Nouvelle discussion créée');
    router.replace('/(tabs)/chat' as any);
  };

  // Open context menu for conversation (Requirement 6)
  const handleOpenMenu = (thread: ChatThread) => {
    setSelectedThread(thread);
    setIsMenuOpen(true);
  };

  // Rename Flow
  const handleStartRename = () => {
    if (!selectedThread) return;
    setRenameInput(selectedThread.title);
    setIsMenuOpen(false);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!selectedThread) return;
    const trimmed = renameInput.trim();
    if (!trimmed) {
      showToast('Le titre ne peut pas être vide');
      return;
    }
    await renameThread(selectedThread.id, trimmed);
    setIsRenameModalOpen(false);
    showToast('Conversation renommée');
    setSelectedThread(null);
  };

  // Delete Flow
  const handleStartDelete = () => {
    setIsMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedThread) return;
    await deleteThread(selectedThread.id);
    setIsDeleteModalOpen(false);
    showToast('Conversation supprimée');
    setSelectedThread(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header with Back Button, Title and "+ New Chat" */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Retour">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={Colors.iconDark} strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Historique des chats</Text>

        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: agent.color }]}
          onPress={handleNewChat}
          activeOpacity={0.8}
          accessibilityLabel="Nouvelle conversation">
          <HugeiconsIcon icon={Add01Icon} size={18} color={Colors.white} strokeWidth={2.4} />
          <Text style={styles.newChatBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchCapsule}>
          <HugeiconsIcon icon={Search01Icon} size={18} color={Colors.iconMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation..."
            placeholderTextColor={Colors.iconMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <HugeiconsIcon icon={Cancel01Icon} size={16} color={Colors.iconMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Grouped Conversations List (Aujourd'hui / Hier / ...) */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isActive = item.id === activeThreadId;
          return (
            <TouchableOpacity
              style={[styles.threadCard, isActive && styles.activeThreadCard]}
              onPress={() => handleSelectThread(item)}
              activeOpacity={0.7}>
              {/* Left Badge */}
              <View
                style={[
                  styles.threadIconBadge,
                  isActive
                    ? { backgroundColor: `${agent.color}20` }
                    : { backgroundColor: Colors.borderLight },
                ]}>
                <HugeiconsIcon
                  icon={Comment01Icon}
                  size={19}
                  color={isActive ? agent.color : Colors.iconDark}
                  strokeWidth={2}
                />
              </View>

              {/* Title & Last Message */}
              <View style={styles.threadInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.threadTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.lastMessageTime ? (
                    <Text style={styles.threadTime}>{item.lastMessageTime}</Text>
                  ) : null}
                </View>

                {item.lastMessage ? (
                  <Text style={styles.threadSnippet} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                ) : (
                  <Text style={[styles.threadSnippet, { fontStyle: 'italic' }]}>
                    Nouvelle conversation vide
                  </Text>
                )}
              </View>

              {/* Context Menu 3-Dots Button (Requirement 6) */}
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => handleOpenMenu(item)}
                hitSlop={10}
                accessibilityLabel="Options conversation">
                <HugeiconsIcon
                  icon={MoreHorizontalIcon}
                  size={20}
                  color={Colors.iconMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBadge, { backgroundColor: `${agent.color}15` }]}>
              <HugeiconsIcon icon={Comment01Icon} size={32} color={agent.color} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Essaie un autre mot-clé dans la barre de recherche.'
                : 'Commence un nouvel échange avec Tiboo pour créer un historique.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: agent.color }]}
              onPress={handleNewChat}
              activeOpacity={0.8}>
              <HugeiconsIcon icon={Add01Icon} size={18} color={Colors.white} strokeWidth={2.4} />
              <Text style={styles.emptyActionText}>+ Nouvelle conversation</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 4. Context Menu Modal (Rename / Delete) */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuSheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selectedThread?.title}
                </Text>

                {/* Option 1: Rename */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleStartRename}
                  activeOpacity={0.7}>
                  <HugeiconsIcon icon={Edit01Icon} size={20} color={Colors.iconDark} strokeWidth={2} />
                  <Text style={styles.menuItemText}>Renommer la conversation</Text>
                </TouchableOpacity>

                {/* Option 2: Delete */}
                <TouchableOpacity
                  style={[styles.menuItem, styles.dangerMenuItem]}
                  onPress={handleStartDelete}
                  activeOpacity={0.7}>
                  <HugeiconsIcon icon={Delete02Icon} size={20} color={Colors.error} strokeWidth={2} />
                  <Text style={[styles.menuItemText, styles.dangerText]}>
                    Supprimer la conversation
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  style={styles.cancelMenuItem}
                  onPress={() => setIsMenuOpen(false)}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 5. Rename Dialog Modal */}
      <Modal
        visible={isRenameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Renommer la conversation</Text>
            <TextInput
              style={styles.dialogInput}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Nouveau titre..."
              placeholderTextColor={Colors.iconMuted}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsRenameModalOpen(false)}
                activeOpacity={0.7}>
                <Text style={styles.dialogCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: agent.color }]}
                onPress={handleConfirmRename}
                activeOpacity={0.8}>
                <Text style={styles.dialogSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Supprimer la conversation ?</Text>
            <Text style={styles.dialogSubtitle}>
              Tous les messages de &quot;{selectedThread?.title}&quot; seront définitivement effacés.
            </Text>
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsDeleteModalOpen(false)}
                activeOpacity={0.7}>
                <Text style={styles.dialogCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: Colors.error }]}
                onPress={handleConfirmDelete}
                activeOpacity={0.8}>
                <Text style={styles.dialogSaveText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  newChatBtnText: {
    color: Colors.white,
    fontFamily: Typography.semibold,
    fontSize: 13.5,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionHeaderRow: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12.5,
    fontFamily: Typography.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  activeThreadCard: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  threadIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  threadTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  threadTime: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textMuted,
  },
  threadSnippet: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  moreBtn: {
    padding: 6,
    borderRadius: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
  },
  emptyActionText: {
    color: Colors.white,
    fontFamily: Typography.semibold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dangerMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.textPrimary,
  },
  dangerText: {
    color: Colors.error,
  },
  cancelMenuItem: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 13,
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dialogTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dialogSubtitle: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  dialogInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    marginBottom: 18,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
  },
  dialogCancelText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  dialogSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dialogSaveText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },
});
