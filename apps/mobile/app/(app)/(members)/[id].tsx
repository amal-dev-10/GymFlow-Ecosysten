import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/theme/theme';
import { useMember, useMemberTimeline, useMemberActions } from '../../../src/hooks/useMembers';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';

import { ErrorState } from '../../../src/components/ErrorState';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { ConfirmationDialog } from '../../../src/components/ConfirmationDialog';

import { MemberProfileHeader } from '../../../src/components/members/MemberProfileHeader';
import { MemberQuickActions } from '../../../src/components/members/MemberQuickActions';
import { MemberInfoSection } from '../../../src/components/members/MemberInfoSection';
import { MemberTimelineItem } from '../../../src/components/members/MemberTimelineItem';
import { QRCodeView } from '../../../src/components/members/QRCodeView';
import { formatCurrency, memberEmail, memberPhone, memberGender, memberAge, trainerName, branchName, formatDate } from '../../../src/lib/member';

import { Play, Dumbbell, Scale, Camera } from 'lucide-react-native';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { can, role } = useWorkspace();
  const isTrainer = role?.toLowerCase().includes('trainer');

  const { data: member, isLoading, isError, refetch, isRefetching } = useMember(id as string);
  const { data: timeline, isLoading: isTimelineLoading } = useMemberTimeline(id as string);
  const { checkIn, checkOut, deactivate } = useMemberActions(id as string);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <SkeletonLoader width={80} height={80} borderRadius={40} style={{ marginBottom: spacing.lg }} />
        <SkeletonLoader width="60%" height={24} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="40%" height={16} style={{ marginBottom: spacing.xl }} />
        <SkeletonLoader width="100%" height={64} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={200} />
      </View>
    );
  }

  if (isError || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message="Failed to load member details." onRetry={refetch} />
      </View>
    );
  }

  const handleDeactivate = () => {
    deactivate.mutate(undefined, {
      onSuccess: () => {
        setShowDeactivateConfirm(false);
        router.back();
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={{ width: "95%" }}>
          <MemberProfileHeader member={member} />

          <View style={{ marginVertical: spacing.md }}>
            <MemberQuickActions
              memberId={member.id}
              phoneNumber={member.phoneNumber}
              email={memberEmail(member)}
              isInsideGym={member.isInsideGym}
              onCheckIn={() => checkIn.mutate()}
              onCheckOut={() => checkOut.mutate()}
              onEdit={() => router.push(`/(app)/(members)/${member.id}/edit`)}
              onQR={() => setShowQR(true)}
              onDeactivate={() => setShowDeactivateConfirm(true)}
            />
          </View>

          {isTrainer && (
            <View style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}>
              <Text style={{ fontSize: typography.sizes.title.fontSize, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
                Coaching Workspace
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => router.push(`/(app)/(members)/${member.id}/session`)}
                  style={({ pressed }) => [
                    styles.trainerCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <View style={[styles.trainerIconBg, { backgroundColor: '#10B98112' }]}>
                    <Play size={20} color="#10B981" fill="#10B981" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>Start Session</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/(app)/(members)/${member.id}/program`)}
                  style={({ pressed }) => [
                    styles.trainerCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <View style={[styles.trainerIconBg, { backgroundColor: colors.primary + '12' }]}>
                    <Dumbbell size={20} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>Workouts & Diet</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/(app)/(members)/${member.id}/measurements`)}
                  style={({ pressed }) => [
                    styles.trainerCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <View style={[styles.trainerIconBg, { backgroundColor: '#F59E0B12' }]}>
                    <Scale size={20} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>Body Stats</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/(app)/(members)/${member.id}/photos`)}
                  style={({ pressed }) => [
                    styles.trainerCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <View style={[styles.trainerIconBg, { backgroundColor: '#EC489912' }]}>
                    <Camera size={20} color="#EC4899" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>Photos</Text>
                </Pressable>
              </View>
            </View>
          )}

          {showQR && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              <QRCodeView
                value={`gymflow://member/${member.id}`}
                label={member.firstName}
                description="Scan this code for quick access"
              />
            </View>
          )}

          <MemberInfoSection
            title="Personal Information"
            rows={[
              { label: 'Phone', value: memberPhone(member) },
              { label: 'Email', value: memberEmail(member) || '—' },
              { label: 'Gender', value: memberGender(member) },
              { label: 'Age', value: memberAge(member)?.toString() || '—' },
              { label: 'Joined', value: formatDate(member.createdAt) },
              { label: 'Home Gym', value: branchName(member) || '—' },
            ]}
          />

          <MemberInfoSection
            title="Medical & Emergency"
            rows={[
              { label: 'Blood Group', value: member.medicalInfo?.bloodGroup || '—' },
              { label: 'Conditions', value: member.medicalInfo?.conditions || '—' },
              { label: 'Allergies', value: member.medicalInfo?.allergies || '—' },
              { label: 'Emg. Contact', value: member.emergencyContact?.name || '—' },
              { label: 'Emg. Phone', value: member.emergencyContact?.phone || '—' },
            ]}
          />

          <MemberInfoSection
            title="Assigned Staff"
            rows={[
              { label: 'Trainer', value: trainerName(member) || 'Unassigned' },
            ]}
            actionLabel={can('assign-workout') ? "Change" : undefined}
          />

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.title.fontSize,
                fontWeight: typography.sizes.title.fontWeight,
                marginBottom: spacing.lg,
              }}
            >
              Recent Activity
            </Text>

            {isTimelineLoading ? (
              <SkeletonLoader width="100%" height={100} />
            ) : timeline && timeline.length > 0 ? (
              timeline.map((event, i) => (
                <MemberTimelineItem
                  key={event.id}
                  event={event}
                  isLast={i === timeline.length - 1}
                />
              ))
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.body.fontSize }}>
                No recent activity.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={showDeactivateConfirm}
        title="Deactivate Member"
        message={`Are you sure you want to deactivate ${member.firstName}? They will no longer be able to access the gym or app.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactivateConfirm(false)}
        loading={deactivate.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trainerCard: {
    flexGrow: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  trainerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  }
});
