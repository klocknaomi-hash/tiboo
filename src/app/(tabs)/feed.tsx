/**
 * Feed Tab Screen ('/(tabs)/feed')
 *
 * Clean empty state until the agent posts updates:
 * agent avatar on a soft violet halo, title and a short hint.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography } from '@/constants/theme';
import { MascotAvatar } from '@/components/common';
import { useAgent } from '@/context/AgentContext';

export default function FeedScreen() {
  const { agent } = useAgent();
  const theme = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <View style={[[styles.halo, { backgroundColor: theme.accentSubtle }], { backgroundColor: `${agent.color}18`, borderColor: `${agent.color}30`, borderWidth: 1.5 }]}>
          <MascotAvatar size={72} />
        </View>
        <Text style={styles.title}>Rien pour le moment</Text>
        <Text style={styles.subtitle}>
          {agent.name} partagera ici vos synthèses, vos bilans d’activité et l’avancement de vos objectifs au fur et à mesure.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  halo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
