// src/services/storage.js
// Dünner Wrapper um AsyncStorage – speichert JSON lokal auf dem Gerät.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem(key, def) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v != null ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}

export async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignorieren – nicht kritisch */
  }
}
