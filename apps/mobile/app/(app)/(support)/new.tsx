import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/theme';
import { useCreateSupportTicket } from '@/hooks/useSupport';
import { PRIORITIES, priorityLabel, SUPPORT_CATEGORIES } from '@/lib/support';
import { useHaptics } from '@/hooks/useHaptics';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';

export default function NewSupportTicketScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { success, error } = useHaptics();
  const createMutation = useCreateSupportTicket();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('General');

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Subject required', 'Please enter a short summary of your issue.');
      return;
    }
    try {
      const ticket = await createMutation.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        category,
      });
      success();
      router.replace(`/(app)/(support)/${ticket.id}`);
    } catch (e: any) {
      error();
      Alert.alert('Error', e?.message || 'Failed to create ticket. Please try again.');
    }
  };

  const chip = (label: string, selected: boolean, onPress: () => void, tint?: string) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? (tint || colors.primary) : colors.surface,
          borderColor: selected ? (tint || colors.primary) : colors.border,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={{ color: selected ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Briefly, what's the issue?"
            placeholderTextColor={colors.textMuted}
            maxLength={200}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.md, height: 130, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Share the details — what happened, what you expected, any steps to reproduce."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={5000}
          />

          <SectionHeader title="Priority" style={{ marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 0 }} />
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => chip(priorityLabel(p), priority === p, () => setPriority(p)))}
          </View>

          <SectionHeader title="Category" style={{ marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 0 }} />
          <View style={styles.chipRow}>
            {SUPPORT_CATEGORIES.map((c) => chip(c, category === c, () => setCategory(c)))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}>
          <PrimaryButton label="Submit Ticket" onPress={handleSubmit} loading={createMutation.isPending} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
});
