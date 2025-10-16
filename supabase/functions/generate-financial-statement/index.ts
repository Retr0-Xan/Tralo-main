import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialStatementRequest {
  period: string;
  userId: string;
}

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

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    // Get business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get comprehensive financial data
    const [salesData, expensesData, inventoryData, receiptsData] = await Promise.all([
      supabase
        .from('sales_analytics')
        .select('purchase_date, product_name, effective_amount, effective_quantity, payment_method, customer_phone, is_credit_sale')
        .eq('user_id', userId)
        .gte('purchase_date', startDate.toISOString())
        .lte('purchase_date', endDate.toISOString()),

      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]),

      supabase
        .from('user_products')
        .select('product_name, current_stock, selling_price, average_cost, avg_cost_price')
        .eq('user_id', userId),

      supabase
        .from('inventory_receipts')
        .select('*')
        .eq('user_id', userId)
        .gte('received_date', startDate.toISOString())
    ]);

    // Calculate financial metrics
    const totalRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.effective_amount ?? 0), 0) || 0;
    const totalExpenses = expensesData.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    const creditSales = salesData.data?.filter((sale: any) => sale.is_credit_sale || sale.payment_method === 'credit')
      .reduce((sum: number, sale: any) => sum + Number(sale.effective_amount ?? 0), 0) || 0;
    const cashSales = totalRevenue - creditSales;
    const totalUnitsSold = salesData.data?.reduce((sum: number, sale: any) => sum + Number(sale.effective_quantity ?? 0), 0) || 0;

    const currentInventoryValue = inventoryData.data?.reduce((sum: number, product: any) => {
      const priceBasis = Number(product.selling_price ?? product.average_cost ?? product.avg_cost_price ?? 0);
      return sum + Number(product.current_stock ?? 0) * priceBasis;
    }, 0) || 0;

    const periodInventorySpend = receiptsData.data?.reduce((sum: number, receipt: any) => sum + Number(receipt.total_cost ?? 0), 0) || 0;

    // Group expenses by category
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
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
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
      ...(salesData.data?.slice(0, 50).map((sale: any) =>
        `${new Date(sale.purchase_date).toLocaleDateString()},${sale.product_name || 'N/A'},₵${Number(sale.effective_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${sale.payment_method || (sale.is_credit_sale ? 'credit' : 'cash')},${sale.customer_phone || 'N/A'}`
      ) || []),
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