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
        .from('customer_purchases')
        .select(`*, business_profiles!inner(user_id)`)
        .eq('business_profiles.user_id', userId)
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
        .select('*')
        .eq('user_id', userId),
      
      supabase
        .from('inventory_receipts')
        .select('*')
        .eq('user_id', userId)
        .gte('received_date', startDate.toISOString())
    ]);

    // Calculate financial metrics
    const totalRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
    const totalExpenses = expensesData.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    const totalInventoryValue = receiptsData.data?.reduce((sum, receipt) => sum + Number(receipt.total_cost || 0), 0) || 0;
    const creditSales = salesData.data?.filter(sale => sale.payment_method === 'credit')
      .reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

    // Group expenses by category
    const expensesByCategory = new Map<string, number>();
    expensesData.data?.forEach(expense => {
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
      `Total Sales Revenue,₵${totalRevenue.toLocaleString()}`,
      `Cash Sales,₵${(totalRevenue - creditSales).toLocaleString()}`,
      `Credit Sales,₵${creditSales.toLocaleString()}`,
      '',
      'EXPENSES',
      ...Array.from(expensesByCategory.entries()).map(([category, amount]) => 
        `${category},₵${amount.toLocaleString()}`
      ),
      `Total Expenses,₵${totalExpenses.toLocaleString()}`,
      '',
      'NET INCOME',
      `Gross Profit,₵${(totalRevenue - totalExpenses).toLocaleString()}`,
      `Net Profit Margin,${totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0}%`,
      '',
      '=== BALANCE SHEET ===',
      'ASSETS',
      'Current Assets:',
      `Inventory Value,₵${totalInventoryValue.toLocaleString()}`,
      `Accounts Receivable,₵${creditSales.toLocaleString()}`,
      `Total Current Assets,₵${(totalInventoryValue + creditSales).toLocaleString()}`,
      '',
      'LIABILITIES',
      'Current Liabilities:',
      `Accounts Payable,₵0.00`,
      `Total Current Liabilities,₵0.00`,
      '',
      'EQUITY',
      `Retained Earnings,₵${(totalRevenue - totalExpenses).toLocaleString()}`,
      `Total Equity,₵${(totalRevenue - totalExpenses).toLocaleString()}`,
      '',
      '=== CASH FLOW ANALYSIS ===',
      `Cash from Operations,₵${(totalRevenue - creditSales).toLocaleString()}`,
      `Cash from Investing,₵${(-totalInventoryValue).toLocaleString()}`,
      `Net Cash Flow,₵${(totalRevenue - creditSales - totalInventoryValue).toLocaleString()}`,
      '',
      '=== KEY RATIOS ===',
      `Current Ratio,${creditSales > 0 ? ((totalInventoryValue + creditSales) / creditSales).toFixed(2) : 'N/A'}`,
      `Inventory Turnover,${totalInventoryValue > 0 ? (totalExpenses / totalInventoryValue).toFixed(2) : 'N/A'}`,
      `Profit Margin,${totalRevenue > 0 ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1) : 0}%`,
      '',
      '=== DETAILED TRANSACTIONS ===',
      'Sales Transactions:',
      'Date,Product,Amount,Payment Method,Customer',
      ...(salesData.data?.slice(0, 50).map(sale => 
        `${new Date(sale.purchase_date).toLocaleDateString()},${sale.product_name},₵${sale.amount},${sale.payment_method || 'cash'},${sale.customer_phone}`
      ) || []),
      '',
      'Expense Transactions:',
      'Date,Category,Description,Amount,Vendor',
      ...(expensesData.data?.slice(0, 50).map(expense => 
        `${new Date(expense.expense_date).toLocaleDateString()},${expense.category},${expense.description || 'N/A'},₵${expense.amount},${expense.vendor_name}`
      ) || []),
      '',
      '--- Financial Statement generated by Tralo Business Management System ---',
      'Powered by Tralo | https://tralo.com'
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="financial_statement_${period}_${new Date().toISOString().split('T')[0]}.csv"`,
        ...corsHeaders,
      },
    });

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