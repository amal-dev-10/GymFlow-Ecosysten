import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Send, Star } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useSupportTicket, usePostSupportMessage, useSupportCsat } from '@/hooks/useSupport';
import { statusLabel, statusType, isClosedStatus } from '@/lib/support';
import { SupportMessage } from '@/lib/api';
import { useHaptics } from '@/hooks/useHaptics';

import { StatusBadge } from '@/components/StatusBadge';
import { ErrorState } from '@/components/ErrorState';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const { success } = useHaptics();

  const { data: ticket, isLoading, isError, error, refetch } = useSupportTicket(id as string);
  const postMessage = usePostSupportMessage(id as string);
  const csat = useSupportCsat(id as string);

  const [reply, setReply] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    const body = reply.trim();
    if (!body) return;
    setReply('');
    postMessage.mutate(body, {
      onSuccess: () => {
        success();
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
      onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to send message'),
    });
  };

  const rate = (score: number) => {
    csat.mutate({ score }, { onSuccess: () => success() });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Ticket' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !ticket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Ticket' }} />
        <ErrorState message={(error as Error)?.message || 'Ticket not found.'} onRetry={refetch} />
      </View>
    );
  }

  const closed = isClosedStatus(ticket.status);
  const showCsat = (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && !ticket.satisfactionScore;
  const canReply = ticket.status !== 'CANCELLED';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: `#${ticket.ticketNumber}` }} />

        {/* Ticket header */}
        <View style={[styles.ticketHeader, { borderBottomColor: colors.border, padding: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ flex: 1, fontSize: typography.sizes.title.fontSize, fontWeight: '800', color: colors.text }} numberOfLines={2}>
              {ticket.subject}
            </Text>
            <StatusBadge label={statusLabel(ticket.status)} type={statusType(ticket.status)} />
          </View>
          <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textMuted, marginTop: 4 }}>
            {ticket.category || 'General'} · opened {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
          </Text>
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {ticket.messages.length === 0 && (
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: typography.sizes.body.fontSize }}>
              No messages yet.
            </Text>
          )}
          {ticket.messages.map((m: SupportMessage) => {
            const mine = m.authorType === 'Customer';
            const system = m.authorType === 'System';
            if (system) {
              return (
                <Text key={m.id} style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted }}>
                  {m.body}
                </Text>
              );
            }
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  {
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    backgroundColor: mine ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    borderWidth: mine ? 0 : 1,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                {!mine && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 3 }}>
                    {m.authorName}
                  </Text>
                )}
                <Text style={{ fontSize: typography.sizes.body.fontSize, color: mine ? '#FFF' : colors.text, lineHeight: 20 }}>
                  {m.body}
                </Text>
                <Text style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.7)' : colors.textMuted, marginTop: 4, textAlign: 'right' }}>
                  {fmtTime(m.createdAt)}
                </Text>
              </View>
            );
          })}

          {/* CSAT prompt */}
          {showCsat && (
            <View style={[styles.csat, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
              <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                How was our support?
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => rate(n)} disabled={csat.isPending} hitSlop={6}>
                    <Star size={30} color={colors.warning} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {ticket.satisfactionScore ? (
            <Text style={{ textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
              You rated this {ticket.satisfactionScore}/5 · thanks for the feedback
            </Text>
          ) : null}
        </ScrollView>

        {/* Reply bar */}
        {canReply && (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.sm }]}>
            <TextInput
              style={[styles.replyInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
              value={reply}
              onChangeText={setReply}
              placeholder={closed ? 'Reply to reopen this ticket…' : 'Type a message…'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!reply.trim() || postMessage.isPending}
              style={[styles.sendBtn, { backgroundColor: reply.trim() ? colors.primary : colors.border, borderRadius: radius.full }]}
            >
              {postMessage.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={18} color="#FFF" />
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ticketHeader: { borderBottomWidth: 1 },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  csat: {
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
