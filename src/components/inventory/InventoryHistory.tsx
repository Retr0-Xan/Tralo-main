import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Package, TrendingUp, TrendingDown, AlertTriangle, Settings } from "lucide-react";

interface InventoryMovement {
    id: string;
    product_name: string;
    movement_type: string;
    quantity: number;
    unit_price: number;
    local_unit?: string;
    international_unit?: string;
    movement_date: string;
    notes: string | null;
    customer_id: string | null;
}

const getMovementIcon = (type: string) => {
    switch (type) {
        case 'received':
            return <TrendingUp className="w-4 h-4 text-green-600" />;
        case 'sold':
            return <TrendingDown className="w-4 h-4 text-blue-600" />;
        case 'damaged':
        case 'expired':
            return <AlertTriangle className="w-4 h-4 text-red-600" />;
        case 'adjusted':
            return <Settings className="w-4 h-4 text-orange-600" />;
        default:
            return <Package className="w-4 h-4" />;
    }
};

const getMovementBadgeVariant = (type: string) => {
    switch (type) {
        case 'received':
            return 'default';
        case 'sold':
            return 'secondary';
        case 'damaged':
        case 'expired':
            return 'destructive';
        case 'adjusted':
            return 'outline';
        default:
            return 'outline';
    }
};

const getMovementLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const InventoryHistory = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    const fetchMovements = async () => {
        if (!user) {
            setMovements([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_movements')
                .select('*')
                .eq('user_id', user.id)
                .order('movement_date', { ascending: false })
                .limit(200);

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching inventory movements:', error);
            setMovements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, [user]);

    const filteredMovements = movements.filter((movement) => {
        const matchesSearch = !searchTerm.trim()
            ? true
            : movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType =
            typeFilter === "all" ? true : movement.movement_type === typeFilter;

        return matchesSearch && matchesType;
    });

    return (
        <Card className="rounded-2xl border border-border/70">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Inventory History
                </CardTitle>
                <CardDescription>
                    Track all inventory movements including receipts, sales, and adjustments
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by product or notes"
                            className="pl-9"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-48">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="adjusted">Adjusted</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground">
                        Loading inventory history...
                    </div>
                ) : filteredMovements.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        No inventory movements found matching your criteria.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Total Value</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMovements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="text-sm">
                                            {new Date(movement.movement_date).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {movement.product_name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getMovementIcon(movement.movement_type)}
                                                <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                                                    {getMovementLabel(movement.movement_type)}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={movement.movement_type === 'received' ? 'text-green-600 font-semibold' : movement.movement_type === 'sold' ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {movement.movement_type === 'received' ? '+' : '-'}
                                                {Math.abs(movement.quantity)} {movement.local_unit || movement.international_unit || 'units'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {movement.unit_price ? `¢${movement.unit_price.toFixed(2)}` : '--'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {movement.unit_price
                                                ? `¢${(Math.abs(movement.quantity) * movement.unit_price).toFixed(2)}`
                                                : '--'}
                                        </TableCell>
                                        <TableCell className="max-w-xs text-sm text-muted-foreground truncate">
                                            {movement.notes || '--'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default InventoryHistory;
