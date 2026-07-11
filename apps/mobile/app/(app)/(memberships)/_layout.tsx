import { Stack, useRouter, useSegments } from 'expo-router';
import { IconButton } from '../../../src/components/IconButton';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/theme';

export default function MembershipsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { colors, typography } = useTheme();

  const currentScreen = segments[segments.length - 1];
  const isRoot = currentScreen === 'plans' || currentScreen === '(memberships)' || currentScreen === 'index';

  const handleBack = () => {
    if (isRoot) {
      router.replace('/(app)/(more)');
    } else {
      router.back();
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: typography.sizes.title.fontSize,
          fontWeight: typography.sizes.title.fontWeight,
        },
        headerShadowVisible: false,
        headerLeft: () => (
          <IconButton
            icon={<ChevronLeft size={24} color={colors.text} />}
            onPress={handleBack}
            accessibilityLabel="Go back"
            style={{ marginLeft: -8 }}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Memberships', gestureEnabled: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Membership Details' }} />
      <Stack.Screen name="create" options={{ title: 'New Membership', presentation: 'modal' }} />
      <Stack.Screen name="renew" options={{ title: 'Renew Membership', presentation: 'modal' }} />
      <Stack.Screen name="freeze" options={{ title: 'Freeze Membership', presentation: 'modal' }} />
      <Stack.Screen name="adjust" options={{ title: 'Adjust Membership', presentation: 'modal' }} />
      <Stack.Screen name="plans" options={{ title: 'Membership Plans', gestureEnabled: false }} />
      <Stack.Screen name="plans-create" options={{ title: 'Create Plan', presentation: 'modal' }} />
    </Stack>
  );
}
