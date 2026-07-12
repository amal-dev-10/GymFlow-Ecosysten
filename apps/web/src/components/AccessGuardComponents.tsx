'use client';

import React from 'react';
import { useAccessControl } from '../context/access-control';
import { Lock } from 'lucide-react';

interface GuardProps {
 children: React.ReactNode;
 fallback?: React.ReactNode;
}

interface PermissionGuardProps extends GuardProps {
 permission: string;
 disabledMode?: boolean; // Renders the children wrapped in a disabled visual state instead of hiding it
}

export function PermissionGuard({ children, permission, fallback = null, disabledMode = false }: PermissionGuardProps) {
 const { hasPermission } = useAccessControl();

 if (hasPermission(permission)) {
 return <>{children}</>;
 }

 if (disabledMode) {
 return (
 <div className="relative group cursor-not-allowed select-none opacity-40 pointer-events-none">
 {children}
 <div className="absolute -top-1.5 -right-1.5 bg-danger-light text-neutral-900 rounded-full p-0.5 shadow-md">
 <Lock size={8} />
 </div>
 </div>
 );
 }

 return <>{fallback}</>;
}

interface FeatureGuardProps extends GuardProps {
 feature: string;
}

export function FeatureGuard({ children, feature, fallback = null }: FeatureGuardProps) {
 const { hasFeature } = useAccessControl();

 if (hasFeature(feature)) {
 return <>{children}</>;
 }

 return <>{fallback}</>;
}

interface GymGuardProps extends GuardProps {
 gymId: string;
}

export function GymGuard({ children, gymId, fallback = null }: GymGuardProps) {
 const { hasGymAccess } = useAccessControl();

 if (hasGymAccess(gymId)) {
 return <>{children}</>;
 }

 return <>{fallback}</>;
}
