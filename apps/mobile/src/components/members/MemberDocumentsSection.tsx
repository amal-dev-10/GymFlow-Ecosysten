import React from 'react';
import { View, StyleSheet, Text, Pressable, Linking } from 'react-native';
import { FileText, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { SectionHeader } from '../SectionHeader';
import { Card } from '../Card';
import { formatDate } from '../../lib/member';

interface Props {
  documents: any[];
}

/** Uploaded member documents (ID proof, medical, consent, …), tap to open. */
export const MemberDocumentsSection: React.FC<Props> = ({ documents }) => {
  const { colors, typography, spacing, radius } = useTheme();
  if (!documents?.length) return null;

  return (
    <View style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
      <SectionHeader title="Documents" style={{ paddingHorizontal: spacing.lg }} />
      <Card padded={false}>
        {documents.map((doc, i) => {
          const hasUrl = !!doc.url;
          return (
            <Pressable
              key={doc.id || i}
              disabled={!hasUrl}
              onPress={hasUrl ? () => Linking.openURL(doc.url) : undefined}
              style={({ pressed }) => [
                styles.row,
                {
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderBottomWidth: i < documents.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.border,
                  backgroundColor: pressed ? colors.background : 'transparent',
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '12', borderRadius: radius.md }]}>
                <FileText size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: typography.sizes.bodyMedium.fontSize, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                  {doc.documentType || 'Document'}
                </Text>
                <Text style={{ fontSize: typography.sizes.caption.fontSize, color: colors.textSecondary, marginTop: 2 }}>
                  {doc.status || 'Active'} · {formatDate(doc.uploadedAt)}
                </Text>
              </View>
              {hasUrl && <ExternalLink size={16} color={colors.textMuted} />}
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
