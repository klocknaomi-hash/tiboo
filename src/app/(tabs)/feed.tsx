/**
 * Feed Tab Screen ('/(tabs)/feed')
 *
 * Soft empty state until the agent posts updates:
 * agent avatar on a pastel halo, title and a short hint.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { MascotAvatar } from '@/components/common';
import { useAgent } from '@/context/AgentContext';

export default function FeedScreen() {
  const { agent } = useAgent();

  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <View style={styles.halo}>
          <MascotAvatar size={72} />
        </View>
        <Text style={styles.title}>Your feed is cozy and quiet</Text>
        <Text style={styles.subtitle}>
          {agent.name} will share updates, summaries and wins here as your goals move forward.
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
