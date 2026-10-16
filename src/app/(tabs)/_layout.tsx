/**
 * TabLayout Component ('/(tabs)/_layout.tsx')
 *
 * Master Tab Layout containing:
 * 1. AppHeader: 3D mascot avatar, agent name capsule pill, sidebar drawer and 3-dots actions
 * 2. Expo Router Tabs viewport for 5 routes:
 *    - /chat
 *    - /feed
 *    - /ideas
 *    - /tasks
 *    - /settings
 * 3. Native Expo Router Tab Bar with active pill capsule and keyboard auto-hide
 * 4. Modals: SidebarDrawer, SettingsMenuModal, EditAgentModal
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Comment01Icon,
  File01Icon,
  Idea01Icon,
  CheckmarkSquare02Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import {
  AppHeader,
  SidebarDrawer,
  SettingsMenuModal,
  EditAgentModal,
} from '@/components/common';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import { useChat } from '@/context/ChatContext';

export default function TabLayout() {
  const router = useRouter();

  // Active agent accent color (profile itself lives in AgentContext)
  const { agent } = useAgent();
  const {
    activeThreadId,
    createNewChat,
    clearActiveThreadMessages,
    deleteThread,
  } = useChat();

  const activePillStyle = { backgroundColor: `${agent.color}1F` };

  // Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Persistent App Header */}
      <AppHeader
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSettings={() => setIsSettingsMenuOpen(true)}
        onMascotPress={() => setIsEditAgentOpen(true)}
      />

      {/* 2. Expo Router Tabs Viewport */}
      <View style={styles.contentContainer}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarHideOnKeyboard: true,
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
          }}>
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="chat"
            options={{
              title: 'Discussion',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconPill, focused && activePillStyle]}>
                  <HugeiconsIcon
                    icon={Comment01Icon}
                    size={23}
                    color={focused ? agent.color : Colors.iconDark}
                    strokeWidth={focused ? 2.3 : 1.9}
                  />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="feed"
            options={{
              title: 'Flux',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconPill, focused && activePillStyle]}>
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={23}
                    color={focused ? agent.color : Colors.iconDark}
                    strokeWidth={focused ? 2.3 : 1.9}
                  />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="ideas"
            options={{
              title: 'Idées',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconPill, focused && activePillStyle]}>
                  <HugeiconsIcon
                    icon={Idea01Icon}
                    size={23}
                    color={focused ? agent.color : Colors.iconDark}
                    strokeWidth={focused ? 2.3 : 1.9}
                  />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="tasks"
            options={{
              title: 'Tâches',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconPill, focused && activePillStyle]}>
                  <HugeiconsIcon
                    icon={CheckmarkSquare02Icon}
                    size={23}
                    color={focused ? agent.color : Colors.iconDark}
                    strokeWidth={focused ? 2.3 : 1.9}
                  />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Paramètres',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconPill, focused && activePillStyle]}>
                  <HugeiconsIcon
                    icon={Settings02Icon}
                    size={23}
                    color={focused ? agent.color : Colors.iconDark}
                    strokeWidth={focused ? 2.3 : 1.9}
                  />
                </View>
              ),
            }}
          />
        </Tabs>
      </View>

      {/* 3. Left Sliding Sidebar Drawer */}
      <SidebarDrawer
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectChat={(_chatTitle) => {
          setIsSidebarOpen(false);
          router.replace('/(tabs)/chat' as any);
        }}
        onNewChat={async () => {
          setIsSidebarOpen(false);
          await createNewChat();
          router.replace('/(tabs)/chat' as any);
        }}
        onOpenHistory={() => {
          setIsSidebarOpen(false);
          router.push('/history' as any);
        }}
        onOpenSettings={() => {
          setIsSidebarOpen(false);
          router.replace('/(tabs)/settings' as any);
        }}
        onClearSideChats={() => {
          showToast('Side chats effacés');
        }}
      />

      {/* 4. Right 3-Dots Action Sheet */}
      <SettingsMenuModal
        visible={isSettingsMenuOpen}
        onClose={() => setIsSettingsMenuOpen(false)}
        onEditAvatar={() => setIsEditAgentOpen(true)}
        onRename={() => router.push('/history' as any)}
        onOpenHistory={() => router.push('/history' as any)}
        onClearChat={async () => {
          await clearActiveThreadMessages();
          showToast('Conversation effacée');
        }}
        onDeleteChat={async () => {
          await deleteThread(activeThreadId);
          showToast('Conversation supprimée');
        }}
        onShareChat={() => {
          showToast('Export créé');
        }}
      />

      {/* 5. Edit Mascot Avatar & Name Modal */}
      <EditAgentModal
        visible={isEditAgentOpen}
        onClose={() => setIsEditAgentOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    height: Platform.OS === 'ios' ? 84 : 70,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingTop: 8,
    paddingHorizontal: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  iconPill: {
    width: 58,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
