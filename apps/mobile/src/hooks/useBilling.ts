import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, TransactionDto } from '../lib/api';

export function useBillingDashboard(gymId: string) {
  return useQuery({
    queryKey: ['billingDashboard', gymId],
    queryFn: () => billingApi.getDashboardStats(gymId),
    enabled: !!gymId,
  });
}

export function useTransactions(gymId: string) {
  return useQuery({
    queryKey: ['transactions', gymId],
    queryFn: () => billingApi.listTransactions(gymId),
    enabled: !!gymId,
  });
}

export function usePendingDues(gymId: string) {
  return useQuery({
    queryKey: ['pendingDues', gymId],
    queryFn: () => billingApi.listPendingDues(gymId),
    enabled: !!gymId,
  });
}

export function useInvoices(gymId: string) {
  return useQuery({
    queryKey: ['invoices', gymId],
    queryFn: () => billingApi.listInvoices(gymId),
    enabled: !!gymId,
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useReceipt(receiptId: string) {
  return useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => billingApi.getReceipt(receiptId),
    enabled: !!receiptId,
  });
}

export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => billingApi.collectPayment(payload),
    onSuccess: (data: TransactionDto, variables: any) => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['billingDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDues'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
