import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Eye, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
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
}

const CustomerTrackingDialog = () => {
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
          name: newCustomer.name.trim(),
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
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_number.includes(searchTerm)
  );

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Customer Tracking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Sales Tracking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!selectedCustomer ? (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Customer Name *</Label>
                        <Input
                          id="name"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={newCustomer.phone_number}
                          onChange={(e) => setNewCustomer({...newCustomer, phone_number: e.target.value})}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                          id="address"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
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
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchTerm ? "No customers found matching your search" : "No customers found. Add your first customer above."}
                  </p>
                ) : (
                  filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.name}</span>
                              <Badge variant="secondary">
                                {customer.total_sales_count} sales
                              </Badge>
                              <Badge variant="outline">
                                ¢{customer.total_purchases.toFixed(2)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Phone: {customer.phone_number}
                              {customer.email && ` • ${customer.email}`}
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
                  <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                  <p className="text-muted-foreground">{selectedCustomer.phone_number}</p>
                </div>
                <Button 
                  onClick={() => setSelectedCustomer(null)} 
                  variant="outline"
                >
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
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ¢{(() => {
                          const creditAmount = customerSales
                            .filter(sale => sale.payment_method === 'credit')
                            .reduce((sum, sale) => sum + Number(sale.total_amount), 0);
                          return creditAmount.toFixed(2);
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground">Credit Owed</div>
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
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Purchase History</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {customerSales.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No purchase history found
                    </p>
                  ) : (
                    customerSales.map((sale) => (
                      <Card key={sale.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sale.product_name}</span>
                                <Badge variant="secondary">Qty: {sale.quantity}</Badge>
                                <Badge variant="outline">¢{sale.unit_price}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.payment_method} • {format(new Date(sale.sale_date), 'MMM dd, yyyy h:mm a')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">¢{sale.total_amount}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerTrackingDialog;