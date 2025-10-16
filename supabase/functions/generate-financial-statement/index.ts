import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type SupabaseClientLike = ReturnType<typeof createClient>;

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type ReportSaleRow = {
  purchase_date: string;
  product_name: string | null;
  effective_amount: number | null;
  effective_quantity: number | null;
  payment_method: string | null;
  customer_phone: string | null;
  is_credit_sale: boolean | null;
};

type CustomerPurchaseRow = {
  id: string;
  product_name: string;
  amount: number | null;
  quantity: number | null;
  payment_method: string | null;
  purchase_date: string;
  customer_phone: string | null;
  business_id: string;
};

type SaleReversalRow = {
  original_sale_id: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialStatementRequest {
  period: string;
  userId: string;
}

const buildDateRange = (period: string) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate };
};

const fetchBusinessProfiles = async (supabase: SupabaseClientLike, userId: string) => {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('id, business_name, owner_name, business_address')
    .eq('user_id', userId);

  if (error) {
    console.error('Business profile error:', error);
    return [] as Array<{ id: string; business_name: string | null; owner_name: string | null; business_address: string | null }>;
  }

  return (data ?? []) as Array<{ id: string; business_name: string | null; owner_name: string | null; business_address: string | null }>;
};

const fetchSalesRows = async (
  supabase: SupabaseClientLike,
  params: {
    userId: string;
    businessIds: string[];
    startIso: string;
    endIso: string;
  }
): Promise<{ rows: ReportSaleRow[]; source: 'analytics' | 'fallback' }> => {
  const { userId, businessIds, startIso, endIso } = params;

  const { data: analyticsData, error: analyticsError } = await supabase
    .from('sales_analytics')
    .select('purchase_date, product_name, effective_amount, effective_quantity, payment_method, customer_phone, is_credit_sale')
    .eq('user_id', userId)
    .gte('purchase_date', startIso)
    .lte('purchase_date', endIso)
    .order('purchase_date', { ascending: false });

  if (!analyticsError && Array.isArray(analyticsData)) {
    const rows = (analyticsData as ReportSaleRow[]).map((sale: ReportSaleRow) => ({
      ...sale,
      payment_method: typeof sale.payment_method === 'string' ? sale.payment_method.toLowerCase() : sale.payment_method
    }));
    return { rows, source: 'analytics' as const };
  }

  if (analyticsError) {
    console.error('Sales analytics error, falling back to purchases:', analyticsError);
  }

  if (!businessIds.length) {
    return { rows: [], source: 'fallback' as const };
  }

  const { data: purchasesData, error: purchasesError } = await supabase
    .from('customer_purchases')
    .select('id, product_name, amount, quantity, payment_method, purchase_date, customer_phone, business_id')
    .in('business_id', businessIds)
    .gte('purchase_date', startIso)
    .lte('purchase_date', endIso)
    .order('purchase_date', { ascending: false });

  if (purchasesError) {
    console.error('Customer purchases fallback error:', purchasesError);
    throw purchasesError;
  }

  const saleIds = (purchasesData ?? []).map((sale: CustomerPurchaseRow) => sale.id);
  let reversalSet = new Set<string>();

  if (saleIds.length) {
    const { data: reversals, error: reversalError } = await supabase
      .from('sale_reversals')
      .select('original_sale_id')
      .eq('user_id', userId)
      .in('original_sale_id', saleIds);

    if (reversalError) {
      console.error('Sale reversals fallback error:', reversalError);
    } else {
      reversalSet = new Set((reversals ?? []).map((reversal: SaleReversalRow) => reversal.original_sale_id));
    }
  }

  const rows = (purchasesData ?? []).map((sale: CustomerPurchaseRow): ReportSaleRow => {
    const method = (sale.payment_method ?? 'cash').toLowerCase();
    const isReversed = method === 'reversed' || reversalSet.has(sale.id);
    const amount = Number(sale.amount ?? 0);
    const quantity = Number(sale.quantity ?? 1);

    return {
      purchase_date: sale.purchase_date,
      product_name: sale.product_name,
      effective_amount: isReversed ? 0 : amount,
      effective_quantity: isReversed ? 0 : quantity,
      payment_method: method,
      customer_phone: sale.customer_phone,
      is_credit_sale: method === 'credit',
    };
  });

  return { rows, source: 'fallback' as const };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { period, userId }: FinancialStatementRequest = await req.json();

    if (!period || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing period or userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const { startDate, endDate } = buildDateRange(period);
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const startDateLabel = startDate.toLocaleDateString();
    const endDateLabel = endDate.toLocaleDateString();

    const businessProfiles = await fetchBusinessProfiles(supabase, userId);
    const businessProfile = businessProfiles[0];
    const businessIds = businessProfiles.map((profile) => profile.id);

    const { rows: salesRows } = await fetchSalesRows(supabase, {
      userId,
      businessIds,
      startIso,
      endIso,
    });

    const [expensesData, inventoryData, receiptsData] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('expense_date', startIso.split('T')[0])
        .lte('expense_date', endIso.split('T')[0]),

      supabase
        .from('user_products')
        .select('product_name, current_stock, selling_price, average_cost, avg_cost_price')
        .eq('user_id', userId),

      supabase
        .from('inventory_receipts')
        .select('*')
        .eq('user_id', userId)
        .gte('received_date', startIso)
        .lte('received_date', endIso),
    ]);

    const totalRevenue = salesRows.reduce((sum: number, sale: ReportSaleRow) => sum + Number(sale.effective_amount ?? 0), 0);
    const totalExpenses = expensesData.data?.reduce((sum: number, expense: any) => sum + Number(expense.amount ?? 0), 0) || 0;
    const creditSales = salesRows.reduce((sum: number, sale: ReportSaleRow) => {
      const method = typeof sale.payment_method === 'string' ? sale.payment_method : '';
      const isCredit = Boolean(sale.is_credit_sale) || method === 'credit';
      return sum + (isCredit ? Number(sale.effective_amount ?? 0) : 0);
    }, 0);
    const cashSales = totalRevenue - creditSales;
    const totalUnitsSold = salesRows.reduce((sum: number, sale: ReportSaleRow) => sum + Number(sale.effective_quantity ?? 0), 0);

    const currentInventoryValue = inventoryData.data?.reduce((sum: number, product: any) => {
      const priceBasis = Number(product.selling_price ?? product.average_cost ?? product.avg_cost_price ?? 0);
      return sum + Number(product.current_stock ?? 0) * priceBasis;
    }, 0) || 0;

    const periodInventorySpend = receiptsData.data?.reduce((sum: number, receipt: any) => sum + Number(receipt.total_cost ?? 0), 0) || 0;

    const expensesByCategory = new Map<string, number>();
    expensesData.data?.forEach((expense: any) => {
      const category = expense.category || 'Other';
      const amount = Number(expense.amount || 0);
      expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + amount);
    });

    // Generate comprehensive financial statement
    const csvContent = [
      `FINANCIAL STATEMENT - ${period.toUpperCase()}`,
      `Generated on: ${new Date().toLocaleDateString()}`,
      `Period: ${startDateLabel} - ${endDateLabel}`,
      `Business: ${businessProfile?.business_name || 'N/A'}`,
      `Owner: ${businessProfile?.owner_name || 'N/A'}`,
      `Address: ${businessProfile?.business_address || 'N/A'}`,
      '',
      '=== INCOME STATEMENT ===',
      'REVENUE',
      `Total Sales Revenue,₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Cash Sales,₵${cashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Credit Sales,₵${creditSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      'EXPENSES',
      ...Array.from(expensesByCategory.entries()).map(([category, amount]) =>
        `${category},₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ),
      `Total Expenses,₵${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      'NET INCOME',
      `Gross Profit,₵${(totalRevenue - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Net Profit Margin,${totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0}%`,
      '',
      '=== BALANCE SHEET ===',
      'ASSETS',
      'Current Assets:',
      `Inventory Value,₵${currentInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Accounts Receivable,₵${creditSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Total Current Assets,₵${(currentInventoryValue + creditSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      'LIABILITIES',
      'Current Liabilities:',
      `Accounts Payable,₵0.00`,
      `Total Current Liabilities,₵0.00`,
      '',
      'EQUITY',
      `Retained Earnings,₵${(totalRevenue - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Total Equity,₵${(totalRevenue - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      '=== CASH FLOW ANALYSIS ===',
      `Cash from Operations,₵${cashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Cash from Investing,₵${(-periodInventorySpend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Net Cash Flow,₵${(cashSales - periodInventorySpend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      '=== KEY RATIOS ===',
      `Current Ratio,${creditSales > 0 ? ((currentInventoryValue + creditSales) / creditSales).toFixed(2) : 'N/A'}`,
      `Inventory Turnover,${currentInventoryValue > 0 ? (totalExpenses / currentInventoryValue).toFixed(2) : 'N/A'}`,
      `Units Sold,${totalUnitsSold}`,
      `Profit Margin,${totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0}%`,
      '',
      '=== DETAILED TRANSACTIONS ===',
      'Sales Transactions:',
      'Date,Product,Amount,Payment Method,Customer',
      ...salesRows.slice(0, 50).map((sale: ReportSaleRow) => {
        const method = typeof sale.payment_method === 'string' ? sale.payment_method : (sale.is_credit_sale ? 'credit' : 'cash');
        const amountFormatted = Number(sale.effective_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${new Date(sale.purchase_date).toLocaleDateString()},${sale.product_name || 'N/A'},₵${amountFormatted},${method || (sale.is_credit_sale ? 'credit' : 'cash')},${sale.customer_phone || 'N/A'}`;
      }),
      '',
      'Expense Transactions:',
      'Date,Category,Description,Amount,Vendor',
      ...(expensesData.data?.slice(0, 50).map((expense: any) =>
        `${new Date(expense.expense_date).toLocaleDateString()},${expense.category || 'Other'},${expense.description || 'N/A'},₵${Number(expense.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${expense.vendor_name || 'N/A'}`
      ) || []),
      '',
      '--- Financial Statement generated by Tralo Business Management System ---',
      'Powered by Tralo | https://tralo.com'
    ].join('\n');

    const csvWithBom = `\uFEFF${csvContent}`;
    const csvBytes = new TextEncoder().encode(csvWithBom);
    const base64Content = btoa(String.fromCharCode(...csvBytes));

    return new Response(
      JSON.stringify({
        filename: `financial_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv',
        content: base64Content,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );

  } catch (error: any) {
    console.error('Error generating financial statement:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);