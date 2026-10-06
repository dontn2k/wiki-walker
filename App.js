// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MapScreen from './src/components/MapScreen';
import { LangProvider } from './src/i18n';

export default function App() {
  const [fontsLoaded] = useFonts({ YoungSerif: require('./assets/fonts/YoungSerif.ttf') });
  if (!fontsLoaded) return null;
  return (
    <LangProvider>
      <StatusBar style="dark" />
      <MapScreen />
    </LangProvider>
  );
}
