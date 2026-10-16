/**
 * TibooLogo Component
 *
 * Vector Tiboo logo drawn with react-native-svg (no bitmap):
 * - 'mark': the Tiboo character mark alone
 * - 'tile': the mark in white on the violet gradient rounded square (app icon look)
 * - 'full': the mark above the "tiboo" wordmark
 *
 * The eyes are cut out with a mask, so the mark sits correctly on any background.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { APP_BRAND } from '@/constants/agentConfig';

export interface TibooLogoProps {
  /** 'mark' (default), 'tile' (app-icon square) or 'full' (mark + wordmark) */
  variant?: 'mark' | 'tile' | 'full';
  /** Height of the mark / tile in pixels */
  size?: number;
  /** Mark color (defaults to Tiboo violet; white inside the tile) */
  color?: string;
}

// Mark geometry, in the coordinates of the original artwork
const MARK_BOX = { x: 770, y: 395, w: 460, h: 465 };
const HEAD =
  'M850 500 C880 432 950 405 1000 405 C1050 405 1092 420 1116 446 L1079 688 Q1076 705 1060 705 L937 705 Q923 705 920 719 L912 755 Q909 770 893 770 L817 770 Q801 770 804 754 L838 600 Z';
const STEP =
  'M1152 510 L1200 510 Q1215 510 1212 526 L1170 764 Q1167 778 1152 778 L1030 778 Q1019 778 1017 790 L1009 834 Q1006 848 991 848 L922 848 Q907 848 910 833 L913 818 Q915 808 925 808 L955 808 Q964 808 966 798 L972 760 Q975 745 990 745 L1103 745 Q1116 745 1118 732 L1140 522 Q1142 510 1152 510 Z';

const MarkShapes: React.FC<{ color: string; maskId: string }> = ({ color, maskId }) => (
  <>
    <Defs>
      <Mask id={maskId} maskUnits="userSpaceOnUse" x={MARK_BOX.x} y={MARK_BOX.y} width={MARK_BOX.w} height={MARK_BOX.h}>
        <Rect x={MARK_BOX.x} y={MARK_BOX.y} width={MARK_BOX.w} height={MARK_BOX.h} fill="#FFFFFF" />
        {/* Eye holes with their pupils left in */}
        <Circle cx={928} cy={552} r={51} fill="#000000" />
        <Circle cx={1062} cy={553} r={44} fill="#000000" />
        <Circle cx={958} cy={517} r={24} fill="#FFFFFF" />
        <Circle cx={1088} cy={520} r={21} fill="#FFFFFF" />
      </Mask>
    </Defs>
    <G mask={`url(#${maskId})`} fill={color}>
      <Path d={HEAD} />
      <Circle cx={832} cy={555} r={46} />
      <Path d={STEP} />
    </G>
  </>
);

export const TibooLogo: React.FC<TibooLogoProps> = ({ variant = 'mark', size = 40, color }) => {
  if (variant === 'tile') {
    // Mark scaled to ~64% of the tile and centered
    const scale = 64 / MARK_BOX.w;
    const dx = (100 - MARK_BOX.w * scale) / 2;
    const dy = (100 - MARK_BOX.h * scale) / 2;
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="tibooTile" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={Colors.primaryGradientStart} />
            <Stop offset="0.55" stopColor={Colors.primary} />
            <Stop offset="1" stopColor={Colors.primaryGradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} rx={23} fill="url(#tibooTile)" />
        <G transform={`translate(${dx} ${dy}) scale(${scale}) translate(${-MARK_BOX.x} ${-MARK_BOX.y})`}>
          <MarkShapes color={color ?? Colors.white} maskId="tibooTileMask" />
        </G>
      </Svg>
    );
  }

  const mark = (
    <Svg
      width={(size * MARK_BOX.w) / MARK_BOX.h}
      height={size}
      viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}>
      <MarkShapes color={color ?? Colors.primary} maskId="tibooMarkMask" />
    </Svg>
  );

  if (variant === 'mark') return mark;

  return (
    <View style={styles.full}>
      {mark}
      <Text
        style={[
          styles.wordmark,
          { color: color ?? Colors.primary, fontSize: size * 0.62, marginTop: size * 0.18 },
        ]}>
        {APP_BRAND.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Typography.bold,
    letterSpacing: -0.5,
  },
});

export default TibooLogo;
