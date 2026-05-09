import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PetaliaLogoProps {
  size?: number;
  color?: string;
  /** Unused – kept for API compatibility */
  showText?: boolean;
  textColor?: string;
}

/*
 * PetaliaLogo – pure View-based component (no SVG / no react-native-svg).
 *
 * RTL safety ─────────────────────────────────────────────────────────────
 * Every child uses explicit `top` / `left` (absolute pixel maths).
 * No `start` / `end`, no `flexDirection: 'row'`, no `marginLeft/Right`.
 * The mark therefore renders identically on iOS RTL, Android RTL, and web.
 *
 * Design: 5-petal cherry-blossom (Sakura) ────────────────────────────────
 *   Layer 0  soft outer glow ring
 *   Layer 1  5 main petals  (slender ellipses, high opacity)
 *   Layer 2  glossy highlight stripe on each petal
 *   Layer 3  centre backing ring (same colour, 60 % opacity)
 *   Layer 4  5 stamen dots placed between petals
 *   Layer 5  golden jewel centre circle
 *   Layer 5b inner sheen on jewel
 *   Layer 6  3 micro dots inside the jewel (refinement detail)
 */
export default function PetaliaLogo({
  size = 80,
  color = '#FFFFFF',
}: PetaliaLogoProps) {
  const c = size / 2;

  // ── Petal geometry ──────────────────────────────────────────────────
  // Slender proportions: tall & narrow → more petal-like, less balloon-like
  const orbit = size * 0.290;   // centre → petal centre distance
  const pW    = size * 0.215;   // petal width  (narrow = elegant)
  const pH    = size * 0.490;   // petal height (long  = graceful)

  // 5 petals × 72°, first pointing straight up (−90°)
  const petals = Array.from({ length: 5 }, (_, i) => {
    const deg = i * 72;
    const rad = (deg - 90) * (Math.PI / 180);
    return {
      left:   c + orbit * Math.cos(rad) - pW / 2,
      top:    c + orbit * Math.sin(rad) - pH / 2,
      rotate: `${deg}deg`,
    };
  });

  // ── Stamen dots (5, midway between petals) ──────────────────────────
  const stamOrbit = size * 0.158;
  const dotR      = size * 0.036;

  const stamens = Array.from({ length: 5 }, (_, i) => {
    const rad = (i * 72 + 36 - 90) * (Math.PI / 180);
    return {
      left: c + stamOrbit * Math.cos(rad) - dotR,
      top:  c + stamOrbit * Math.sin(rad) - dotR,
    };
  });

  // ── Centre geometry ─────────────────────────────────────────────────
  const ringR  = size * 0.195;
  const jewelR = size * 0.130;
  const microR = size * 0.027;

  // 3 micro dots inside the jewel at 120° intervals
  const microOrbit = jewelR * 0.50;
  const micros = Array.from({ length: 3 }, (_, i) => {
    const rad = (i * 120 - 90) * (Math.PI / 180);
    return {
      left: c + microOrbit * Math.cos(rad) - microR,
      top:  c + microOrbit * Math.sin(rad) - microR,
    };
  });

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      pointerEvents="none"
    >
      {/* 0 ─ Outer soft glow ──────────────────────────────────────── */}
      <View style={[styles.abs, {
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.10,
        top: 0, left: 0,
      }]} />

      {/* 1 ─ Main petals ──────────────────────────────────────────── */}
      {petals.map((p, i) => (
        <View key={`p${i}`} style={[styles.abs, {
          width: pW, height: pH,
          // Rounded tip & base – borderRadius = half width gives pill/ellipse
          borderRadius: pW / 2,
          backgroundColor: color,
          opacity: 0.94,
          top: p.top, left: p.left,
          transform: [{ rotate: p.rotate }],
        }]} />
      ))}

      {/* 2 ─ Glossy highlight on each petal ──────────────────────── */}
      {petals.map((p, i) => (
        <View key={`ph${i}`} style={[styles.abs, {
          width:  pW * 0.38,
          height: pH * 0.36,
          borderRadius: pW * 0.19,
          backgroundColor: '#FFFFFF',
          opacity: 0.22,
          // offset toward the tip of the petal
          top:  p.top + pH * 0.06,
          left: p.left + pW * 0.31,
          transform: [{ rotate: p.rotate }],
        }]} />
      ))}

      {/* 3 ─ Centre backing ring ──────────────────────────────────── */}
      <View style={[styles.abs, {
        width: ringR * 2, height: ringR * 2,
        borderRadius: ringR,
        backgroundColor: color,
        opacity: 0.55,
        top: c - ringR, left: c - ringR,
      }]} />

      {/* 4 ─ Stamen dots ──────────────────────────────────────────── */}
      {stamens.map((d, i) => (
        <View key={`s${i}`} style={[styles.abs, {
          width: dotR * 2, height: dotR * 2,
          borderRadius: dotR,
          backgroundColor: color,
          opacity: 1,
          top: d.top, left: d.left,
        }]} />
      ))}

      {/* 5 ─ Golden jewel centre ──────────────────────────────────── */}
      <View style={[styles.abs, {
        width: jewelR * 2, height: jewelR * 2,
        borderRadius: jewelR,
        backgroundColor: '#F7C24A',
        opacity: 1,
        top: c - jewelR, left: c - jewelR,
      }]} />

      {/* 5b ─ Inner sheen (top-right arc of the jewel) ───────────── */}
      <View style={[styles.abs, {
        width: jewelR * 0.90,
        height: jewelR * 0.90,
        borderRadius: jewelR * 0.45,
        backgroundColor: '#FFFFFF',
        opacity: 0.28,
        top:  c - jewelR * 0.82,
        left: c - jewelR * 0.02,
      }]} />

      {/* 6 ─ Micro dots inside jewel ──────────────────────────────── */}
      {micros.map((d, i) => (
        <View key={`m${i}`} style={[styles.abs, {
          width: microR * 2, height: microR * 2,
          borderRadius: microR,
          backgroundColor: color,
          opacity: 0.50,
          top: d.top, left: d.left,
        }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  abs:  { position: 'absolute' },
});
