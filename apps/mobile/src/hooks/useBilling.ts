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

interface CollectPaymentInput {
  invoiceId: string;
  amount: number;
  method?: string;
  memberName?: string;
  type?: string;
}

export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CollectPaymentInput) => billingApi.collectPayment(payload),
    onSuccess: (_data: TransactionDto, variables: CollectPaymentInput) => {
      // Refresh every view that reads off the subscription ledger.
      queryClient.invalidateQueries({ queryKey: ['billingDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDues'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      // Membership/member screens surface the same amountPaid/outstanding.
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
