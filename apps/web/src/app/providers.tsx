'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionProvider } from '../context/subscription';

export default function Providers({ children }: { children: React.ReactNode }) {
 const [queryClient] = useState(
 () =>
 new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 15_000,
 retry: 1,
 refetchOnWindowFocus: false,
 },
 },
 })
 );

 return (
 <QueryClientProvider client={queryClient}>
 <SubscriptionProvider>{children}</SubscriptionProvider>
 </QueryClientProvider>
 );
}
