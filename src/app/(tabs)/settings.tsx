/**
 * Settings Tab Screen ('/(tabs)/settings')
 *
 * Clean settings & account management:
 * - User Profile display & editing (avatar selection among the 4 personas or custom photo)
 * - Free Plan progress card with theme color sync
 * - Interactive modals:
 *   1. UserProfileModal: Name & Avatar customization (4 official avatars + photo)
 *   2. AppearanceModal: Global theme color picker & live preview
 *   3. PricingModal: Plans comparison & upgrades
 *   4. NotificationsModal: Push and email preferences
 *   5. HelpModal: FAQ & feedback form
 *   6. ConnectorsModal: Composio MCP server apps
 * - 100% French interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Grid02Icon,
  Tag01Icon,
  Notification01Icon,
  PaintBrush01Icon,
  ArrowRight01Icon,
  HelpCircleIcon,
  Logout01Icon,
  UserIcon,
  Clock01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Image01Icon,
  Edit01Icon,
  SparklesIcon,
  CheckmarkBadge01Icon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { SETTINGS_PLAN_DATA } from '@/constants/dummyData';
import { AGENT_PERSONAS, AGENT_THEME_COLORS } from '@/constants/agentConfig';
import { showToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useAgent } from '@/context/AgentContext';
import { ConnectorsModal } from '@/components/common';

export default function SettingsScreen() {
  const { profile, user, signOut, updateUserProfile } = useAuth();
  const { agent, updateAgent } = useAgent();
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);

  // Modals state
  const [connectorsVisible, setConnectorsVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const [pricingVisible, setPricingVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // Profile modal edit states
  const displayName =
    profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur Tiboo';
  const displayEmail = profile?.email || user?.email || 'compte@tiboo.ai';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const [editName, setEditName] = useState(displayName);
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(avatarUrl || null);

  // Notification toggles state
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifTasks, setNotifTasks] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifSecurity, setNotifSecurity] = useState(true);

  // Help feedback state
  const [feedbackText, setFeedbackText] = useState('');

  const handleOpenProfileModal = () => {
    setEditName(displayName);
    setSelectedAvatarUri(avatarUrl || null);
    setProfileModalVisible(true);
  };

  const handlePickCustomPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedAvatarUri(result.assets[0].uri);
        showToast('Photo sélectionnée');
      }
    } catch {
      showToast('Impossible d’ouvrir la galerie');
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast('Le nom ne peut pas être vide');
      return;
    }
    await updateUserProfile({
      name: trimmed,
      avatar_url: selectedAvatarUri,
    });
    showToast('Profil mis à jour');
    setProfileModalVisible(false);
  };

  const handleSelectThemeColor = (color: string) => {
    updateAgent({
      ...agent,
      color,
    });
    showToast('Thème mis à jour sur toute l’application');
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      showToast('Déconnexion réussie');
      router.replace('/' as any);
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la déconnexion');
    } finally {
      setSigningOut(false);
    }
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) {
      showToast('Veuillez saisir votre message');
      return;
    }
    showToast('Merci pour vos commentaires !');
    setFeedbackText('');
    setHelpVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Paramètres</Text>
        </View>

        {/* 1. User Profile Card (Interactive) */}
        {(() => {
          const officialPersona = AGENT_PERSONAS.find(
            (p) => p.id === avatarUrl || p.name.toLowerCase() === avatarUrl?.toLowerCase()
          );
          const resolvedUserAvatarSource = officialPersona
            ? officialPersona.image
            : avatarUrl
              ? { uri: avatarUrl }
              : null;

          return (
            <TouchableOpacity
              style={styles.profileCard}
              onPress={handleOpenProfileModal}
              activeOpacity={0.8}
              accessibilityLabel="Modifier le profil">
              <View style={[styles.avatarContainer, { borderColor: agent.color }]}>
                {resolvedUserAvatarSource ? (
                  <Image source={resolvedUserAvatarSource} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: `${agent.color}18` }]}>
                    <HugeiconsIcon icon={UserIcon} size={24} color={agent.color} strokeWidth={2} />
                  </View>
                )}
                <View style={[styles.avatarEditBadge, { backgroundColor: agent.color }]}>
                  <HugeiconsIcon icon={Edit01Icon} size={12} color={Colors.white} strokeWidth={2.4} />
                </View>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={Colors.iconMuted} />
                </View>
                {displayEmail ? (
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                ) : null}
                <Text style={[styles.profileEditHint, { color: agent.color }]}>
                  Modifier le profil & l’avatar
                </Text>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* 2. Plan Usage Card (Synchronized with theme) */}
        <View style={styles.planCard}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>{SETTINGS_PLAN_DATA.planName}</Text>
            <Text style={styles.planUsageText}>{SETTINGS_PLAN_DATA.percentUsed} % utilisé</Text>
          </View>
          <Text style={styles.planResetText}>{SETTINGS_PLAN_DATA.resetText}</Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${SETTINGS_PLAN_DATA.percentUsed}%`, backgroundColor: agent.color },
              ]}
            />
          </View>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: agent.color }]}
            onPress={() => setPricingVisible(true)}
            activeOpacity={0.8}>
            <Text style={styles.upgradeBtnText}>Mettre à niveau</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Primary Group: Connectors, History & Pricing */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setConnectorsVisible(true)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={Grid02Icon} size={22} color={Colors.iconDark} strokeWidth={2} />
            </View>
            <Text style={styles.listLabel}>Connecteurs (Composio MCP)</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/history' as any)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={Clock01Icon} size={22} color={Colors.iconDark} strokeWidth={2} />
            </View>
            <Text style={styles.listLabel}>Historique des chats</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setPricingVisible(true)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={Tag01Icon} size={22} color={Colors.iconDark} strokeWidth={2} />
            </View>
            <Text style={styles.listLabel}>Tarifs & Abonnements</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* 4. Secondary Group: Preferences & Support */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setNotificationsVisible(true)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={Notification01Icon} size={22} color={Colors.iconDark} strokeWidth={2} />
            </View>
            <Text style={styles.listLabel}>Notifications</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setAppearanceVisible(true)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={PaintBrush01Icon} size={22} color={agent.color} strokeWidth={2} />
            </View>
            <View style={styles.labelWithBadge}>
              <Text style={styles.listLabel}>Apparence & Thème</Text>
              <View style={[styles.activeColorBadge, { backgroundColor: agent.color }]} />
            </View>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setHelpVisible(true)}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              <HugeiconsIcon icon={HelpCircleIcon} size={22} color={Colors.iconDark} strokeWidth={2} />
            </View>
            <Text style={styles.listLabel}>Aide et commentaires</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.65}>
            <View style={styles.listIconCol}>
              {signingOut ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <HugeiconsIcon icon={Logout01Icon} size={22} color={Colors.error} strokeWidth={2} />
              )}
            </View>
            <Text style={[styles.listLabel, { color: Colors.error }]}>
              {signingOut ? 'Déconnexion en cours...' : 'Se déconnecter'}
            </Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={Colors.iconMuted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: USER PROFILE & AVATAR EDIT */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setProfileModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardBox}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Modifier mon profil</Text>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setProfileModalVisible(false)}>
                      <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Live preview */}
                    {/* Live preview */}
                    {(() => {
                      const selectedPersona = AGENT_PERSONAS.find(
                        (p) => p.id === selectedAvatarUri || p.name.toLowerCase() === selectedAvatarUri?.toLowerCase()
                      );
                      const modalPreviewSource = selectedPersona
                        ? selectedPersona.image
                        : selectedAvatarUri
                          ? { uri: selectedAvatarUri }
                          : null;

                      return (
                        <View style={styles.modalPreviewSection}>
                          <View style={[styles.modalAvatarRing, { borderColor: agent.color }]}>
                            {modalPreviewSource ? (
                              <Image
                                source={modalPreviewSource}
                                style={styles.modalAvatarImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.modalAvatarImage,
                                  { backgroundColor: `${agent.color}20`, alignItems: 'center', justifyContent: 'center' },
                                ]}>
                                <HugeiconsIcon icon={UserIcon} size={34} color={agent.color} strokeWidth={2} />
                              </View>
                            )}
                          </View>
                          <Text style={styles.modalPreviewName}>{editName || 'Votre prénom'}</Text>
                        </View>
                      );
                    })()}

                    {/* Section 1: Choose from 4 official avatars */}
                    <Text style={styles.modalSectionLabel}>Choisir parmi les 4 avatars officiels</Text>
                    <View style={styles.personasAvatarRow}>
                      {AGENT_PERSONAS.map((p) => {
                        const isSelected =
                          selectedAvatarUri === p.id ||
                          selectedAvatarUri?.toLowerCase() === p.name.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.personaAvatarPickBtn,
                              isSelected && { borderColor: agent.color, borderWidth: 2 },
                            ]}
                            onPress={() => {
                              setSelectedAvatarUri(p.id);
                              showToast(`Avatar ${p.name} sélectionné`);
                            }}
                            activeOpacity={0.75}>
                            <Image source={p.image} style={styles.personaAvatarThumb} contentFit="cover" />
                            <Text style={styles.personaAvatarThumbName}>{p.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Section 2: Custom Photo Upload */}
                    <Text style={styles.modalSectionLabel}>Ou importer une image personnelle</Text>
                    <TouchableOpacity
                      style={styles.customUploadBtn}
                      onPress={handlePickCustomPhoto}
                      activeOpacity={0.8}>
                      <HugeiconsIcon icon={Image01Icon} size={20} color={agent.color} strokeWidth={2} />
                      <Text style={[styles.customUploadText, { color: agent.color }]}>
                        Sélectionner depuis la galerie
                      </Text>
                    </TouchableOpacity>

                    {/* Section 3: Name Input */}
                    <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Nom d’affichage</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Votre nom ou pseudo"
                      placeholderTextColor={Colors.iconMuted}
                      maxLength={40}
                    />

                    {/* Buttons */}
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        style={styles.modalCancelBtn}
                        onPress={() => setProfileModalVisible(false)}
                        activeOpacity={0.7}>
                        <Text style={styles.modalCancelText}>Annuler</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalSaveBtn, { backgroundColor: agent.color }]}
                        onPress={handleSaveProfile}
                        activeOpacity={0.85}>
                        <Text style={styles.modalSaveText}>Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: APPEARANCE & GLOBAL THEME */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={appearanceVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAppearanceVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setAppearanceVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Apparence & Thème</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setAppearanceVisible(false)}>
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Sélectionnez la couleur d’accent principale appliquée à toute l’application (boutons, onglets, bulles de discussion, bordures et indicateurs).
                </Text>

                {/* Swatches */}
                <View style={styles.themeSwatchesGrid}>
                  {AGENT_THEME_COLORS.map((color) => {
                    const isSelected = agent.color === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.themeSwatchItem,
                          { backgroundColor: color },
                          isSelected && styles.themeSwatchSelected,
                        ]}
                        onPress={() => handleSelectThemeColor(color)}
                        activeOpacity={0.8}>
                        {isSelected && (
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={18}
                            color={Colors.white}
                            strokeWidth={2.4}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Live Preview Box */}
                <View style={styles.themePreviewBox}>
                  <Text style={styles.themePreviewTitle}>Aperçu du thème sélectionné</Text>
                  <View style={styles.themePreviewRow}>
                    <View style={[styles.previewBubble, { backgroundColor: agent.color }]}>
                      <Text style={styles.previewBubbleText}>Bulle utilisateur</Text>
                    </View>
                    <View style={[styles.previewBadge, { backgroundColor: `${agent.color}20`, borderColor: agent.color }]}>
                      <Text style={[styles.previewBadgeText, { color: agent.color }]}>Badge actif</Text>
                    </View>
                    <View style={[styles.previewBtn, { backgroundColor: agent.color }]}>
                      <Text style={styles.previewBtnText}>Bouton CTA</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: agent.color, marginTop: 18 }]}
                  onPress={() => setAppearanceVisible(false)}
                  activeOpacity={0.85}>
                  <Text style={styles.modalSaveText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: PRICING & PLANS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={pricingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPricingVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPricingVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { maxHeight: '90%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tarifs & Abonnements</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setPricingVisible(false)}>
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Plan 1: Free */}
                  <View style={styles.pricingCard}>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingPlanName}>Forfait Gratuit</Text>
                      <Text style={styles.pricingPrice}>0 € / mois</Text>
                    </View>
                    <Text style={styles.pricingDesc}>Idéal pour découvrir les capacités de Tiboo.</Text>
                    <View style={styles.pricingFeatures}>
                      <Text style={styles.featureItem}>✓ 1 000 crédits d’exécution / semaine</Text>
                      <Text style={styles.featureItem}>✓ 1 agent autonome personnalisable</Text>
                      <Text style={styles.featureItem}>✓ Intégrations Composio MCP (Gmail, Notion)</Text>
                    </View>
                    <View style={styles.currentPlanTag}>
                      <Text style={styles.currentPlanTagText}>Forfait actuel</Text>
                    </View>
                  </View>

                  {/* Plan 2: Pro */}
                  <View style={[styles.pricingCard, styles.pricingCardPro, { borderColor: agent.color }]}>
                    <View style={[styles.recommendedBadge, { backgroundColor: agent.color }]}>
                      <Text style={styles.recommendedBadgeText}>RECOMMANDÉ</Text>
                    </View>
                    <View style={styles.pricingHeader}>
                      <Text style={[styles.pricingPlanName, { color: agent.color }]}>Forfait Pro</Text>
                      <Text style={styles.pricingPrice}>19 € / mois</Text>
                    </View>
                    <Text style={styles.pricingDesc}>Pour automatiser tout votre quotidien en continu.</Text>
                    <View style={styles.pricingFeatures}>
                      <Text style={styles.featureItem}>✓ Crédits et exécutions illimités</Text>
                      <Text style={styles.featureItem}>✓ Navigateur cloud haute vitesse Stagehand</Text>
                      <Text style={styles.featureItem}>✓ Jusqu’à 4 agents autonomes simultanés</Text>
                      <Text style={styles.featureItem}>✓ Routines pg_cron en arrière-plan 24/7</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: agent.color }]}
                      onPress={() => {
                        showToast('Redirection vers le paiement sécurisé Stripe');
                        setPricingVisible(false);
                      }}
                      activeOpacity={0.85}>
                      <Text style={styles.modalSaveText}>Passer à l’offre Pro</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Plan 3: Team */}
                  <View style={styles.pricingCard}>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingPlanName}>Forfait Équipe</Text>
                      <Text style={styles.pricingPrice}>49 € / mois</Text>
                    </View>
                    <Text style={styles.pricingDesc}>Pour les équipes, startups et agences.</Text>
                    <View style={styles.pricingFeatures}>
                      <Text style={styles.featureItem}>✓ Tout le forfait Pro inclus</Text>
                      <Text style={styles.featureItem}>✓ Espaces collaboratifs partagés</Text>
                      <Text style={styles.featureItem}>✓ Connecteurs personnalisés & webhooks</Text>
                      <Text style={styles.featureItem}>✓ Support prioritaire 7j/7</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.secondaryPlanBtn}
                      onPress={() => {
                        showToast('Contacter l’équipe commerciale');
                        setPricingVisible(false);
                      }}
                      activeOpacity={0.8}>
                      <Text style={styles.secondaryPlanBtnText}>Contacter l’équipe</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: NOTIFICATIONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setNotificationsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Notifications</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setNotificationsVisible(false)}>
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Configurez la réception de vos alertes et synthèses d’activité.
                </Text>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Rappels quotidiens d’objectifs</Text>
                    <Text style={styles.toggleDesc}>Recevez un point matinal de votre agent.</Text>
                  </View>
                  <Switch
                    value={notifDaily}
                    onValueChange={setNotifDaily}
                    trackColor={{ false: Colors.border, true: agent.color }}
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Alertes d’exécutions de tâches</Text>
                    <Text style={styles.toggleDesc}>Notification dès qu'une routine pg_cron se termine.</Text>
                  </View>
                  <Switch
                    value={notifTasks}
                    onValueChange={setNotifTasks}
                    trackColor={{ false: Colors.border, true: agent.color }}
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Rapports hebdomadaires</Text>
                    <Text style={styles.toggleDesc}>Bilan complet de productivité chaque dimanche.</Text>
                  </View>
                  <Switch
                    value={notifWeekly}
                    onValueChange={setNotifWeekly}
                    trackColor={{ false: Colors.border, true: agent.color }}
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Sécurité & Connecteurs</Text>
                    <Text style={styles.toggleDesc}>Alertes d’accès externe et autorisations MCP.</Text>
                  </View>
                  <Switch
                    value={notifSecurity}
                    onValueChange={setNotifSecurity}
                    trackColor={{ false: Colors.border, true: agent.color }}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: agent.color, marginTop: 16 }]}
                  onPress={() => {
                    showToast('Préférences de notifications enregistrées');
                    setNotificationsVisible(false);
                  }}
                  activeOpacity={0.85}>
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: HELP & FEEDBACK */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setHelpVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { maxHeight: '90%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Aide & Commentaires</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setHelpVisible(false)}>
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalSectionLabel}>Questions fréquentes</Text>
                  <View style={styles.faqCard}>
                    <Text style={styles.faqQuestion}>Comment connecter mes outils (Gmail, Notion) ?</Text>
                    <Text style={styles.faqAnswer}>
                      Rendez-vous dans la rubrique « Connecteurs (Composio MCP) » et activez les applications autorisées en 1 clic.
                    </Text>
                  </View>

                  <View style={styles.faqCard}>
                    <Text style={styles.faqQuestion}>Comment fonctionnent les tâches en arrière-plan ?</Text>
                    <Text style={styles.faqAnswer}>
                      Tiboo s'appuie sur le moteur pg_cron de Supabase pour déclencher automatiquement vos routines à l’horaire souhaité, même lorsque l’application est fermée.
                    </Text>
                  </View>

                  <View style={styles.faqCard}>
                    <Text style={styles.faqQuestion}>Puis-je changer d’avatar ou de prénom d’agent ?</Text>
                    <Text style={styles.faqAnswer}>
                      Oui ! Touchez l’avatar de l'agent en haut de l'écran ou ouvrez « Modifier l'agent » pour choisir parmi Léo, Chloé, Amir ou Kaya.
                    </Text>
                  </View>

                  <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Envoyer vos commentaires</Text>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Une suggestion, une remarque ou un problème rencontré ?"
                    placeholderTextColor={Colors.iconMuted}
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    multiline
                    numberOfLines={4}
                  />

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { backgroundColor: agent.color, marginTop: 14 }]}
                    onPress={handleSendFeedback}
                    activeOpacity={0.85}>
                    <Text style={styles.modalSaveText}>Envoyer les commentaires</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Composio Connectors Modal */}
      <ConnectorsModal
        visible={connectorsVisible}
        onClose={() => setConnectorsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    fontSize: 16.5,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileEditHint: {
    fontSize: 11.5,
    fontFamily: Typography.semibold,
    marginTop: 4,
  },
  planCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.2,
  },
  planUsageText: {
    fontSize: 13.5,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
  },
  planResetText: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  upgradeBtn: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    fontSize: 14.5,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listIconCol: {
    width: 32,
    alignItems: 'flex-start',
  },
  listLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.iconDark,
    letterSpacing: -0.1,
  },
  labelWithBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeColorBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 48,
  },
  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalKeyboardBox: {
    width: '100%',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 24,
    padding: 22,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 13.5,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalPreviewSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  modalAvatarRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2.5,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  modalPreviewName: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  personasAvatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  personaAvatarPickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderRadius: 14,
  },
  personaAvatarThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
  },
  personaAvatarThumbName: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  customUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  customUploadText: {
    fontSize: 13.5,
    fontFamily: Typography.semibold,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.iconDark,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  modalSaveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  // Theme Swatches
  themeSwatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 10,
    justifyContent: 'center',
  },
  themeSwatchItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  themePreviewBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  themePreviewTitle: {
    fontSize: 12,
    fontFamily: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  themePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewBubble: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  previewBubbleText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bold,
  },
  previewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  previewBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Typography.bold,
  },
  // Pricing Card
  pricingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pricingCardPro: {
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recommendedBadgeText: {
    color: Colors.white,
    fontSize: 9.5,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pricingPlanName: {
    fontSize: 16,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  pricingPrice: {
    fontSize: 15,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  pricingDesc: {
    fontSize: 12.5,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  pricingFeatures: {
    gap: 4,
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 12.5,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
    lineHeight: 18,
  },
  currentPlanTag: {
    backgroundColor: Colors.borderLight,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanTagText: {
    fontSize: 12.5,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
  },
  secondaryPlanBtn: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryPlanBtnText: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  // Notifications
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.iconDark,
  },
  toggleDesc: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Help & Feedback
  faqCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  faqQuestion: {
    fontSize: 13.5,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 12.5,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  feedbackInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
