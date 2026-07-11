import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Text, Pressable, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../src/theme/theme';
import { useMember, useMemberTimeline, useMemberActions, useUpdateMember } from '../../../src/hooks/useMembers';
import { useWorkspace } from '../../../src/providers/WorkspaceProvider';
import { rolesApi } from '../../../src/lib/api';

import { ErrorState } from '../../../src/components/ErrorState';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { ConfirmationDialog } from '../../../src/components/ConfirmationDialog';
import { IconButton } from '../../../src/components/IconButton';

import { MemberProfileHeader } from '../../../src/components/members/MemberProfileHeader';
import { MemberQuickActions } from '../../../src/components/members/MemberQuickActions';
import { MemberInfoSection } from '../../../src/components/members/MemberInfoSection';
import { MemberMembershipHistory } from '../../../src/components/members/MemberMembershipHistory';
import { MemberDocumentsSection } from '../../../src/components/members/MemberDocumentsSection';
import { MemberTimelineItem } from '../../../src/components/members/MemberTimelineItem';
import { QRCodeView } from '../../../src/components/members/QRCodeView';
import { formatCurrency, memberEmail, memberPhone, memberGender, memberAge, trainerName, branchName, formatDate, outstandingBalance, memberNumber } from '../../../src/lib/member';

import { Play, Dumbbell, Scale, Camera, UserPen, UserX } from 'lucide-react-native';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { can, role } = useWorkspace();
  const isTrainer = role?.toLowerCase().includes('trainer');

  const { data: member, isLoading, isError, refetch, isRefetching } = useMember(id as string);
  const { data: timeline, isLoading: isTimelineLoading } = useMemberTimeline(id as string);
  const { checkIn, checkOut, deactivate } = useMemberActions(id as string);
  const updateMutation = useUpdateMember();

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTrainerSelect, setShowTrainerSelect] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => rolesApi.getEmployees(),
  });

  const handleAssignTrainer = (trainer: any) => {
    if (!member) return;
    const updatedAi = {
      ...(member.aiInsights || {}),
      trainerId: trainer ? trainer.id : undefined,
      assignedTrainerName: trainer ? trainer.name : undefined,
    };

    updateMutation.mutate({
      id: member.id,
      data: {
        aiInsights: updatedAi,
        timelineUpdate: {
          type: 'trainer_changed',
          title: trainer ? 'Trainer Assigned' : 'Trainer Unassigned',
          description: trainer ? `Assigned to ${trainer.name}` : 'Removed assigned trainer',
          createdAt: new Date().toISOString()
        }
      }
    }, {
      onSuccess: () => {
        setShowTrainerSelect(false);
        Alert.alert('Success', trainer ? `Assigned to ${trainer.name}` : 'Trainer unassigned');
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to update trainer');
      }
    });
  };

  const hasCheckedInToday = React.useMemo(() => {
    if (!member?.attendances) return false;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    return member.attendances.some((att: any) => {
      if (!att.checkInTime) return false;
      const attDate = new Date(att.checkInTime);
      return attDate.getFullYear() === todayYear &&
        attDate.getMonth() === todayMonth &&
        attDate.getDate() === todayDate;
    });
  }, [member?.attendances]);

  // The backend doesn't return an isInsideGym flag, so derive it: a member is
  // "inside" if their most recent attendance has no check-out time. This makes
  // the Check Out button available to staff/owner whenever there's an open
  // session to close (including a forgotten check-out).
  const isCurrentlyInside = React.useMemo(() => {
    if (member?.isInsideGym) return true;
    const atts = member?.attendances;
    if (!atts?.length) return false;
    const latest = [...atts].sort(
      (a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    )[0];
    return !!latest?.checkInTime && !latest.checkOutTime;
  }, [member?.attendances, member?.isInsideGym]);

  const handleCheckOut = () => {
    if (!member) return;
    const atts = member.attendances || [];
    const latest = [...atts].sort(
      (a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    )[0];

    if (!latest?.id) {
      Alert.alert('Error', 'No active check-in session found.');
      return;
    }

    Alert.alert('Check Out', `Check out ${member.firstName} ${member.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        onPress: () =>
          checkOut.mutate(
            { attendanceId: latest.id },
            {
              onSuccess: () => Alert.alert('Checked Out', `${member.firstName} has been checked out.`),
              onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to check out'),
            }
          ),
      },
    ]);
  };

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
      <Stack.Screen
        options={{
          headerTransparent: !isScrolled,
          headerStyle: {
            backgroundColor: isScrolled ? colors.background : 'transparent',
          },
          headerBackground: isScrolled ? undefined : () => null,
          headerTitle: isScrolled ? `${member.firstName} ${member.lastName}` : '',
          headerShadowVisible: isScrolled,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -8 }}>
              {can('manage-members') && (
                <>
                  <IconButton
                    icon={<UserPen size={22} color={colors.text} />}
                    onPress={() => router.push(`/(app)/(members)/${member.id}/edit`)}
                    accessibilityLabel="Edit member"
                  />
                  <IconButton
                    icon={<UserX size={22} color={colors.error} />}
                    onPress={() => setShowDeactivateConfirm(true)}
                    accessibilityLabel="Deactivate member"
                  />
                </>
              )}
            </View>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const scrolled = y > 20;
          if (scrolled !== isScrolled) {
            setIsScrolled(scrolled);
          }
        }}
      >
        <View style={{ justifyContent: 'center', display: 'flex' }}>
          <MemberProfileHeader member={member} onQR={() => setShowQR(true)} />

          <View style={{ marginVertical: spacing.md }}>
            <MemberQuickActions
              memberId={member.id}
              phoneNumber={member.phoneNumber}
              email={memberEmail(member)}
              isInsideGym={isCurrentlyInside}
              hasCheckedInToday={hasCheckedInToday}
              hasActivePlan={!!member.activeMembership}
              isFrozen={(member.activeMembership?.status || '').toLowerCase() === 'frozen'}
              hasDues={outstandingBalance(member) > 0 && !!member.activeMembership}
              duesAmount={outstandingBalance(member)}
              onCheckIn={() => checkIn.mutate(
                { memberName: `${member.firstName} ${member.lastName}`, method: 'FRONT_DESK' },
                {
                  onSuccess: () => Alert.alert('Success', 'Attendance logged for today!'),
                  onError: (err: any) => Alert.alert('Error', err.message || 'Failed to check in'),
                }
              )}
              onCheckOut={handleCheckOut}
              onSellMembership={can('create-membership') ? () => router.push(`/(app)/(members)/${member.id}/membership`) : undefined}
              onFreezeMembership={can('freeze-membership') ? () => router.push(`/(app)/(members)/${member.id}/freeze`) : undefined}
              onCollectDues={can('record-payment') && outstandingBalance(member) > 0 && member.activeMembership
                ? () => router.push(`/(app)/(billing)/collect?invoiceId=${member.activeMembership!.id}`)
                : undefined}
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

          {member.activeMembership && (
            <MemberInfoSection
              title="Membership"
              rows={[
                { label: 'Plan', value: member.activeMembership.membershipPlan?.name || '—' },
                { label: 'Status', value: member.activeMembership.status || '—' },
                { label: 'Start', value: formatDate(member.activeMembership.startDate) },
                { label: 'Expires', value: formatDate(member.activeMembership.endDate) },
                { label: 'Amount Paid', value: formatCurrency(member.activeMembership.amountPaid || 0) },
                { label: 'Outstanding', value: formatCurrency(member.activeMembership.outstandingDues || 0) },
              ]}
            />
          )}

          <MemberInfoSection
            title="Personal Information"
            rows={[
              { label: 'Phone', value: memberPhone(member) },
              { label: 'Email', value: memberEmail(member) || '—' },
              { label: 'Gender', value: memberGender(member) },
              { label: 'Date of Birth', value: formatDate(member.dob) },
              { label: 'Age', value: memberAge(member)?.toString() || '—' },
              { label: 'Home Gym', value: branchName(member) || '—' },
            ]}
          />

          <MemberMembershipHistory
            memberships={member.memberMemberships || []}
            onPressItem={can('record-payment') ? (m) => router.push(`/(app)/(billing)/invoices/${m.id}`) : undefined}
          />

          <MemberInfoSection
            title="Address"
            rows={[
              { label: 'Line 1', value: member.address?.line1 || '—' },
              { label: 'Line 2', value: member.address?.line2 || '—' },
              { label: 'City', value: member.address?.city || '—' },
              { label: 'State', value: member.address?.state || '—' },
              { label: 'ZIP', value: member.address?.zip || '—' },
            ]}
            emptyText="No address on file."
          />

          <MemberInfoSection
            title="Medical & Emergency"
            rows={[
              { label: 'Blood Group', value: member.medicalInfo?.bloodGroup || '—' },
              { label: 'Conditions', value: member.medicalInfo?.conditions || '—' },
              { label: 'Allergies', value: member.medicalInfo?.allergies || '—' },
              { label: 'Emg. Contact', value: member.emergencyContact?.name || '—' },
              { label: 'Emg. Phone', value: member.emergencyContact?.phone || '—' },
              { label: 'Emg. Relation', value: member.emergencyContact?.relation || '—' },
            ]}
            emptyText="No medical or emergency info on file."
          />

          {!!member.memberMeasurements?.length && (
            <MemberInfoSection
              title="Body Measurements"
              rows={(() => {
                const m = member.memberMeasurements[0];
                return [
                  { label: 'Recorded', value: formatDate(m.date) },
                  { label: 'Weight', value: m.weight != null ? `${m.weight} kg` : '—' },
                  { label: 'Height', value: m.height != null ? `${m.height} cm` : '—' },
                  { label: 'Body Fat', value: m.bodyFatPercentage != null ? `${m.bodyFatPercentage}%` : '—' },
                  { label: 'Chest', value: m.chest != null ? `${m.chest} cm` : '—' },
                  { label: 'Waist', value: m.waist != null ? `${m.waist} cm` : '—' },
                  { label: 'Hip', value: m.hip != null ? `${m.hip} cm` : '—' },
                  { label: 'Arm', value: m.arm != null ? `${m.arm} cm` : '—' },
                  { label: 'Thigh', value: m.thigh != null ? `${m.thigh} cm` : '—' },
                ];
              })()}
              actionLabel={member.memberMeasurements.length > 1 ? `${member.memberMeasurements.length} records` : undefined}
              onActionPress={() => router.push(`/(app)/(members)/${member.id}/measurements`)}
            />
          )}

          <MemberDocumentsSection documents={member.memberDocuments || []} />

          {!!member.notes && (
            <MemberInfoSection
              title="Notes"
              rows={[{ label: 'Notes', value: member.notes }]}
            />
          )}

          <MemberInfoSection
            title="Account"
            rows={[
              { label: 'Member No.', value: memberNumber(member) },
              { label: 'Phone Verified', value: member.phoneVerified ? 'Yes' : 'No' },
              { label: 'Linked Accounts', value: member.linkedAccountsCount ? String(member.linkedAccountsCount) : '—' },
              { label: 'Joined', value: formatDate(member.createdAt) },
              { label: 'Last Updated', value: formatDate(member.updatedAt) },
            ]}
          />

          <MemberInfoSection
            title="Assigned Staff"
            rows={[
              { label: 'Trainer', value: trainerName(member) || 'Unassigned' },
            ]}
            actionLabel={can('assign-workout') ? "Change" : undefined}
            onActionPress={() => setShowTrainerSelect(true)}
          />

          {((Array.isArray(member.aiInsights?.workoutPlan) && member.aiInsights.workoutPlan.length > 0) ||
            (Array.isArray(member.aiInsights?.dietPlan) && member.aiInsights.dietPlan.length > 0)) && (
              <MemberInfoSection
                title="Active Program"
                rows={[
                  ...(Array.isArray(member.aiInsights.workoutPlan) && member.aiInsights.workoutPlan.length > 0 ? [{
                    label: 'Workout',
                    value: member.aiInsights.workoutPlan.map((ex: any) => `${ex.name} (${ex.sets}x${ex.reps})`).join(', ')
                  }] : []),
                  ...(Array.isArray(member.aiInsights.dietPlan) && member.aiInsights.dietPlan.length > 0 ? [{
                    label: 'Diet',
                    value: member.aiInsights.dietPlan.map((m: any) => `${m.time}: ${m.description}`).join(' | ')
                  }] : []),
                ]}
                actionLabel={isTrainer ? "Manage" : undefined}
                onActionPress={() => router.push(`/(app)/(members)/${member.id}/program`)}
              />
            )}

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

      <Modal
        visible={showQR}
        transparent
        animationType="none"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowQR(false)} />
          </Animated.View>

          <Animated.View
            entering={ZoomIn.duration(200)}
            exiting={ZoomOut.duration(150)}
            style={[
              styles.qrModalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              },
            ]}
          >
            <QRCodeView
              value={`gymflow://member/${member.id}`}
              label={`${member.firstName} ${member.lastName}`}
              description="Scan this code at check-in"
              style={{ shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent', padding: 0 }}
            />
            <Pressable
              onPress={() => setShowQR(false)}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.border,
                  borderRadius: radius.md,
                  marginTop: spacing.xl,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Close</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showTrainerSelect}
        transparent
        animationType="none"
        onRequestClose={() => setShowTrainerSelect(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTrainerSelect(false)} />
          </Animated.View>

          <Animated.View
            entering={ZoomIn.duration(200)}
            exiting={ZoomOut.duration(150)}
            style={[
              styles.trainerSelectContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.xxl,
                padding: spacing.xl,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: typography.sizes.title.fontSize, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' }}>
              Assign Trainer
            </Text>

            <ScrollView style={{ maxHeight: 300, width: '100%' }}>
              <Pressable
                onPress={() => handleAssignTrainer(null)}
                style={({ pressed }) => [
                  styles.trainerItem,
                  {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingVertical: spacing.md,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '500' }}>Unassign Trainer</Text>
              </Pressable>
              {staff?.map((s: any) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleAssignTrainer(s)}
                  style={({ pressed }) => [
                    styles.trainerItem,
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      paddingVertical: spacing.md,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{s.name}</Text>
                  {s.role && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{s.role}</Text>}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setShowTrainerSelect(false)}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.border,
                  borderRadius: radius.md,
                  marginTop: spacing.md,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  qrModalContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerSelectContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    zIndex: 10,
  },
  trainerItem: {
    width: '100%',
  },
});
