import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Customer {
    id: string;
    name: string;
    phone_number: string;
    email?: string;
    address?: string;
}

interface CustomerAutofillProps {
    customerName: string;
    customerPhone: string;
    onCustomerNameChange: (name: string) => void;
    onCustomerPhoneChange: (phone: string) => void;
    nameLabel?: string;
    phoneLabel?: string;
}

const CustomerAutofill = ({
    customerName,
    customerPhone,
    onCustomerNameChange,
    onCustomerPhoneChange,
    nameLabel = "Customer Name",
    phoneLabel = "Customer Phone",
}: CustomerAutofillProps) => {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<Customer[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch all customers once on mount
    useEffect(() => {
        const fetchCustomers = async () => {
            if (!user) return;
            const { data } = await supabase
                .from("customers")
                .select("id, name, phone_number, email, address")
                .eq("user_id", user.id)
                .order("last_purchase_date", { ascending: false, nullsFirst: false });
            setAllCustomers(data || []);
        };
        fetchCustomers();
    }, [user]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNameChange = useCallback(
        (value: string) => {
            onCustomerNameChange(value);

            if (value.trim().length === 0) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            const query = value.toLowerCase();
            const filtered = allCustomers.filter(
                (c) =>
                    (c.name && c.name.toLowerCase().includes(query)) ||
                    (c.phone_number && c.phone_number.includes(query))
            );
            setSuggestions(filtered.slice(0, 6));
            setShowSuggestions(filtered.length > 0);
        },
        [allCustomers, onCustomerNameChange]
    );

    const selectCustomer = (customer: Customer) => {
        onCustomerNameChange(customer.name || "");
        onCustomerPhoneChange(customer.phone_number || "");
        setShowSuggestions(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={wrapperRef}>
                <Label htmlFor="customerName">{nameLabel}</Label>
                <div className="relative">
                    <Input
                        id="customerName"
                        placeholder="Start typing to search..."
                        value={customerName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onFocus={() => {
                            if (customerName.trim().length > 0 && suggestions.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        autoComplete="off"
                    />
                </div>

                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {suggestions.map((customer) => (
                            <button
                                key={customer.id}
                                type="button"
                                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                                onClick={() => selectCustomer(customer)}
                            >
                                <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">
                                        {customer.name || "Unnamed"}
                                    </div>
                                    {customer.phone_number && (
                                        <div className="text-xs text-muted-foreground">
                                            {customer.phone_number}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <Label htmlFor="customerPhone">{phoneLabel}</Label>
                <Input
                    id="customerPhone"
                    placeholder="Enter phone number"
                    value={customerPhone}
                    onChange={(e) => onCustomerPhoneChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default CustomerAutofill;
