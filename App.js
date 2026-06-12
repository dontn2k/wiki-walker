// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MapScreen from './src/components/MapScreen';

export default function App() {
  const [fontsLoaded] = useFonts({ YoungSerif: require('./assets/fonts/YoungSerif.ttf') });
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <MapScreen />
    </>
  );
}
