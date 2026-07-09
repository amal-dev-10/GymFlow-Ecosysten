# GymFlow Staff Mobile Production Release & Architectural Guide

This document represents the ultimate release reference and architectural specification for the GymFlow Staff Mobile App.

---

## 1. Directory Structure Specifications

```
apps/mobile/
├── app/                        # Expo Router filesystem navigation roots
│   ├── (app)/                  # Main Workspace dashboard, members, billing, check-in, reports, staffs, notifications
│   ├── (auth)/                 # OTP verification, sign-in panels, and register workflows
│   ├── (lobby)/                # Organization switchboard and Gym Branch selectors
│   ├── index.tsx               # Redirect bootloader
│   └── +not-found.tsx          # 404 Fallback
├── src/
│   ├── components/             # Premium Design System modular UI components
│   │   ├── billing/            # Invoices, transactions, payments
│   │   ├── dashboard/          # Metric grids and quick actions
│   │   ├── members/            # Profiles, checkins, list row visual haptics
│   │   ├── navigation/         # Header overlays, command center models, CustomTabBar
│   │   ├── reports/            # MobileCharts SVG visual render elements
│   │   ├── trainer/            # Workouts calendars, schedules lists
│   │   ├── ErrorBoundary.tsx   # Uncaught render exception safety shell
│   │   ├── ErrorState.tsx      # Inline exception card
│   │   ├── PrimaryButton.tsx   # Premium scaled haptic-feedback button with icon support
│   │   └── SkeletonLoader.tsx  # Layout placeholder grids
│   ├── hooks/                  # Utility React Hooks (Haptic controllers, keyboard height trackers)
│   ├── lib/                    # SDK configurations (API core, MMKV instances, Offline queues)
│   ├── providers/              # Theme contextual state layers
│   └── store/                  # Zustand client-side persistent storage containers
```

---

## 2. Technical Stack & Architecture

### A. State Management & Offline Mode
- **Client Cache**: Managed via **React Query** (`@tanstack/react-query`) with custom cache timeouts.
- **Local Persistence**: Client-side authentication states, workspace tokens, theme options, and notification inbox states are managed using **Zustand** stores backed by **MMKV** (`react-native-mmkv`) for ultra-low latency reading/writing.
- **Offline Synchronization Queue**: All write operations (PT notes, check-outs, measurements logs) are enqueued to a local offline store and retried automatically once connection returns.

### B. Stable Network Layer
- **Client**: Axios-like wrapper built on native `fetch`.
- **Resilience Features**:
  - Auto-injection of tenant variables (`x-organization-id`) based on workspace state.
  - Abort signals that automatically time out after 15 seconds.
  - Transparent dual-retry logic for transient error codes on read operations.
  - Coalescence of concurrent token requests to prevent auth token churn.

### C. Error Boundary & Safety Shields
- **Global Catch**: React Class `ErrorBoundary` wraps the entire navigation tree. If a component fails to render, a themed fallback UI is shown with full exception trace info, allowing developers to debug easily while preserving local MMKV storage configurations.
- **Query Fallbacks**: Network failures bypass crashes and instead display `ErrorState` inline cards, automatically ignoring permission issues on administrative datasets to avoid breaking general features.

---

## 3. Developer Guidelines & Coding Standards

1. **Accessibility**: All buttons and pressable rows must supply `accessibilityLabel`, `accessibilityRole`, and `accessibilityState`.
2. **Typography**: Do not use hardcoded font sizes. Always consume typography values from `useTheme()` to respect users' dynamic font size configurations.
3. **Animations**: Use React Native Reanimated (`react-native-reanimated`) for interactions. All custom buttons must utilize the spring scale animation to maximize user engagement.
4. **Theme Hygiene**: No hardcoded color strings (e.g., `#FFF`, `#000`) are allowed. Retrieve colors from the semantic swatches provided by the `useTheme()` hook to ensure light/dark themes look premium.
