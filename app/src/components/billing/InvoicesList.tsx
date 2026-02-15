// HealthGuide Invoices List Component
// Displays invoice history with download links

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { createShadow } from '@/theme/spacing';

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  invoice_number: string | null;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface InvoicesListProps {
  agencyId: string;
}

function CheckIcon({ size = 12, color = '#065F46' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertIcon({ size = 12, color = '#92400E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M12 8v4M12 16h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DownloadIcon({ size = 20, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InvoicesList({ agencyId }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [agencyId]);

  async function fetchInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (data) {
      setInvoices(data);
    }
    setLoading(false);
  }

  function handleViewInvoice(invoice: Invoice) {
    if (invoice.hosted_invoice_url) {
      Linking.openURL(invoice.hosted_invoice_url);
    }
  }

  function handleDownloadPDF(invoice: Invoice) {
    if (invoice.invoice_pdf) {
      Linking.openURL(invoice.invoice_pdf);
    }
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case 'paid':
        return { bg: '#D1FAE5', text: '#065F46', icon: CheckIcon };
      case 'open':
        return { bg: '#FEF3C7', text: '#92400E', icon: AlertIcon };
      case 'uncollectible':
      case 'void':
        return { bg: '#FEE2E2', text: '#991B1B', icon: AlertIcon };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', icon: AlertIcon };
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Invoice History</Text>
        <View style={styles.loading}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Invoice History</Text>

      {invoices.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No invoices yet</Text>
          <Text style={styles.emptySubtext}>
            Your invoices will appear here after your first billing cycle
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {invoices.map((invoice) => {
            const statusConfig = getStatusConfig(invoice.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Pressable
                key={invoice.id}
                style={styles.invoiceRow}
                onPress={() => handleViewInvoice(invoice)}
              >
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>
                    {invoice.invoice_number || invoice.stripe_invoice_id.slice(-8)}
                  </Text>
                  <Text style={styles.invoiceDate}>
                    {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                  </Text>
                </View>

                <View style={styles.invoiceAmount}>
                  <Text style={styles.amount}>
                    ${(invoice.amount_due / 100).toFixed(2)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <StatusIcon color={statusConfig.text} />
                    <Text style={[styles.statusText, { color: statusConfig.text }]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {invoice.invoice_pdf && (
                  <Pressable
                    style={styles.downloadButton}
                    onPress={() => handleDownloadPDF(invoice)}
                  >
                    <DownloadIcon />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...createShadow(2, 0.05, 8, 2),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  list: {
    gap: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  invoiceDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downloadButton: {
    padding: 8,
    marginLeft: 4,
  },
});
