import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface ReportData {
  period: string;
  revenue: string;
  cost: string;
  expenses: string;
  profit: string;
  credit: string;
  transactions: any[];
}

type ReportSummary = {
  [key: string]: unknown;
  source?: string;
  period?: string;
  totalRevenue?: number;
  totalExpenses?: number;
  cashSales?: number;
  creditSales?: number;
  netProfit?: number;
  netIncome?: number;
  totalTransactions?: number;
  currentInventoryValue?: number;
  periodInventorySpend?: number;
  totalUnitsSold?: number;
  businessName?: string | null;
  ownerName?: string | null;
  generatedAt?: string;
  startDateLabel?: string;
  endDateLabel?: string;
};

type ResolvedReport = {
  blob: Blob;
  filename: string;
  summary?: ReportSummary;
};

export const useReportsDownload = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const formatPeriodLabel = (period: string) => {
    const map: Record<string, string> = {
      week: 'Weekly',
      month: 'Monthly',
      quarter: 'Quarterly',
      year: 'Yearly',
    };
    const normalized = typeof period === 'string' ? period.toLowerCase() : '';
    if (map[normalized]) {
      return map[normalized];
    }
    return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'Custom';
  };

  const generateReportDocumentNumber = (type: 'sales_report' | 'financial_statement') => {
    const prefix = type === 'sales_report' ? 'SR' : 'FS';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const normalizeNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  };

  const recordReportDocument = async (params: {
    type: 'sales_report' | 'financial_statement';
    period: string;
    filename: string;
    summary?: ReportSummary;
  }): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    const { type, period, filename, summary } = params;

    try {
      const documentNumber = generateReportDocumentNumber(type);
      const periodLabel = formatPeriodLabel(period);
      const titleBase = type === 'sales_report' ? 'Sales Report' : 'Financial Statement';
      const businessName = typeof summary?.businessName === 'string' && summary.businessName
        ? summary.businessName
        : 'Business Overview';
      const totalAmount = type === 'sales_report'
        ? normalizeNumber(summary?.totalRevenue)
        : normalizeNumber(summary?.netIncome ?? summary?.netProfit);

      const content = {
        filename,
        period,
        summary: summary ?? null,
        generatedAt: typeof summary?.generatedAt === 'string' ? summary.generatedAt : new Date().toISOString(),
      };

      const { error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: type,
          document_number: documentNumber,
          title: `${titleBase} - ${periodLabel}`,
          customer_name: businessName,
          total_amount: totalAmount,
          content,
          status: 'issued',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Failed to record ${params.type} in document history:`, error);
      return false;
    }
  };

  const generateSalesReport = async (period: string) => {
    if (!user) return;

    const periodLabel = formatPeriodLabel(period);

    try {
      toast({
        title: "Generating Sales Report",
        description: "Your comprehensive sales report is being prepared...",
      });

      const { data, error } = await supabase.functions.invoke('generate-sales-report', {
        body: {
          period: period,
          userId: user.id
        }
      });

      if (error) throw error;

      const { blob, filename, summary } = resolveReportBlob(data, {
        fallbackFilename: `sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const recorded = await recordReportDocument({
        type: 'sales_report',
        period,
        filename,
        summary,
      });

      toast({
        title: "📊 Sales Report Downloaded!",
        description: recorded
          ? `${periodLabel} sales report saved to your downloads and document history.`
          : `${periodLabel} sales report saved to your downloads.`,
      });

    } catch (error) {
      console.error('Error generating sales report:', error);
      toast({
        title: "Error",
        description: "Failed to generate sales report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateFinancialStatement = async (period: string) => {
    if (!user) return;

    const periodLabel = formatPeriodLabel(period);

    try {
      toast({
        title: "Generating Financial Statement",
        description: "Your comprehensive financial statement is being prepared...",
      });

      const { data, error } = await supabase.functions.invoke('generate-financial-statement', {
        body: {
          period: period,
          userId: user.id
        }
      });

      if (error) throw error;

      const { blob, filename, summary } = resolveReportBlob(data, {
        fallbackFilename: `financial_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const recorded = await recordReportDocument({
        type: 'financial_statement',
        period,
        filename,
        summary,
      });

      toast({
        title: "📋 Financial Statement Downloaded!",
        description: recorded
          ? `${periodLabel} financial statement saved to your downloads and document history.`
          : `${periodLabel} financial statement saved to your downloads.`,
      });

    } catch (error) {
      console.error('Error generating financial statement:', error);
      toast({
        title: "Error",
        description: "Failed to generate financial statement. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateRecommendations = (data: ReportData): string[] => {
    const recommendations = [];
    const revenue = parseFloat(data.revenue.replace(',', ''));
    const profit = parseFloat(data.profit.replace(',', ''));
    const credit = parseFloat(data.credit.replace(',', ''));

    if (revenue > 0) {
      const profitMargin = (profit / revenue) * 100;
      const creditRatio = (credit / revenue) * 100;

      if (profitMargin < 15) {
        recommendations.push('Consider reviewing pricing strategy to improve profit margins');
      }
      if (creditRatio > 30) {
        recommendations.push('High credit sales - focus on collections to improve cash flow');
      }
      if (profitMargin > 30) {
        recommendations.push('Excellent profit margin - consider expanding successful product lines');
      }
    }

    return recommendations;
  };

  const getStartDate = (period: string): string => {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      default:
        return new Date().toISOString().split('T')[0];
    }
  };

  const calculateInventoryValue = (receipts: any[]): string => {
    const total = receipts?.reduce((sum, receipt) => sum + Number(receipt.total_cost || 0), 0) || 0;
    return total.toFixed(2);
  };

  const getExpensesByCategory = (expenses: any[]): string[] => {
    const categories = new Map<string, number>();
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const amount = Number(expense.amount || 0);
      categories.set(category, (categories.get(category) || 0) + amount);
    });

    return Array.from(categories.entries()).map(([category, amount]) =>
      `${category},₵${amount.toFixed(2)}`
    );
  };

  const generateReceipt = async (saleData: {
    saleId: string;
    customerName?: string;
    customerPhone: string;
    productName: string;
    amount: number;
    paymentMethod: string;
    purchaseDate: string;
  }) => {
    if (!user) return;

    try {
      toast({
        title: "Generating Receipt",
        description: "Your receipt is being prepared...",
      });

      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: {
          ...saleData,
          userId: user.id
        }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${saleData.saleId}_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "🧾 Receipt Downloaded!",
        description: "Receipt has been saved to your downloads.",
      });

    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    generateSalesReport,
    generateFinancialStatement,
    generateReceipt
  };
};

const resolveReportBlob = (
  payload: unknown,
  options: { fallbackFilename: string }
): ResolvedReport => {
  let summary: ReportSummary | undefined;

  if (payload && typeof payload === 'object' && 'content' in payload) {
    const data = payload as { content?: string; mimeType?: string; filename?: string; summary?: ReportSummary };
    if (data.content) {
      const csvBytes = Uint8Array.from(atob(data.content), (char) => char.charCodeAt(0));
      summary = data.summary;
      return {
        blob: new Blob([csvBytes], { type: data.mimeType || 'text/csv;charset=utf-8' }),
        filename: data.filename || options.fallbackFilename,
        summary,
      };
    }
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as { content?: string; mimeType?: string; filename?: string; summary?: ReportSummary };
      if (parsed?.content) {
        const csvBytes = Uint8Array.from(atob(parsed.content), (char) => char.charCodeAt(0));
        summary = parsed.summary;
        return {
          blob: new Blob([csvBytes], { type: parsed.mimeType || 'text/csv;charset=utf-8' }),
          filename: parsed.filename || options.fallbackFilename,
          summary,
        };
      }
    } catch {
      // fall through to treat as plain CSV text
    }

    const csvWithBom = `\uFEFF${payload}`;
    return {
      blob: new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' }),
      filename: options.fallbackFilename,
      summary,
    };
  }

  // Unexpected payload; return empty CSV to avoid runtime error
  return {
    blob: new Blob(['No data'], { type: 'text/csv;charset=utf-8' }),
    filename: options.fallbackFilename,
    summary,
  };
};