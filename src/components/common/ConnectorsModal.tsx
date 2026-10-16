/**
 * Composio Connectors & Connected Apps Modal
 *
 * Displays external workspace apps connected to Tiboo via the unified
 * Composio Model Context Protocol (MCP) Server.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  LinkSquare02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { showToast } from '@/context/ToastContext';
import { useAgent } from '@/context/AgentContext';

export interface ConnectorsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface AppConnector {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  connected: boolean;
  userEmail?: string;
}

const DEFAULT_CONNECTORS: AppConnector[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Google Workspace',
    description: 'Lecture des 5 derniers emails non lus, recherche et envoi de messages.',
    color: '#EA4335',
    connected: true,
    userEmail: 'utilisateur@gmail.com',
  },
  {
    id: 'googlecalendar',
    name: 'Google Calendar',
    category: 'Google Workspace',
    description: 'Consultation des prochains événements, détection des créneaux libres.',
    color: '#4285F4',
    connected: true,
    userEmail: 'utilisateur@gmail.com',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Documentation',
    description: 'Recherche de pages, roadmaps, spécifications et notes de réunions.',
    color: '#000000',
    connected: true,
    userEmail: 'workspace@notion.so',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Veille des canaux prioritaires et notifications d’équipe.',
    color: '#4A154B',
    connected: true,
    userEmail: 'equipe@slack.com',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Développement',
    description: 'Suivi des pull requests, revues de code et alertes CI/CD.',
    color: '#24292E',
    connected: true,
    userEmail: 'dev@github.com',
  },
];

export const ConnectorsModal: React.FC<ConnectorsModalProps> = ({ visible, onClose }) => {
  const { agent } = useAgent();
  const [connectors, setConnectors] = useState<AppConnector[]>(DEFAULT_CONNECTORS);

  const toggleConnection = (id: string, name: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c))
    );
    showToast(`${name} : statut Composio MCP mis à jour`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View style={[styles.badge, { backgroundColor: `${agent.color}15` }]}>
                    <HugeiconsIcon icon={SparklesIcon} size={14} color={agent.color} strokeWidth={2} />
                    <Text style={[styles.badgeText, { color: agent.color }]}>Composio MCP Server</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                    <HugeiconsIcon icon={Cancel01Icon} size={20} color={Colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.title}>Comptes & Outils Connectés</Text>
                <Text style={styles.subtitle}>
                  Tiboo utilise un serveur MCP unique pour dialoguer avec plus de 100 applications
                  sans coder chaque intégration à la main.
                </Text>
              </View>

              {/* Connector List */}
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {connectors.map((connector) => (
                  <View key={connector.id} style={styles.connectorItem}>
                    <View style={[styles.appEmblem, { backgroundColor: connector.color }]}>
                      <Text style={styles.emblemText}>{connector.name.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.connectorInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.appName}>{connector.name}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            connector.connected ? styles.statusPillActive : styles.statusPillInactive,
                          ]}>
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={12}
                            color={connector.connected ? '#15803D' : Colors.textMuted}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: connector.connected ? '#15803D' : Colors.textMuted },
                            ]}>
                            {connector.connected ? 'Connecté' : 'Non connecté'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.appDescription}>{connector.description}</Text>
                      {connector.userEmail && connector.connected ? (
                        <Text style={styles.accountEmail}>Compte : {connector.userEmail}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        connector.connected
                          ? styles.actionBtnOutline
                          : [styles.actionBtnPrimary, { backgroundColor: agent.color }],
                      ]}
                      onPress={() => toggleConnection(connector.id, connector.name)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${connector.connected ? 'Déconnecter' : 'Connecter'} ${connector.name}`}>
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        size={14}
                        color={connector.connected ? Colors.textMuted : Colors.white}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.footerNote}>
                  <Text style={styles.footerNoteText}>
                    ✨ 100+ autres intégrations (Reddit, Google Docs, Linear, Jira...) sont prêtes à être
                    activées via le serveur Composio MCP.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  list: {
    marginTop: 4,
  },
  connectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  appEmblem: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emblemText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  connectorInfo: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillInactive: {
    backgroundColor: Colors.surfaceMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  accountEmail: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  footerNote: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  footerNoteText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
