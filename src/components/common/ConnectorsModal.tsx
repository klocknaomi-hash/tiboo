/**
 * Connectors Modal
 *
 * Shows the REAL connection status of each app for the signed-in user
 * (read from the Tiboo server, which asks Composio). "Connecter" opens the
 * provider's own sign-in page; nothing is marked connected unless it is.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Linking,
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
import { useThemeColors } from '@/hooks/useThemeColors';
import { apiFetch } from '@/lib/apiClient';

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
}

const CONNECTOR_CATALOG: AppConnector[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Google Workspace',
    description: 'Lire, rechercher et envoyer des emails (envoi après ta confirmation).',
    color: '#EA4335',
  },
  {
    id: 'googlecalendar',
    name: 'Google Agenda',
    category: 'Google Workspace',
    description: 'Consulter tes prochains événements et en créer (après confirmation).',
    color: '#4285F4',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Documentation',
    description: 'Rechercher dans tes pages et en créer (après confirmation).',
    color: '#000000',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Lire tes canaux ; tout envoi de message demande ta confirmation.',
    color: '#4A154B',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Développement',
    description: 'Suivre tes dépôts et issues ; toute modification demande ta confirmation.',
    color: '#24292E',
  },
];

type LoadState = 'loading' | 'ready' | 'unconfigured' | 'error';

export const ConnectorsModal: React.FC<ConnectorsModalProps> = ({ visible, onClose }) => {
  const theme = useThemeColors();
  const [state, setState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState('loading');
    try {
      const res = await apiFetch<{ configured: boolean; connections: Record<string, boolean> }>(
        '/api/connectors'
      );
      setConnections(res.connections || {});
      setState(res.configured ? 'ready' : 'unconfigured');
    } catch (err: any) {
      setErrorText(err?.message || 'Impossible de lire l’état des connecteurs.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const connect = async (connector: AppConnector) => {
    setConnectingId(connector.id);
    try {
      const { redirectUrl } = await apiFetch<{ redirectUrl: string }>('/api/connectors', {
        body: { toolkit: connector.id },
      });
      await Linking.openURL(redirectUrl);
      showToast(`Termine la connexion à ${connector.name}, puis touche « Actualiser ».`);
    } catch (err: any) {
      showToast(err?.message || `Connexion à ${connector.name} impossible.`);
    } finally {
      setConnectingId(null);
    }
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
                  <View style={[styles.badge, { backgroundColor: theme.accentSubtle }]}>
                    <HugeiconsIcon icon={SparklesIcon} size={14} color={theme.accent} strokeWidth={2} />
                    <Text style={[[styles.badgeText, { color: theme.accent }], { color: theme.accent }]}>Connecteurs</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                    <HugeiconsIcon icon={Cancel01Icon} size={20} color={Colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.title}>Comptes & Outils Connectés</Text>
                <Text style={styles.subtitle}>
                  Connecte tes propres comptes. Ton agent ne voit que ceux que tu connectes ici, et
                  te demande toujours confirmation avant d’envoyer ou de créer quoi que ce soit.
                </Text>
                {state === 'unconfigured' && (
                  <Text style={[styles.subtitle, { color: Colors.warning }]}>
                    Les connecteurs ne sont pas encore activés sur le serveur Tiboo.
                  </Text>
                )}
                {state === 'error' && (
                  <Text style={[styles.subtitle, { color: Colors.error }]}>{errorText}</Text>
                )}
                <TouchableOpacity onPress={refresh} hitSlop={8} disabled={state === 'loading'}>
                  <Text style={[styles.refreshText, { color: theme.accent }]}>
                    {state === 'loading' ? 'Chargement…' : 'Actualiser'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Connector List */}
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {CONNECTOR_CATALOG.map((connector) => {
                  const connected = connections[connector.id] === true;
                  const canConnect = state === 'ready' && !connected;
                  return (
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
                            connected ? styles.statusPillActive : styles.statusPillInactive,
                          ]}>
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={12}
                            color={connected ? Colors.success : Colors.textMuted}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: connected ? Colors.success : Colors.textMuted },
                            ]}>
                            {state === 'loading' ? '…' : connected ? 'Connecté' : 'Non connecté'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.appDescription}>{connector.description}</Text>
                    </View>
                    {canConnect && (
                      <TouchableOpacity
                        style={[styles.actionBtn, [styles.actionBtnPrimary, { backgroundColor: theme.accent }], { backgroundColor: theme.accent }]}
                        onPress={() => connect(connector)}
                        disabled={connectingId !== null}
                        activeOpacity={0.7}
                        accessibilityLabel={`Connecter ${connector.name}`}>
                        {connectingId === connector.id ? (
                          <ActivityIndicator size="small" color={theme.onAccent} />
                        ) : (
                          <HugeiconsIcon icon={LinkSquare02Icon} size={14} color={theme.onAccent} strokeWidth={2} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  );
                })}

                <View style={styles.footerNote}>
                  <Text style={styles.footerNoteText}>
                    Les connexions passent par Composio, qui gère l’authentification de chaque
                    application. Tu peux révoquer un accès à tout moment depuis le compte concerné.
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
  refreshText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Typography.semibold,
  },
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
