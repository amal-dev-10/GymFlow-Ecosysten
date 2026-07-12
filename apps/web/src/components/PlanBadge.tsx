'use client';

import { Sparkles } from 'lucide-react';
import { useSubscriptionContext } from '../context/subscription';
import { Badge } from './ui/Badge';
import { cn } from './ui/cn';

/**
 * Plan indicator reading the shared SubscriptionProvider (see
 * context/subscription.tsx) rather than fetching its own copy - renders
 * nothing while loading or if there's no reachable subscription, so it's
 * safe to drop into any authenticated tenant page without extra plumbing.
 */
export function PlanBadge({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const { subscription, loading } = useSubscriptionContext();

  if (loading || !subscription) return null;

  const isTrialing = !!subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date();

  return (
    <Badge tone="info" size={size} className={cn('shrink-0', className)}>
      {/* <Sparkles size={11} className="shrink-0" /> */}
      {subscription.plan.name}
      {isTrialing && <span className="opacity-70">· Trial</span>}
    </Badge>
  );
}
