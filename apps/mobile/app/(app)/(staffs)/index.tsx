import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../src/theme/theme';
import { ListItem } from '../../../src/components/ListItem';
import { SearchBar } from '../../../src/components/SearchBar';
import { UserAvatar } from '../../../src/components/UserAvatar';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { useHaptics } from '../../../src/hooks/useHaptics';

interface Member {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'warning' | 'error';
  statusLabel: string;
}

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'John Connor', plan: 'Premium Yearly', status: 'active', statusLabel: 'Active' },
  { id: '2', name: 'Ellen Ripley', plan: 'Monthly Pass', status: 'active', statusLabel: 'Active' },
  { id: '3', name: 'Marcus Wright', plan: 'Personal Training Bundle', status: 'warning', statusLabel: 'Due Soon' },
  { id: '4', name: 'Peter Parker', plan: 'Student Discount Pass', status: 'error', statusLabel: 'Expired' },
  { id: '5', name: 'Bruce Wayne', plan: 'VVIP Premium Lifetime', status: 'active', statusLabel: 'Active' },
  { id: '6', name: 'Clark Kent', plan: 'Standard Monthly', status: 'active', statusLabel: 'Active' },
  { id: '7', name: 'Diana Prince', plan: 'Premium Yearly', status: 'active', statusLabel: 'Active' },
  { id: '8', name: 'Tony Stark', plan: 'Corporate Unlimited', status: 'active', statusLabel: 'Active' },
];

export default function MembersScreen() {
  const { colors, spacing } = useTheme();
  const { lightImpact } = useHaptics();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredMembers = MOCK_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = () => {
    setRefreshing(true);
    lightImpact();
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const getStatusType = (status: Member['status']) => {
    if (status === 'active') return 'success';
    if (status === 'warning') return 'warning';
    return 'error';
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header Wrapper */}
      <View style={[styles.headerContainer, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomColor: colors.border }]}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search members by name..."
        />
      </View>

      {/* Members FlatList */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={[styles.listContainer, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
            <ListItem
              title={item.name}
              subtitle={item.plan}
              onPress={() => {}}
              leftComponent={<UserAvatar name={item.name} size={36} />}
              rightComponent={
                <StatusBadge label={item.statusLabel} type={getStatusType(item.status)} />
              }
            />
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
});
