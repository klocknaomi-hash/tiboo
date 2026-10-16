/**
 * Tasks Tab Screen ('/(tabs)/tasks')
 *
 * Autonomous Agent Scheduler & Goal Manager:
 * - Real-time sync with Supabase tables "scheduled_tasks" and "task_executions"
 * - Segmented tab switcher: "Tâches planifiées" vs "Historique des exécutions"
 * - Active / Paused toggle per task (updates Supabase is_active)
 * - "Run Now" manual trigger (records execution to task_executions & updates next_run_at)
 * - Detailed execution history with status chips, result preview & modal details
 * - "+ New Task" modal with frequency presets (daily, weekdays, weekly, custom cron)
 * - Pull-to-refresh support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Add01Icon,
  Target01Icon,
  Clock01Icon,
  PlayIcon,
  Delete02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  ArrowReloadHorizontalIcon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography } from '@/constants/theme';
import { ScheduledTask, TaskExecution, TaskExecutionStatus } from '@/types';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';
import {
  getScheduledTasks,
  toggleScheduledTask,
  deleteScheduledTask,
  createScheduledTask,
  getTaskExecutions,
  executeScheduledTaskNow,
} from '@/lib/taskService';
import {
  formatCronToHuman,
  getUserTimezone,
  isValidCron,
} from '@/lib/cronUtils';

export default function TasksScreen() {
  const { agent } = useAgent();
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);

  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  // New Task Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekdays' | 'weekly' | 'hourly' | 'fifteen' | 'custom'>('daily');
  const [newTime, setNewTime] = useState('09:00');
  const [newCustomCron, setNewCustomCron] = useState('0 9 * * *');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Execution Details Modal state
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);

  // Load data from Supabase / local cache
  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedExecs] = await Promise.all([
        getScheduledTasks(),
        getTaskExecutions(),
      ]);
      setTasks(fetchedTasks);
      setExecutions(fetchedExecs);
    } catch (err) {
      console.warn('[TasksScreen] Error loading data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    showToast('Données à jour');
  };

  // Toggle active / paused
  const handleToggle = async (task: ScheduledTask) => {
    const nextState = !task.is_active;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, is_active: nextState, status: nextState ? 'active' : 'paused' }
          : t
      )
    );

    try {
      await toggleScheduledTask(task.id, nextState);
      showToast(nextState ? `Routine "${task.title}" activée` : `Routine "${task.title}" en pause`);
    } catch {
      showToast('Erreur lors de la mise à jour du statut');
      await loadData();
    }
  };

  // Delete task
  const handleDeleteTask = (task: ScheduledTask) => {
    const confirmDelete = async () => {
      try {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        await deleteScheduledTask(task.id);
        showToast(`Tâche "${task.title}" supprimée`);
      } catch {
        showToast('Erreur lors de la suppression');
        await loadData();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer la routine "${task.title || task.instruction}" ?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la tâche',
        `Es-tu sûr de vouloir supprimer "${task.title || task.instruction}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Manual Trigger Run
  const handleRunTask = async (task: ScheduledTask) => {
    if (runningTaskId) return;
    setRunningTaskId(task.id);
    showToast(`Exécution de « ${task.title} »…`);

    try {
      const outcome = await executeScheduledTaskNow(task);
      await loadData();
      showToast(
        outcome.status === 'completed'
          ? `« ${task.title} » exécutée.`
          : `Échec : ${outcome.message}`
      );
    } catch (err: any) {
      showToast(err?.message || 'Échec de l’exécution');
      await loadData();
    } finally {
      setRunningTaskId(null);
    }
  };

  // Compute cron expression from form inputs
  const computeFormCron = (): string => {
    if (newFrequency === 'custom') {
      return isValidCron(newCustomCron) ? newCustomCron.trim() : '0 9 * * *';
    }

    const [h, m] = newTime.split(':').map((s) => parseInt(s, 10));
    const hour = !isNaN(h) && h >= 0 && h <= 23 ? h : 9;
    const min = !isNaN(m) && m >= 0 && m <= 59 ? m : 0;

    switch (newFrequency) {
      case 'daily':
        return `${min} ${hour} * * *`;
      case 'weekdays':
        return `${min} ${hour} * * 1-5`;
      case 'weekly':
        return `${min} ${hour} * * 0`; // Sunday
      case 'hourly':
        return '0 * * * *';
      case 'fifteen':
        return '*/15 * * * *';
      default:
        return '0 9 * * *';
    }
  };

  // Preset button click
  const applyPreset = (preset: {
    title: string;
    instruction: string;
    freq: 'daily' | 'weekdays' | 'weekly' | 'hourly' | 'fifteen';
    time: string;
  }) => {
    setNewTitle(preset.title);
    setNewInstruction(preset.instruction);
    setNewFrequency(preset.freq);
    setNewTime(preset.time);
  };

  // Create new task submit
  const handleCreateTask = async () => {
    if (!newInstruction.trim()) {
      showToast('Veuillez renseigner l’instruction pour l’agent');
      return;
    }

    setIsSubmitting(true);
    const schedule = computeFormCron();
    const title = newTitle.trim() || newInstruction.trim().slice(0, 36);

    try {
      const created = await createScheduledTask({
        title,
        instruction: newInstruction.trim(),
        schedule,
        timezone: getUserTimezone(),
        is_active: true,
      });

      setTasks((prev) => [created, ...prev]);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewInstruction('');
      setNewFrequency('daily');
      setNewTime('09:00');
      showToast(`Routine "${created.title}" planifiée avec succès !`);
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date helper
  const formatDateDisplay = (isoString?: string | null) => {
    if (!isoString) return 'Jamais';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Jamais';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeCount = tasks.filter((t) => t.is_active).length;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.pageTitle}>Tâches & Automatisations</Text>
          <Text style={styles.pageSubtitle}>
            Routines exécutées automatiquement par ton agent
          </Text>
        </View>

        <TouchableOpacity
          style={[[styles.newGoalBtn, { backgroundColor: theme.accent }], { backgroundColor: agent.color }]}
          onPress={() => setIsNewModalOpen(true)}
          activeOpacity={0.85}>
          <HugeiconsIcon icon={Add01Icon} size={15} color={Colors.white} strokeWidth={2.4} />
          <Text style={styles.newGoalText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Pill Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'tasks' && [
              styles.switchTabActive,
              { backgroundColor: `${agent.color}15`, borderColor: agent.color },
            ],
          ]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.switchTabText,
              activeTab === 'tasks' && [styles.switchTabTextActive, { color: agent.color }],
            ]}>
            Tâches actives ({activeCount}/{tasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'history' && [
              styles.switchTabActive,
              { backgroundColor: `${agent.color}15`, borderColor: agent.color },
            ],
          ]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.switchTabText,
              activeTab === 'history' && [styles.switchTabTextActive, { color: agent.color }],
            ]}>
            Historique ({executions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }>
          {activeTab === 'tasks' ? (
            /* TAB 1: SCHEDULED TASKS LIST */
            tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBadge}>
                  <HugeiconsIcon icon={Target01Icon} size={32} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Aucune routine planifiée</Text>
                <Text style={styles.emptySubtitle}>
                  Demande dans le chat (ex: "Vérifie mon Gmail tous les jours à 9h") ou clique sur "+ Nouveau".
                </Text>
                <TouchableOpacity
                  style={[[styles.emptyActionBtn, { backgroundColor: theme.accent }], { backgroundColor: agent.color }]}
                  onPress={() => setIsNewModalOpen(true)}>
                  <HugeiconsIcon icon={Add01Icon} size={16} color={Colors.white} strokeWidth={2.2} />
                  <Text style={styles.emptyActionText}>Créer une automatisation</Text>
                </TouchableOpacity>
              </View>
            ) : (
              tasks.map((task) => {
                const isActive = task.is_active;
                const isRunning = runningTaskId === task.id;

                return (
                  <View key={task.id} style={styles.card}>
                    {/* Top Status & Controls Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusPill,
                            isActive ? styles.statusPillActive : styles.statusPillPaused,
                          ]}>
                          <View
                            style={[
                              styles.statusDot,
                              isActive ? styles.statusDotActive : styles.statusDotPaused,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusPillText,
                              isActive ? styles.statusPillTextActive : styles.statusPillTextPaused,
                            ]}>
                            {isActive ? 'Actif' : 'En pause'}
                          </Text>
                        </View>

                        <View style={styles.cronBadge}>
                          <HugeiconsIcon icon={Clock01Icon} size={11} color={Colors.textSecondary} />
                          <Text style={styles.cronBadgeText}>{task.schedule}</Text>
                        </View>
                      </View>

                      {/* Right Switch with active theme color */}
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggle(task)}
                        trackColor={{ false: Colors.border, true: agent.color }}
                        thumbColor={Colors.white}
                        ios_backgroundColor={Colors.border}
                        {...({ activeThumbColor: Colors.white } as object)}
                      />
                    </View>

                    {/* Title & Instruction */}
                    <View style={styles.cardBody}>
                      <Text style={[styles.taskTitle, !isActive && styles.pausedText]}>
                        {task.title || 'Automatisation sans titre'}
                      </Text>
                      <Text style={styles.taskInstruction}>{task.instruction}</Text>
                    </View>

                    {/* Meta Timing Row */}
                    <View style={styles.metaBox}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Fréquence :</Text>
                        <Text style={styles.metaValue}>
                           {formatCronToHuman(task.schedule)}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Prochaine exécution :</Text>
                        <Text style={styles.metaValue}>
                          {formatDateDisplay(task.next_run_at)}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Dernier passage :</Text>
                        <Text style={styles.metaValue}>
                          {formatDateDisplay(task.last_run_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Footer Actions Row */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteTask(task)}
                        activeOpacity={0.7}>
                        <HugeiconsIcon icon={Delete02Icon} size={15} color={Colors.textMuted} />
                        <Text style={styles.deleteBtnText}>Supprimer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[[styles.runBtn, { backgroundColor: theme.accent }], { backgroundColor: agent.color }, isRunning && styles.runBtnDisabled]}
                        onPress={() => handleRunTask(task)}
                        disabled={isRunning}
                        activeOpacity={0.8}>
                        {isRunning ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <HugeiconsIcon icon={PlayIcon} size={13} color={Colors.white} strokeWidth={2.4} />
                        )}
                        <Text style={styles.runBtnText}>
                          {isRunning ? 'Exécution...' : 'Lancer maintenant'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          ) : (
            /* TAB 2: EXECUTION HISTORY LIST */
            executions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBadge}>
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={32} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Aucune exécution enregistrée</Text>
                <Text style={styles.emptySubtitle}>
                  Les exécutions automatiques et manuelles apparaîtront ici.
                </Text>
              </View>
            ) : (
              executions.map((exec) => {
                const isCompleted = exec.status === 'completed';
                const isFailed = exec.status === 'failed';
                const isRunning = exec.status === 'running';

                const statusLabel = isCompleted
                  ? 'Complété'
                  : isFailed
                  ? 'Échec'
                  : isRunning
                  ? 'En cours'
                  : 'En attente';

                return (
                  <TouchableOpacity
                    key={exec.id}
                    style={styles.historyCard}
                    onPress={() => setSelectedExecution(exec)}
                    activeOpacity={0.85}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyTitleRow}>
                        <Text style={styles.historyTitle}>
                          {exec.task_title || 'Routine planifiée'}
                        </Text>
                        <Text style={styles.historyDate}>
                          {formatDateDisplay(exec.created_at)}
                        </Text>
                      </View>

                      {/* Status Chip */}
                      <View
                        style={[
                          styles.historyChip,
                          isCompleted && styles.historyChipSuccess,
                          isFailed && styles.historyChipFailed,
                          isRunning && [styles.historyChipRunning, { backgroundColor: theme.accentSubtle }],
                        ]}>
                        <HugeiconsIcon
                          icon={
                            isCompleted
                              ? CheckmarkCircle02Icon
                              : isFailed
                              ? AlertCircleIcon
                              : Clock01Icon
                          }
                          size={12}
                          color={
                            isCompleted
                              ? '#16A34A'
                              : isFailed
                              ? '#DC2626'
                              : theme.accent
                          }
                        />
                        <Text
                          style={[
                            styles.historyChipText,
                            isCompleted && styles.historyChipTextSuccess,
                            isFailed && styles.historyChipTextFailed,
                            isRunning && [styles.historyChipTextRunning, { color: theme.accent }],
                          ]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Result Summary Excerpt */}
                    {exec.result?.summary ? (
                      <View style={styles.historyResultBox}>
                        <Text style={styles.historyResultText} numberOfLines={2}>
                          {exec.result.summary}
                        </Text>
                      </View>
                    ) : exec.result?.message ? (
                      <View style={styles.historyResultBox}>
                        <Text style={styles.historyResultText} numberOfLines={2}>
                          {exec.result.message}
                        </Text>
                      </View>
                    ) : null}

                    {/* Error Banner if Failed */}
                    {exec.error && (
                      <View style={styles.historyErrorBox}>
                        <Text style={styles.historyErrorText} numberOfLines={2}>
                          Erreur : {exec.error}
                        </Text>
                      </View>
                    )}

                    <View style={styles.historyFooter}>
                      <Text style={[styles.historyDetailLink, { color: theme.accent }]}>Voir les détails de l'exécution →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          )}
        </ScrollView>
      )}

      {/* MODAL: CREATE NEW SCHEDULED TASK */}
      <Modal
        visible={isNewModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle tâche planifiée</Text>
              <TouchableOpacity
                onPress={() => setIsNewModalOpen(false)}
                style={styles.modalCloseBtn}>
                <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Quick Presets */}
              <Text style={styles.inputSectionLabel}>Modèles rapides (1 tap)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    applyPreset({
                      title: 'Vérification Gmail',
                      instruction: 'Consulte mes 5 derniers emails sur Gmail et résume les urgences.',
                      freq: 'daily',
                      time: '09:00',
                    })
                  }>
                  <Text style={styles.presetChipText}>📬 Gmail 9h</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    applyPreset({
                      title: 'Morning Briefing',
                      instruction: 'Briefing matinal : agenda du jour, météo et priorités.',
                      freq: 'daily',
                      time: '08:00',
                    })
                  }>
                  <Text style={styles.presetChipText}>🌅 Briefing 8h</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    applyPreset({
                      title: 'Revue Notion',
                      instruction: 'Fais une synthèse de mes documents et projets récents sur Notion.',
                      freq: 'weekly',
                      time: '18:00',
                    })
                  }>
                  <Text style={styles.presetChipText}>📝 Notion Hebdo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    applyPreset({
                      title: 'Veille Slack',
                      instruction: 'Vérifie les nouveaux messages dans Slack et prépare un résumé.',
                      freq: 'hourly',
                      time: '10:00',
                    })
                  }>
                  <Text style={styles.presetChipText}>⚡ Slack Horaire</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Title Input */}
              <Text style={styles.inputSectionLabel}>Titre de la tâche</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Vérification quotidienne Gmail"
                placeholderTextColor={Colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Instruction Input */}
              <Text style={styles.inputSectionLabel}>Instruction pour l'agent IA *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Ex: Vérifie mon Gmail et résume les 5 derniers emails reçus avec les actions requises."
                placeholderTextColor={Colors.textMuted}
                value={newInstruction}
                onChangeText={setNewInstruction}
                multiline
                numberOfLines={3}
              />

              {/* Frequency Selector */}
              <Text style={styles.inputSectionLabel}>Fréquence d'exécution</Text>
              <View style={styles.freqPillsGrid}>
                {[
                  { key: 'daily', label: 'Tous les jours' },
                  { key: 'weekdays', label: 'Lun - Ven' },
                  { key: 'weekly', label: 'Chaque dimanche' },
                  { key: 'hourly', label: 'Toutes les heures' },
                  { key: 'fifteen', label: 'Toutes les 15m' },
                  { key: 'custom', label: 'Cron custom' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.freqPill,
                      newFrequency === item.key && [
                        [styles.freqPillActive, { backgroundColor: theme.accentSubtle, borderColor: theme.accentBorder }],
                        { backgroundColor: `${agent.color}18`, borderColor: agent.color },
                      ],
                    ]}
                    onPress={() => setNewFrequency(item.key as any)}>
                    <Text
                      style={[
                        styles.freqPillText,
                        newFrequency === item.key && [[styles.freqPillTextActive, { color: theme.accent }], { color: agent.color }],
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time or Custom Cron Input */}
              {newFrequency === 'custom' ? (
                <>
                  <Text style={styles.inputSectionLabel}>Expression Cron standard (5 champs)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0 9 * * *"
                    placeholderTextColor={Colors.textMuted}
                    value={newCustomCron}
                    onChangeText={setNewCustomCron}
                    autoCapitalize="none"
                  />
                  <Text style={styles.cronHelperText}>
                    Signification : {formatCronToHuman(newCustomCron)}
                  </Text>
                </>
              ) : newFrequency !== 'hourly' && newFrequency !== 'fifteen' ? (
                <>
                  <Text style={styles.inputSectionLabel}>Heure de déclenchement (HH:MM)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="09:00"
                    placeholderTextColor={Colors.textMuted}
                    value={newTime}
                    onChangeText={setNewTime}
                    maxLength={5}
                  />
                </>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  [styles.modalSubmitBtn, { backgroundColor: theme.accent }],
                  { backgroundColor: agent.color },
                  isSubmitting && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleCreateTask}
                disabled={isSubmitting}
                activeOpacity={0.85}>
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Planifier l'automatisation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: VIEW EXECUTION DETAILS */}
      <Modal
        visible={!!selectedExecution}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedExecution(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de l'exécution</Text>
              <TouchableOpacity
                onPress={() => setSelectedExecution(null)}
                style={styles.modalCloseBtn}>
                <HugeiconsIcon icon={Cancel01Icon} size={18} color={Colors.iconDark} />
              </TouchableOpacity>
            </View>

            {selectedExecution && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tâche :</Text>
                  <Text style={styles.detailValue}>
                    {selectedExecution.task_title || selectedExecution.task_id}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut :</Text>
                  <Text style={styles.detailValue}>{selectedExecution.status}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Début :</Text>
                  <Text style={styles.detailValue}>
                    {formatDateDisplay(selectedExecution.started_at || selectedExecution.created_at)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fin :</Text>
                  <Text style={styles.detailValue}>
                    {formatDateDisplay(selectedExecution.completed_at)}
                  </Text>
                </View>

                {selectedExecution.error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Erreur rencontrée :</Text>
                    <Text style={styles.errorBody}>{selectedExecution.error}</Text>
                  </View>
                )}

                {selectedExecution.result && (
                  <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>Résultat de l'agent :</Text>
                    {selectedExecution.result.summary && (
                      <Text style={styles.resultSummary}>
                        {selectedExecution.result.summary}
                      </Text>
                    )}
                    {selectedExecution.result.message && (
                      <Text style={styles.resultMessage}>
                        {selectedExecution.result.message}
                      </Text>
                    )}
                    {selectedExecution.result.toolsUsed && (
                      <View style={styles.toolsUsedRow}>
                        <Text style={styles.toolsUsedLabel}>Outils utilisés :</Text>
                        <Text style={[styles.toolsUsedValue, { color: theme.accent }]}>
                          {Array.isArray(selectedExecution.result.toolsUsed)
                            ? selectedExecution.result.toolsUsed.join(', ')
                            : String(selectedExecution.result.toolsUsed)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12.5,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 5,
  },
  newGoalText: {
    fontSize: 13,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 3,
  },
  switchTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  switchTabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  switchTabText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  switchTabTextActive: {
    color: Colors.iconDark,
    fontFamily: Typography.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 5,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPaused: {
    backgroundColor: Colors.surfaceMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotPaused: {
    backgroundColor: Colors.textMuted,
  },
  statusPillText: {
    fontSize: 11.5,
    fontFamily: Typography.bold,
  },
  statusPillTextActive: {
    color: '#15803D',
  },
  statusPillTextPaused: {
    color: Colors.textMuted,
  },
  cronBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  cronBadgeText: {
    fontSize: 11,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  cardBody: {
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  pausedText: {
    color: Colors.textMuted,
  },
  taskInstruction: {
    fontSize: 13.5,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    gap: 5,
  },
  runBtnDisabled: {
    opacity: 0.7,
  },
  runBtnText: {
    fontSize: 12.5,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    fontFamily: Typography.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
  },
  emptyActionText: {
    fontSize: 13.5,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitleRow: {
    flex: 1,
    paddingRight: 8,
  },
  historyTitle: {
    fontSize: 14.5,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  historyDate: {
    fontSize: 11.5,
    fontFamily: Typography.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
  },
  historyChipSuccess: {
    backgroundColor: '#DCFCE7',
  },
  historyChipFailed: {
    backgroundColor: '#FEE2E2',
  },
  historyChipRunning: {
    backgroundColor: Colors.primarySubtle,
  },
  historyChipText: {
    fontSize: 11.5,
    fontFamily: Typography.bold,
  },
  historyChipTextSuccess: {
    color: '#15803D',
  },
  historyChipTextFailed: {
    color: '#B91C1C',
  },
  historyChipTextRunning: {
    color: Colors.primary,
  },
  historyResultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  historyResultText: {
    fontSize: 12.5,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  historyErrorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  historyErrorText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: '#DC2626',
  },
  historyFooter: {
    marginTop: 4,
  },
  historyDetailLink: {
    fontSize: 12,
    fontFamily: Typography.bold,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginBottom: 10,
  },
  inputSectionLabel: {
    fontSize: 13,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    marginBottom: 6,
    marginTop: 10,
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  presetChip: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.iconDark,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.iconDark,
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  freqPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  freqPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqPillActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryBorder,
  },
  freqPillText: {
    fontSize: 12.5,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  freqPillTextActive: {
    color: Colors.primary,
    fontFamily: Typography.bold,
  },
  cronHelperText: {
    fontSize: 11.5,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.7,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  detailModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  detailScroll: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 13,
    fontFamily: Typography.bold,
    color: '#DC2626',
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 12.5,
    color: '#B91C1C',
  },
  resultContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 13,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    marginBottom: 6,
  },
  resultSummary: {
    fontSize: 13.5,
    fontFamily: Typography.bold,
    color: Colors.iconDark,
    marginBottom: 6,
  },
  resultMessage: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  toolsUsedRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  toolsUsedLabel: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    marginRight: 6,
  },
  toolsUsedValue: {
    fontSize: 12,
    fontFamily: Typography.bold,
    color: Colors.primary,
  },
});
