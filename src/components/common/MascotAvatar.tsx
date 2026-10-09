/**
 * MascotAvatar Component
 *
 * Circular agent avatar. Renders the active agent's avatar choice:
 * bundled 3D mascot, emoji, name initials, or a gallery photo.
 */

import React from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { useAgent } from '@/context/AgentContext';
import { AgentAvatar } from '@/types';

export interface MascotAvatarProps {
  /** Avatar diameter in pixels (defaults to 54) */
  size?: number;
  /** Optional custom image style */
  style?: StyleProp<ImageStyle>;
  /** Override avatar (used for live previews); defaults to the active agent's */
  avatar?: AgentAvatar;
  /** Override name for initials; defaults to the active agent's */
  name?: string;
  /** Override accent color; defaults to the active agent's */
  color?: string;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  size = 54,
  style,
  avatar,
  name,
  color,
}) => {
  const { agent } = useAgent();
  const activeAvatar = avatar ?? agent.avatar;
  const activeName = name ?? agent.name;
  const activeColor = color ?? agent.color;

  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (activeAvatar.type === 'photo' || activeAvatar.type === 'mascot') {
    return (
      <Image
        source={
          activeAvatar.type === 'photo'
            ? { uri: activeAvatar.uri }
            : require('../../../assets/images/cooper_mascot.jpg')
        }
        style={[styles.avatar, circle, style]}
        resizeMode="cover"
      />
    );
  }

  const isEmoji = activeAvatar.type === 'emoji';
  return (
    <View
      style={[
        styles.avatar,
        styles.centered,
        circle,
        { backgroundColor: isEmoji ? `${activeColor}1F` : activeColor },
        style as any,
      ]}>
      <Text
        style={[
          isEmoji ? styles.emoji : styles.initials,
          { fontSize: size * (isEmoji ? 0.52 : 0.38) },
        ]}>
        {isEmoji ? activeAvatar.value : getInitials(activeName)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.surface,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
  initials: {
    fontFamily: Typography.extrabold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
});

export default MascotAvatar;
