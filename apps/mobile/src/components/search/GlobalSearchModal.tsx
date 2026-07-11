import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Modal, Text, Pressable, TextInput, ScrollView, Alert, Platform, ActivityIndicator, Linking } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle, withTiming, withSpring, useSharedValue } from 'react-native-reanimated';
import { Search, X, Mic, Pin, Star, Check, Phone, ArrowRight, CornerDownLeft, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { useTheme } from '../../theme/theme';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { useSearchStore, SearchResultItem } from '../../store/search.store';
import { COMMAND_ACTIONS, STATIC_PAGES } from '../../services/search';
import { useMembers } from '../../hooks/useMembers';
import { useHaptics } from '../../hooks/useHaptics';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { UserAvatar } from '../UserAvatar';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'members', label: 'Members' },
  { id: 'commands', label: 'Commands' },
  { id: 'payments', label: 'Payments' },
  { id: 'settings', label: 'Settings' }
];

function HighlightText({ text, query, style, highlightStyle }: { text: string; query: string; style: any; highlightStyle: any }) {
  if (!query) return <Text style={style}>{text}</Text>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <Text key={i} style={part.toLowerCase() === query.toLowerCase() ? highlightStyle : undefined}>
          {part}
        </Text>
      ))}
    </Text>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function GlobalSearchModal() {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { can, clearWorkspace, activeGymId } = useWorkspace();
  const { lightImpact, mediumImpact } = useHaptics();
  const { isOffline } = useNetworkStatus();

  const { isOpen, closeSearch, recentSearches, pinnedFavorites, addRecent, togglePin, clearRecent, initialCategory } = useSearchStore();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Sync category filter when modal opens
  useEffect(() => {
    if (isOpen && initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Reset active item index on query change
  useEffect(() => {
    setActiveItemIndex(0);
  }, [query, selectedCategory]);

  // Fetch members via infinite query
  const { data: membersData, isLoading: isLoadingMembers } = useMembers(
    selectedCategory === 'all' || selectedCategory === 'members' ? debouncedQuery : '',
    {}
  );
  
  const members = useMemo(() => {
    return membersData?.pages.flatMap((page) => page.data) || [];
  }, [membersData]);

  // Build searchable commands based on RBAC
  const availableCommands = useMemo(() => {
    return COMMAND_ACTIONS.filter(cmd => can(cmd.permission as any));
  }, [can]);

  // Filter and build results
  const results = useMemo(() => {
    let finalResults: SearchResultItem[] = [];

    // 1. Match Commands
    if (selectedCategory === 'all' || selectedCategory === 'commands') {
      const matchedCmds = availableCommands
        .filter(cmd => cmd.title.toLowerCase().includes(debouncedQuery.toLowerCase()))
        .map(cmd => ({
          id: cmd.id,
          title: cmd.title,
          subtitle: 'Global command action',
          category: 'commands' as const,
          icon: cmd.icon,
          route: cmd.route,
          actionType: cmd.actionType,
        }));
      finalResults.push(...matchedCmds);
    }

    // 2. Match Static / Setting Pages
    if (selectedCategory === 'all' || selectedCategory === 'settings') {
      const matchedSettings = STATIC_PAGES
        .filter(page => page.title.toLowerCase().includes(debouncedQuery.toLowerCase()))
        .map(page => ({
          id: page.id,
          title: page.title,
          subtitle: page.subtitle,
          category: 'settings' as const,
          icon: page.icon,
          route: page.route,
        }));
      finalResults.push(...matchedSettings);
    }

    // 3. Match Members (retrieved from React Query API hook)
    if (selectedCategory === 'all' || selectedCategory === 'members') {
      const matchedMembers = members.map(m => ({
        id: m.id,
        title: `${m.firstName} ${m.lastName}`,
        subtitle: m.phoneNumber || m.email || 'No contact info',
        category: 'members' as const,
        status: m.activeMembership?.status || 'inactive',
        payload: m,
      }));
      finalResults.push(...matchedMembers);
    }

    return finalResults;
  }, [debouncedQuery, selectedCategory, availableCommands, members]);

  const handleSelectResult = (item: SearchResultItem) => {
    mediumImpact();
    addRecent(item);
    closeSearch();

    if (item.category === 'commands') {
      if (item.actionType === 'workspace_switch') {
        clearWorkspace();
        router.replace('/(lobby)/organizations');
      } else if (item.route) {
        router.push(item.route as any);
      } else {
        Alert.alert(item.title, `${item.title} initiated!`);
      }
    } else if (item.category === 'members') {
      router.push(`/(app)/(members)/${item.id}` as any);
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleCallMember = (phone: string) => {
    lightImpact();
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to place call'));
  };

  const handleWhatsAppMember = (phone: string) => {
    lightImpact();
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
      Linking.openURL(`https://wa.me/${phone}`).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed');
      });
    });
  };

  const renderResultItem = ({ item, index }: { item: SearchResultItem; index: number }) => {
    const isSelected = index === activeItemIndex;
    const isPinned = pinnedFavorites.some((x) => x.id === item.id);
    
    // Pick icon
    let ItemIcon = item.icon || Search;
    if (item.category === 'members') {
      return (
        <Pressable
          onPress={() => handleSelectResult(item)}
          style={[
            styles.resultRow,
            { 
              backgroundColor: isSelected ? colors.primaryLight : 'transparent',
              borderRadius: radius.md,
              borderColor: isSelected ? colors.primary : 'transparent',
              borderWidth: 1,
            }
          ]}
        >
          <UserAvatar name={item.title} size={36} />
          <View style={styles.resultMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <HighlightText 
                text={item.title} 
                query={debouncedQuery} 
                style={[styles.resultTitle, { color: colors.text }]} 
                highlightStyle={{ color: colors.primary, fontWeight: '700' }} 
              />
              {item.status && (
                <View style={[styles.statusTag, { backgroundColor: item.status === 'active' ? colors.successLight : colors.errorLight }]}>
                  <Text style={{ fontSize: 9, color: item.status === 'active' ? colors.successText : colors.errorText, fontWeight: '600' }}>
                    {item.status}
                  </Text>
                </View>
              )}
            </View>
            <HighlightText 
              text={item.subtitle} 
              query={debouncedQuery} 
              style={[styles.resultSubtitle, { color: colors.textSecondary }]} 
              highlightStyle={{ color: colors.primary }} 
            />
          </View>

          {/* Quick Contextual Actions */}
          <View style={styles.itemActions}>
            {item.payload?.phoneNumber && (
              <>
                <Pressable onPress={() => handleWhatsAppMember(item.payload.phoneNumber)} style={styles.actionBtn}>
                  <MessageCircle size={16} color={colors.success} />
                </Pressable>
                <Pressable onPress={() => handleCallMember(item.payload.phoneNumber)} style={styles.actionBtn}>
                  <Phone size={16} color={colors.primary} />
                </Pressable>
              </>
            )}
            <Pressable onPress={() => togglePin(item)} style={styles.actionBtn}>
              <Pin size={16} color={isPinned ? colors.warning : colors.textMuted} fill={isPinned ? colors.warning : 'transparent'} />
            </Pressable>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => handleSelectResult(item)}
        style={[
          styles.resultRow,
          { 
            backgroundColor: isSelected ? colors.primaryLight : 'transparent',
            borderRadius: radius.md,
            borderColor: isSelected ? colors.primary : 'transparent',
            borderWidth: 1,
          }
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
          <ItemIcon size={20} color={colors.textSecondary} />
        </View>
        <View style={styles.resultMeta}>
          <HighlightText 
            text={item.title} 
            query={debouncedQuery} 
            style={[styles.resultTitle, { color: colors.text }]} 
            highlightStyle={{ color: colors.primary, fontWeight: '700' }} 
          />
          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
        </View>

        <View style={styles.itemActions}>
          <Pressable onPress={() => togglePin(item)} style={styles.actionBtn}>
            <Pin size={16} color={isPinned ? colors.warning : colors.textMuted} fill={isPinned ? colors.warning : 'transparent'} />
          </Pressable>
          <ArrowRight size={16} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={closeSearch}>
      {/* Backdrop */}
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(200)} 
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 }]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeSearch} />
      </Animated.View>

      {/* Main Panel */}
      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(250)}
        style={[
          styles.modalContainer,
          { 
            backgroundColor: colors.background, 
            paddingTop: Math.max(insets.top, spacing.md),
          }
        ]}
      >
        {/* Search Input Bar */}
        <View style={[styles.searchBar, { borderBottomColor: colors.border, paddingHorizontal: spacing.md }]}>
          <Pressable onPress={closeSearch} style={{ padding: 6, marginRight: 4 }}>
            <ArrowLeft size={22} color={colors.textSecondary} />
          </Pressable>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Type a command or search entities..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, fontSize: typography.sizes.body.fontSize }]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => Alert.alert('Voice Search', 'Voice search architecture integrated — speech recognition coming soon!')} style={styles.clearBtn}>
              <Mic size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Category Selector */}
        <View style={{ height: 44, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.catChip,
                    { 
                      backgroundColor: isActive ? colors.primary : 'transparent',
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: 1,
                      borderRadius: radius.full
                    }
                  ]}
                >
                  <Text style={{ color: isActive ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Search Results Area */}
        <View style={styles.listWrap}>
          {isLoadingMembers && query.length > 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : query.length === 0 ? (
            /* Recent & Favorites view */
            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
              {/* Pinned Favorites */}
              {pinnedFavorites.length > 0 && (
                <View style={{ marginBottom: spacing.xl }}>
                  <View style={styles.sectionHeader}>
                    <Star size={16} color={colors.warning} fill={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Favorites</Text>
                  </View>
                  <View style={{ gap: spacing.sm }}>
                    {pinnedFavorites.map(item => (
                      <Pressable key={item.id} onPress={() => handleSelectResult(item)} style={[styles.recentItem, { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.title}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.category}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Recent Searches */}
              <View style={{ marginBottom: spacing.xl }}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Searches</Text>
                  {recentSearches.length > 0 && (
                    <Pressable onPress={clearRecent}>
                      <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Clear All</Text>
                    </Pressable>
                  )}
                </View>
                {recentSearches.length > 0 ? (
                  <View style={{ gap: spacing.sm }}>
                    {recentSearches.map(item => (
                      <Pressable key={item.id} onPress={() => handleSelectResult(item)} style={[styles.recentItem, { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{item.title}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.category}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13 }}>No recent searches</Text>
                )}
              </View>

              {/* Suggestions */}
              <View>
                <View style={styles.sectionHeader}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Suggested Commands</Text>
                </View>
                <View style={{ gap: spacing.sm }}>
                  {availableCommands.slice(0, 3).map(cmd => (
                    <Pressable 
                      key={cmd.id} 
                      onPress={() => handleSelectResult(cmd as any)} 
                      style={[styles.recentItem, { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <cmd.icon size={16} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{cmd.title}</Text>
                      </View>
                      <CornerDownLeft size={14} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : results.length > 0 ? (
            /* Results List */
            <FlashList
              data={results}
              renderItem={renderResultItem}
              keyExtractor={(item) => item.id}
              estimatedItemSize={64}
              contentContainerStyle={{ padding: spacing.lg }}
            />
          ) : (
            /* No results empty state */
            <View style={styles.center}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No results found</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginHorizontal: 40, marginBottom: spacing.lg }}>
                We couldn't find anything matching "{query}".
              </Text>
              <Pressable
                onPress={() => {
                  setQuery('');
                  setSelectedCategory('all');
                }}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Clear Search & Filters</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Offline Indicator Footer */}
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.error }]}>
            <Text style={styles.offlineText}>Search running in Offline mode (Recent & Cached results only)</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 11,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 8,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  listWrap: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMeta: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  offlineBanner: {
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  }
});
