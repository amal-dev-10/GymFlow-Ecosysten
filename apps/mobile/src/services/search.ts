import { CreditCard, Award, ScanLine, Dumbbell, Package, BarChart2, Bell, Settings, LogOut, UserPlus, UserCog, Activity, Snowflake, RefreshCw, Key } from 'lucide-react-native';

export interface CommandAction {
  id: string;
  title: string;
  category: 'commands';
  icon: any;
  permission: string;
  route?: string;
  actionType?: 'logout' | 'workspace_switch' | 'alert';
}

export const COMMAND_ACTIONS: CommandAction[] = [
  { id: 'c-member', title: 'Create Member', category: 'commands', icon: UserPlus, permission: 'manage-members', route: '/(app)/(members)/create' },
  { id: 'c-membership', title: 'Create Membership', category: 'commands', icon: Award, permission: 'create-membership', route: '/(app)/(memberships)/create' },
  { id: 'c-staff', title: 'Create Employee / Staff', category: 'commands', icon: UserCog, permission: 'manage-staff', route: '/(app)/(staffs)' },
  { id: 'c-checkin', title: 'Check In Member', category: 'commands', icon: ScanLine, permission: 'mark-attendance', route: '/(app)/(attendance)' },
  { id: 'c-payment', title: 'Collect Payment', category: 'commands', icon: CreditCard, permission: 'record-payment', route: '/(app)/(billing)/collect' },
  { id: 'c-workout', title: 'Assign Workout', category: 'commands', icon: Activity, permission: 'assign-workout' },
  { id: 'c-freeze', title: 'Freeze Membership', category: 'commands', icon: Snowflake, permission: 'freeze-membership' },
  { id: 'c-renew', title: 'Renew Membership', category: 'commands', icon: RefreshCw, permission: 'create-membership' },
  { id: 'c-reports', title: 'Open Financial Reports', category: 'commands', icon: BarChart2, permission: 'view-reports' },
  { id: 'c-settings', title: 'Open Settings', category: 'commands', icon: Settings, permission: 'view-dashboard' },
  { id: 'c-switch', title: 'Switch Workspace', category: 'commands', icon: Key, permission: 'view-dashboard', actionType: 'workspace_switch' },
];

export const STATIC_PAGES = [
  { id: 's-dashboard', title: 'Dashboard', subtitle: 'View snapshot & metrics', category: 'settings', route: '/(app)/(dashboard)', icon: Settings },
  { id: 's-members', title: 'Members List', subtitle: 'View all active & inactive members', category: 'settings', route: '/(app)/(members)', icon: Settings },
  { id: 's-billing', title: 'Billing Dashboard', subtitle: 'Invoices, dues & payments', category: 'settings', route: '/(app)/(billing)', icon: Settings },
  { id: 's-attendance', title: 'Attendance logs', subtitle: 'Live status & scanner', category: 'settings', route: '/(app)/(attendance)', icon: Settings },
];
