import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Customer {
    id: string;
    customer_name: string;
    phone_number: string;
    email?: string;
    address?: string;
    total_purchases: number;
    total_sales_count: number;
    first_purchase_date?: string;
    last_purchase_date?: string;
    created_at: string;
}

interface CustomerSale {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    payment_method: string;
    sale_date: string;
    amount_paid?: number;
    payment_status?: string;
}

const CustomerTracking = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSales, setCustomerSales] = useState<CustomerSale[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        phone_number: "",
        email: "",
        address: ""
    });

    const fetchCustomers = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('user_id', user.id)
                .order('last_purchase_date', { ascending: false, nullsFirst: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast({
                title: "Error",
                description: "Failed to load customers",
                variant: "destructive",
            });
        }
    };

    const fetchCustomerSales = async (customerId: string) => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('customer_sales')
                .select('*')
                .eq('customer_id', customerId)
                .eq('user_id', user.id)
                .order('sale_date', { ascending: false });

            if (error) throw error;
            setCustomerSales(data || []);
        } catch (error) {
            console.error('Error fetching customer sales:', error);
            toast({
                title: "Error",
                description: "Failed to load customer sales history",
                variant: "destructive",
            });
        }
    };

    const calculateOutstandingCredit = async (customerId: string) => {
        if (!user) return 0;

        try {
            // Get business profile
            const { data: profile } = await supabase
                .from('business_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return 0;

            // Get customer to find their phone number
            const { data: customer } = await supabase
                .from('customers')
                .select('phone_number')
                .eq('id', customerId)
                .single();

            if (!customer) return 0;

            // Calculate outstanding from customer_purchases where payment_status is credit or partial_payment
            const { data, error } = await supabase
                .from('customer_purchases')
                .select('amount, amount_paid')
                .eq('business_id', profile.id)
                .eq('customer_phone', customer.phone_number)
                .in('payment_status', ['credit', 'partial_payment']);

            if (error) throw error;

            const outstanding = (data || []).reduce((sum, purchase) => {
                const totalAmount = Number(purchase.amount) || 0;
                const amountPaid = Number(purchase.amount_paid) || 0;
                return sum + (totalAmount - amountPaid);
            }, 0);

            return outstanding;
        } catch (error) {
            console.error('Error calculating outstanding credit:', error);
            return 0;
        }
    };

    const handleAddCustomer = async () => {
        if (!user || !newCustomer.name.trim() || !newCustomer.phone_number.trim()) {
            toast({
                title: "Error",
                description: "Name and phone number are required",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .insert({
                    user_id: user.id,
                    customer_name: newCustomer.name.trim(),
                    phone_number: newCustomer.phone_number.trim(),
                    email: newCustomer.email.trim() || null,
                    address: newCustomer.address.trim() || null
                });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Customer added successfully",
            });

            setNewCustomer({ name: "", phone_number: "", email: "", address: "" });
            setShowAddForm(false);
            fetchCustomers();
        } catch (error) {
            console.error('Error adding customer:', error);
            toast({
                title: "Error",
                description: "Failed to add customer. Customer might already exist.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        fetchCustomerSales(customer.id);
    };

    const filteredCustomers = customers.filter(customer =>
        (customer.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (customer.phone_number || '').includes(searchTerm)
    );

    useEffect(() => {
        fetchCustomers();
    }, [user]);

    const [outstandingCredits, setOutstandingCredits] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchAllOutstanding = async () => {
            const credits: Record<string, number> = {};
            for (const customer of customers) {
                credits[customer.id] = await calculateOutstandingCredit(customer.id);
            }
            setOutstandingCredits(credits);
        };

        if (customers.length > 0) {
            fetchAllOutstanding();
        }
    }, [customers]);

    return (
        <div className="space-y-6">
            {!selectedCustomer ? (
                <div className="space-y-4">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customers by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Customer
                        </Button>
                    </div>

                    {/* Add Customer Form */}
                    {showAddForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Add New Customer</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Customer Name *</Label>
                                        <Input
                                            id="name"
                                            value={newCustomer.name}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                            placeholder="Enter customer name"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            value={newCustomer.phone_number}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email (Optional)</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newCustomer.email}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="address">Address (Optional)</Label>
                                        <Input
                                            id="address"
                                            value={newCustomer.address}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                            placeholder="Enter address"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleAddCustomer} disabled={loading}>
                                        {loading ? "Adding..." : "Add Customer"}
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Customers List */}
                    <div className="grid gap-3">
                        {filteredCustomers.length === 0 ? (
                            <Card>
                                <CardContent className="p-12">
                                    <p className="text-center text-muted-foreground">
                                        {searchTerm ? "No customers found matching your search" : "No customers found. Add your first customer above."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <Card key={customer.id} className="hover:bg-muted/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-lg">{customer.customer_name}</span>
                                                    <Badge variant="secondary">
                                                        {customer.total_sales_count} sales
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                                                        Total: ¢{customer.total_purchases.toFixed(2)}
                                                    </Badge>
                                                    {outstandingCredits[customer.id] > 0 && (
                                                        <Badge variant="destructive">
                                                            Credit: ¢{outstandingCredits[customer.id].toFixed(2)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    📞 {customer.phone_number}
                                                    {customer.email && ` • ✉️ ${customer.email}`}
                                                </div>
                                                {customer.last_purchase_date && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Last purchase: {format(new Date(customer.last_purchase_date), 'MMM dd, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewCustomer(customer)}
                                                className="flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3" />
                                                View Details
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Customer Details Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-semibold">{selectedCustomer.customer_name}</h3>
                            <p className="text-muted-foreground">{selectedCustomer.phone_number}</p>
                        </div>
                        <Button
                            onClick={() => setSelectedCustomer(null)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Customers
                        </Button>
                    </div>

                    {/* Customer Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        ¢{selectedCustomer.total_purchases.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Spent</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {selectedCustomer.total_sales_count}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Sales</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        ¢{selectedCustomer.total_sales_count > 0 ? (selectedCustomer.total_purchases / selectedCustomer.total_sales_count).toFixed(2) : '0.00'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Average Sale</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-red-200 dark:border-red-900">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        ¢{outstandingCredits[selectedCustomer.id]?.toFixed(2) || '0.00'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Outstanding Credit</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <div className="text-sm font-medium">
                                        {selectedCustomer.first_purchase_date
                                            ? format(new Date(selectedCustomer.first_purchase_date), 'MMM dd, yyyy')
                                            : 'N/A'
                                        }
                                    </div>
                                    <div className="text-sm text-muted-foreground">First Purchase</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sales History */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {customerSales.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        No purchase history found
                                    </p>
                                ) : (
                                    customerSales.map((sale) => {
                                        const amountPaid = Number(sale.amount_paid) || 0;
                                        const totalAmount = Number(sale.total_amount);
                                        const remaining = totalAmount - amountPaid;
                                        const isCredit = sale.payment_status === 'credit' || sale.payment_status === 'partial_payment';

                                        return (
                                            <Card key={sale.id} className={isCredit ? 'border-orange-200 dark:border-orange-900' : ''}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium">{sale.product_name}</span>
                                                                <Badge variant="secondary">Qty: {sale.quantity}</Badge>
                                                                <Badge variant="outline">Unit: ¢{sale.unit_price}</Badge>
                                                                {isCredit && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        {sale.payment_status === 'credit' ? 'Credit' : 'Partial'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {sale.payment_method} • {format(new Date(sale.sale_date), 'MMM dd, yyyy h:mm a')}
                                                            </div>
                                                            {isCredit && remaining > 0 && (
                                                                <div className="text-sm text-red-600 font-medium">
                                                                    Outstanding: ¢{remaining.toFixed(2)} (Paid: ¢{amountPaid.toFixed(2)})
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-green-600">¢{sale.total_amount}</div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CustomerTracking;
