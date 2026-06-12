// src/components/PointForm.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { defaultTheme as T } from '../themes';

export default function PointForm({ point, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(point.title || '');
  const [note, setNote] = useState(point.note || '');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          <Text style={styles.h}>Eigener Punkt</Text>
          <TextInput
            style={styles.input}
            placeholder="Titel (z. B. Gitter am Marktplatz)"
            placeholderTextColor={T.inkSoft}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.area]}
            placeholder="Notiz fürs spätere Nachschauen …"
            placeholderTextColor={T.inkSoft}
            value={note}
            onChangeText={setNote}
            multiline
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.save]}
              onPress={() => onSave({ ...point, title: title.trim(), note: note.trim() })}
            >
              <Text style={styles.saveTxt}>Speichern</Text>
            </TouchableOpacity>
            {!point.isNew && (
              <TouchableOpacity style={styles.btn} onPress={() => onDelete(point.id)}>
                <Text style={styles.btnTxt}>Löschen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(58,50,42,0.3)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  card: {
    backgroundColor: T.surface2, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: T.line,
    shadowColor: '#3a322a', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  h: { fontSize: 18, fontWeight: '700', color: T.ink, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: T.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14.5, color: T.ink, backgroundColor: T.surface, marginBottom: 10,
  },
  area: { height: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 9, marginTop: 2 },
  btn: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: 11, paddingVertical: 11, alignItems: 'center', backgroundColor: T.bg },
  btnTxt: { fontSize: 14, fontWeight: '600', color: T.ink },
  save: { backgroundColor: T.sage, borderColor: T.sage },
  saveTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
