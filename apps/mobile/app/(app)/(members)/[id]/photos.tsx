import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Image as ImageIcon, Plus, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/theme/theme';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { useHaptics } from '@/hooks/useHaptics';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';

// Preset mock progress photos for visual demo
const PRESET_PHOTOS = [
  { id: '1', date: '2026-06-01', url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&auto=format&fit=crop&q=60', note: 'Start weight: 82.5kg' },
  { id: '2', date: '2026-06-15', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=60', note: 'Mid-term weight: 81.2kg' },
  { id: '3', date: '2026-07-01', url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=200&auto=format&fit=crop&q=60', note: 'Current weight: 79.8kg' },
];

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { lightImpact, successNotification } = useHaptics();

  const { data: member, isLoading } = useMember(id as string);
  const updateMutation = useUpdateMember();

  const [photos, setPhotos] = useState(PRESET_PHOTOS);
  const [beforePhoto, setBeforePhoto] = useState<string | null>(PRESET_PHOTOS[0].url);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(PRESET_PHOTOS[2].url);

  const handleTakePhoto = () => {
    lightImpact();
    // Simulate taking progress photo
    const newPhoto = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&auto=format&fit=crop&q=60',
      note: 'New log: 79.2kg'
    };

    setPhotos([newPhoto, ...photos]);
    setAfterPhoto(newPhoto.url);

    const payload = {
      id: id as string,
      data: {
        notes: `Uploaded progress photo on ${newPhoto.date}`,
        timelineUpdate: {
          type: 'progress-photo',
          title: 'Progress Photo Added',
          description: `Logged progress photo on ${newPhoto.date}`
        }
      }
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        successNotification();
        Alert.alert('Success', 'Progress photo saved successfully!');
      }
    });
  };

  if (isLoading || !member) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Progress Photos</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{member.firstName} {member.lastName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {/* Before / After Comparison */}
        <SectionHeader title="Before / After Grid" />
        <View style={styles.compareGrid}>
          <Card style={styles.compareCard}>
            <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>BEFORE (01 Jun)</Text>
            {beforePhoto ? (
              <Image source={{ uri: beforePhoto }} style={[styles.photo, { borderRadius: radius.md }]} />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: colors.background }]} />
            )}
          </Card>
          <Card style={styles.compareCard}>
            <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>AFTER (01 Jul)</Text>
            {afterPhoto ? (
              <Image source={{ uri: afterPhoto }} style={[styles.photo, { borderRadius: radius.md }]} />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: colors.background }]} />
            )}
          </Card>
        </View>

        {/* Add Entry Card */}
        <Pressable
          onPress={handleTakePhoto}
          style={({ pressed }) => [
            styles.addCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: pressed ? 0.95 : 1
            }
          ]}
        >
          <Camera size={24} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>Capture New Progress Photo</Text>
        </Pressable>

        {/* Photo Gallery Timeline */}
        <SectionHeader title="Photo Timeline" style={{ marginTop: spacing.xl }} />
        <View style={styles.gallery}>
          {photos.map((item) => (
            <Card key={item.id} style={styles.photoItem}>
              <Image source={{ uri: item.url }} style={[styles.galleryThumb, { borderRadius: radius.sm }]} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{item.note}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  compareGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  compareCard: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  compareLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 6,
  },
  photo: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: 160,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 16,
    gap: 8,
  },
  gallery: {
    gap: 10,
    marginTop: 4,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  galleryThumb: {
    width: 60,
    height: 60,
    resizeMode: 'cover',
  }
});
