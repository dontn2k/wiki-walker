// src/components/SplashOverlay.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, View } from 'react-native';

const FOOT = require('../../assets/footprints.png');
const PIN = require('../../assets/pin.png');
const BG = '#fffaf0';
const INK = '#3a322a';
const { width, height } = Dimensions.get('window');

export default function SplashOverlay({ onDone }) {
  const overlay = useRef(new Animated.Value(1)).current;
  const footOp = useRef(new Animated.Value(0)).current;
  const footY = useRef(new Animated.Value(24)).current;
  const pinOp = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(0.9)).current;
  const textOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(footOp, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(footY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pinOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(pinScale, { toValue: 1.12, friction: 4, tension: 90, useNativeDriver: true }),
          Animated.spring(pinScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(textOp, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(overlay, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start(() => { if (onDone) onDone(); });
  }, []);

  return (
    <Animated.View style={[styles.fill, { opacity: overlay }]} pointerEvents="none">
      <Animated.Image
        source={FOOT}
        resizeMode="contain"
        style={[styles.foot, { opacity: footOp, transform: [{ translateY: footY }] }]}
      />
      <View style={styles.center}>
        <Animated.Image
          source={PIN}
          resizeMode="contain"
          style={[styles.pin, { opacity: pinOp, transform: [{ scale: pinScale }] }]}
        />
        <Animated.Text style={[styles.word, { opacity: textOp }]}>wiki-walker</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: width, height: height, zIndex: 1000, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  foot: {
    position: 'absolute',
    bottom: height * 0.07,
    left: width * 0.14,
    width: width * 0.72,
    height: width * 0.72 * 0.65,
  },
  center: { alignItems: 'center', marginBottom: height * 0.08 },
  pin: { width: 104, height: 104, marginBottom: 16 },
  word: { fontFamily: 'YoungSerif', fontSize: 30, color: INK, letterSpacing: 0.5, textAlign: 'center', width: width, paddingHorizontal: 24 },
});
