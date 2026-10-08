/**
 * EditAgentModal Component
 *
 * Agent personalization modal:
 * - Live avatar preview
 * - Avatar picker: 3D mascot, initials, emoji, or photo from the gallery
 * - Agent name, role and greeting inputs
 * - Accent color selector
 * - Reset to defaults, Cancel & Save actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, CheckmarkCircle02Icon, Image01Icon } from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { AGENT_EMOJI_AVATARS, AGENT_THEME_COLORS } from '@/constants/agentConfig';
import MascotAvatar from './MascotAvatar';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import { AgentAvatar } from '@/types';

export interface EditAgentModalProps {
  visible: boolean;
  onClose: () => void;
}

const isSameAvatar = (a: AgentAvatar, b: AgentAvatar) =>
  a.type === b.type &&
  (a.type !== 'emoji' || a.value === (b as typeof a).value) &&
  (a.type !== 'photo' || a.uri === (b as typeof a).uri);

export const EditAgentModal: React.FC<EditAgentModalProps> = ({ visible, onClose }) => {
  const { agent, updateAgent, resetAgent } = useAgent();
  const [name, setName] = useState(agent.name);
  const [subtitle, setSubtitle] = useState(agent.subtitle);
  const [greeting, setGreeting] = useState(agent.greeting);
  const [avatar, setAvatar] = useState<AgentAvatar>(agent.avatar);
  const [selectedColor, setSelectedColor] = useState(agent.color);

  useEffect(() => {
    if (visible) {
      setName(agent.name);
      setSubtitle(agent.subtitle);
      setGreeting(agent.greeting);
      setAvatar(agent.avatar);
      setSelectedColor(agent.color);
    }
  }, [visible, agent]);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatar({ type: 'photo', uri: result.assets[0].uri });
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    updateAgent({
      name: trimmed,
      subtitle: subtitle.trim(),
      greeting: greeting.trim() || agent.greeting,
      avatar,
      color: selectedColor,
    });
    showToast('Agent updated');
    onClose();
  };

  const handleReset = () => {
    resetAgent();
    showToast('Agent reset');
    onClose();
  };

  const avatarOptions: AgentAvatar[] = [
    { type: 'mascot' },
    { type: 'initials' },
    ...AGENT_EMOJI_AVATARS.map((value): AgentAvatar => ({ type: 'emoji', value })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                {/* Header with Close */}
                <View style={styles.header}>
                  <Text style={styles.title}>Edit Agent</Text>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}>
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  {/* Live Avatar Preview */}
                  <View style={styles.avatarSection}>
                    <View style={[styles.avatarRing, { borderColor: selectedColor }]}>
                      <MascotAvatar
                        size={72}
                        avatar={avatar}
                        name={name || '?'}
                        color={selectedColor}
                      />
                    </View>
                    <Text style={styles.previewName}>{name.trim() || 'Agent'}</Text>
                    {!!subtitle.trim() && (
                      <Text style={styles.previewSubtitle}>{subtitle.trim()}</Text>
                    )}
                  </View>

                  {/* Avatar Picker */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Avatar</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.avatarRow}>
                      <TouchableOpacity
                        style={[
                          styles.avatarOption,
                          styles.photoOption,
                          avatar.type === 'photo' && { borderColor: selectedColor },
                        ]}
                        onPress={handlePickPhoto}
                        activeOpacity={0.8}>
                        {avatar.type === 'photo' ? (
                          <MascotAvatar size={40} avatar={avatar} />
                        ) : (
                          <HugeiconsIcon icon={Image01Icon} size={20} color={Colors.iconDark} />
                        )}
                      </TouchableOpacity>
                      {avatarOptions.map((option, index) => {
                        const isSelected = isSameAvatar(option, avatar);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.avatarOption,
                              isSelected && { borderColor: selectedColor },
                            ]}
                            onPress={() => setAvatar(option)}
                            activeOpacity={0.8}>
                            <MascotAvatar
                              size={40}
                              avatar={option}
                              name={name || '?'}
                              color={selectedColor}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Agent name"
                      placeholderTextColor={Colors.iconMuted}
                      maxLength={30}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Role Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Role</Text>
                    <TextInput
                      style={styles.input}
                      value={subtitle}
                      onChangeText={setSubtitle}
                      placeholder="e.g. Fitness coach, Study buddy"
                      placeholderTextColor={Colors.iconMuted}
                      maxLength={40}
                    />
                  </View>

                  {/* Greeting Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Greeting message</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={greeting}
                      onChangeText={setGreeting}
                      placeholder="First message your agent sends"
                      placeholderTextColor={Colors.iconMuted}
                      multiline
                      maxLength={240}
                    />
                  </View>

                  {/* Theme Color Dots */}
                  <View style={styles.colorGroup}>
                    <Text style={styles.label}>Theme</Text>
                    <View style={styles.colorRow}>
                      {AGENT_THEME_COLORS.map((color) => {
                        const isSelected = selectedColor === color;
                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorDot,
                              { backgroundColor: color },
                              isSelected && styles.colorDotSelected,
                            ]}
                            onPress={() => setSelectedColor(color)}
                            activeOpacity={0.8}>
                            {isSelected && (
                              <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={14}
                                color={Colors.white}
                                strokeWidth={2.5}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.resetBtn}>
                    <Text style={styles.resetText}>Reset to default</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: selectedColor }]}
                    onPress={handleSave}
                    activeOpacity={0.8}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.iconDark,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 42,
    borderWidth: 2.5,
  },
  previewName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.iconDark,
  },
  previewSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.iconMuted,
  },
  avatarRow: {
    gap: 8,
    paddingVertical: 2,
  },
  avatarOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOption: {
    backgroundColor: '#F3F4F6',
  },
  inputGroup: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.iconMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.iconDark,
    borderWidth: 1,
    borderColor: '#ECEEF0',
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  colorGroup: {
    marginTop: 8,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginBottom: 12,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.iconMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.iconDark,
  },
  saveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default EditAgentModal;
