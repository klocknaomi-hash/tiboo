/**
 * EditAgentModal Component
 *
 * Agent personalization modal:
 * - Live avatar preview
 * - Selection among the 4 OFFICIAL PERSONAS (Léo, Chloé, Amir, Kaya) without duplicates
 * - Distinct, dedicated section for custom photo upload with preview and removal
 * - Name, role/specialty, and greeting message customization
 * - Centralized theme accent color picker
 * - Reset to defaults, Cancel & Save actions
 * - 100% French interface
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Image01Icon,
  Delete02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { AGENT_PERSONAS, AGENT_THEME_COLORS } from '@/constants/agentConfig';
import MascotAvatar from './MascotAvatar';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import { AgentAvatar } from '@/types';

export interface EditAgentModalProps {
  visible: boolean;
  onClose: () => void;
}

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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAvatar({ type: 'photo', uri: result.assets[0].uri });
        showToast('Photo sélectionnée avec succès');
      }
    } catch {
      showToast('Impossible d’ouvrir la galerie');
    }
  };

  const handleRemovePhoto = () => {
    const defaultPersona = AGENT_PERSONAS[0];
    setAvatar({ type: 'persona', id: defaultPersona.id });
    setName(defaultPersona.name);
    setSubtitle(defaultPersona.role || 'Agent Autonome');
    showToast('Photo personnalisée retirée');
  };

  const handleSelectPersona = (personaId: string) => {
    const persona = AGENT_PERSONAS.find((p) => p.id === personaId) || AGENT_PERSONAS[0];
    setAvatar({ type: 'persona', id: persona.id });
    setName(persona.name);
    if (persona.role) {
      setSubtitle(persona.role);
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Le nom de l’agent ne peut pas être vide');
      return;
    }

    updateAgent({
      name: trimmed,
      subtitle: subtitle.trim(),
      greeting: greeting.trim() || agent.greeting,
      avatar,
      color: selectedColor,
    });
    showToast('Agent mis à jour');
    onClose();
  };

  const handleReset = () => {
    resetAgent();
    showToast('Agent réinitialisé');
    onClose();
  };

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
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerTitleRow}>
                    <HugeiconsIcon icon={SparklesIcon} size={18} color={selectedColor} strokeWidth={2} />
                    <Text style={styles.title}>Personnaliser l’agent</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                    accessibilityLabel="Fermer">
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
                        size={76}
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

                  {/* Section 1: Les 4 Avatars Officiels */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>Avatars officiels</Text>
                    <Text style={styles.sectionHint}>4 profils créés pour Tiboo</Text>
                  </View>

                  <View style={styles.personasGrid}>
                    {AGENT_PERSONAS.map((p) => {
                      const isSelected = avatar.type === 'persona' && avatar.id === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[
                            styles.personaCard,
                            isSelected && [styles.personaCardSelected, { borderColor: selectedColor }],
                          ]}
                          onPress={() => handleSelectPersona(p.id)}
                          activeOpacity={0.8}>
                          <View style={styles.personaImageWrap}>
                            <Image
                              source={p.image}
                              style={styles.personaImage}
                              contentFit="cover"
                              transition={150}
                            />
                            {isSelected && (
                              <View style={[styles.selectedCheckmark, { backgroundColor: selectedColor }]}>
                                <HugeiconsIcon
                                  icon={CheckmarkCircle02Icon}
                                  size={14}
                                  color={Colors.white}
                                  strokeWidth={2.4}
                                />
                              </View>
                            )}
                          </View>
                          <Text style={[styles.personaName, isSelected && { color: selectedColor }]}>
                            {p.name}
                          </Text>
                          {p.role ? (
                            <Text style={styles.personaRole} numberOfLines={1}>
                              {p.role.split('&')[0].trim()}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Section 2: Option distincte — Photo personnalisée */}
                  <View style={styles.customPhotoSection}>
                    <Text style={styles.sectionLabel}>Photo personnalisée</Text>
                    {avatar.type === 'photo' ? (
                      <View style={styles.photoActiveCard}>
                        <Image
                          source={{ uri: avatar.uri }}
                          style={styles.customPhotoThumb}
                          contentFit="cover"
                        />
                        <View style={styles.photoActionsCol}>
                          <Text style={styles.photoActiveTitle}>Photo importée active</Text>
                          <View style={styles.photoButtonsRow}>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, { borderColor: selectedColor }]}
                              onPress={handlePickPhoto}
                              activeOpacity={0.7}>
                              <HugeiconsIcon icon={Image01Icon} size={14} color={selectedColor} />
                              <Text style={[styles.smallActionText, { color: selectedColor }]}>
                                Changer
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, styles.deleteActionBtn]}
                              onPress={handleRemovePhoto}
                              activeOpacity={0.7}>
                              <HugeiconsIcon icon={Delete02Icon} size={14} color={Colors.error} />
                              <Text style={[styles.smallActionText, { color: Colors.error }]}>
                                Retirer
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadPhotoBtn}
                        onPress={handlePickPhoto}
                        activeOpacity={0.75}>
                        <View style={styles.uploadIconCircle}>
                          <HugeiconsIcon icon={Image01Icon} size={18} color={Colors.iconDark} strokeWidth={2} />
                        </View>
                        <View style={styles.uploadTextCol}>
                          <Text style={styles.uploadTitle}>Importer une image personnelle</Text>
                          <Text style={styles.uploadSubtitle}>Depuis la galerie de votre appareil</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Form Inputs */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Prénom / Nom de l’agent</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Ex : Léo"
                      placeholderTextColor={Colors.iconMuted}
                      maxLength={30}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Rôle / Spécialité</Text>
                    <TextInput
                      style={styles.input}
                      value={subtitle}
                      onChangeText={setSubtitle}
                      placeholder="Ex : Stratégie & Projets"
                      placeholderTextColor={Colors.iconMuted}
                      maxLength={40}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Message d’accueil</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={greeting}
                      onChangeText={setGreeting}
                      placeholder="Premier message envoyé par votre agent"
                      placeholderTextColor={Colors.iconMuted}
                      multiline
                      maxLength={240}
                    />
                  </View>

                  {/* Theme Accent Color */}
                  <View style={styles.colorGroup}>
                    <Text style={styles.label}>Thème de couleur</Text>
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
                            activeOpacity={0.8}
                            accessibilityLabel={`Couleur ${color}`}>
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

                  <TouchableOpacity
                    onPress={handleReset}
                    activeOpacity={0.7}
                    style={styles.resetBtn}>
                    <Text style={styles.resetText}>Rétablir les paramètres par défaut</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: selectedColor }]}
                    onPress={handleSave}
                    activeOpacity={0.8}>
                    <Text style={styles.saveText}>Enregistrer</Text>
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
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    marginBottom: 14,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 48,
    borderWidth: 2.5,
  },
  previewName: {
    marginTop: 8,
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  previewSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontFamily: Typography.medium,
    color: Colors.iconMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: Typography.regular,
    color: Colors.iconMuted,
  },
  personasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  personaCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personaCardSelected: {
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  personaImageWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  personaImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceMuted,
  },
  selectedCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  personaName: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  personaRole: {
    fontSize: 11,
    fontFamily: Typography.regular,
    color: Colors.iconMuted,
    marginTop: 1,
  },
  customPhotoSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 12,
  },
  uploadIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextCol: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 13.5,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  uploadSubtitle: {
    fontSize: 11.5,
    fontFamily: Typography.regular,
    color: Colors.iconMuted,
    marginTop: 1,
  },
  photoActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 14,
    marginTop: 6,
    gap: 12,
  },
  customPhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceMuted,
  },
  photoActionsCol: {
    flex: 1,
  },
  photoActiveTitle: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
    marginBottom: 6,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
  },
  deleteActionBtn: {
    borderColor: Colors.border,
  },
  smallActionText: {
    fontSize: 11.5,
    fontFamily: Typography.semibold,
  },
  inputGroup: {
    marginTop: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 11.5,
    fontFamily: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    fontFamily: Typography.medium,
    color: Colors.iconDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 62,
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
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  resetText: {
    fontSize: 12.5,
    fontFamily: Typography.semibold,
    color: Colors.iconMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
});

export default EditAgentModal;
