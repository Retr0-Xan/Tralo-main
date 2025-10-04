import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Eye, Network, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Trophy, Trash2, Lightbulb } from "lucide-react";
import AchievementsSection from "./AchievementsSection";
import SupplyChainFlow from "./SupplyChainFlow";

const InventoryDashboard = () => {
  const [selectedProduct, setSelectedProduct] = useState("fish");
  
  // Mock data - in real app this would come from your database
  const stockData = [
    {
      product: "Fish",
      quantity: 25,
      sellingPrice: "₵15.00",
      status: "healthy",
      recommendation: "🔥 Hottest seller! Restock soon",
      marketRange: "₵12-18"
    },
    {
      product: "Rice (50kg bag)",
      quantity: 3,
      sellingPrice: "₵280.00",
      status: "low",
      recommendation: "⚠️ Low stock - order more today",
      marketRange: "₵275-290"
    },
    {
      product: "Tomatoes",
      quantity: 0,
      sellingPrice: "₵8.00",
      status: "out",
      recommendation: "🚨 Out of stock - customers asking",
      marketRange: "₵6-10"
    },
    {
      product: "Groundnut Paste",
      quantity: 45,
      sellingPrice: "₵5.00",
      status: "slow",
      recommendation: "📊 Moving slowly - consider promotion",
      marketRange: "₵4-6"
    },
    {
      product: "Beans",
      quantity: 18,
      sellingPrice: "₵12.00",
      status: "healthy",
      recommendation: "✅ Steady demand - maintain stock",
      marketRange: "₵10-14"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "default",
      low: "destructive",
      out: "destructive",
      slow: "secondary"
    } as const;
    
    const labels = {
      healthy: "Healthy",
      low: "Low Stock",
      out: "Out of Stock",
      slow: "Slow Moving"
    };

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  const insights = [
    "🐟 Fish is your hottest seller this week - customers can't get enough!",
    "📉 Rice stock fell by 40% this week, restock soon to avoid shortages",
    "🥜 Groundnut paste is moving slowly, might be seasonal pattern",
    "✨ Beans have strong and steady demand - your reliable earner!"
  ];

  // Supply chain data for different products
  const supplyChainData = {
    fish: {
      received: "30 pieces",
      remaining: "5 pieces",
      sold: "25 pieces", 
      status: "Hot seller! Almost sold out",
      statusColor: "red"
    },
    "rice (50kg bag)": {
      received: "50 bags",
      remaining: "35 bags", 
      sold: "15 bags",
      status: "Selling faster than supply, restock soon",
      statusColor: "orange"
    },
    tomatoes: {
      received: "25 kg",
      remaining: "18 kg",
      sold: "7 kg",
      status: "Steady movement, good stock level",
      statusColor: "green"
    },
    beans: {
      received: "40 kg",
      remaining: "32 kg",
      sold: "8 kg", 
      status: "Slow mover, consider promotion",
      statusColor: "yellow"
    },
    gari: {
      received: "20 kg",
      remaining: "15 kg",
      sold: "5 kg",
      status: "Normal turnover rate",
      statusColor: "blue"
    }
  };

  const currentSupplyChain = supplyChainData[selectedProduct as keyof typeof supplyChainData] || supplyChainData.fish;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-foreground">My Inventory Dashboard</h2>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-xl font-bold">₵4,350</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Items in Stock</p>
                <p className="text-xl font-bold">91</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Takeaway */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">💡 Today's Top Takeaway</h3>
              <p className="text-base">
                🐟 <strong>Fish is your hottest seller this week!</strong> Restock today to avoid losing customers. 
                You've sold 40% more fish compared to last week - your customers love it! 🚀
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty in Stock</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Market Range</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.sellingPrice}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.marketRange}</TableCell>
                  <TableCell className="text-sm">{item.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inventory Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            📊 Inventory Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supply Chain Flow */}
      <SupplyChainFlow />

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            🏆 My Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AchievementsSection />
        </CardContent>
      </Card>

      {/* Record Loss Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Record Loss/Damage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {stockData.map((item) => (
                    <SelectItem key={item.product} value={item.product.toLowerCase()}>{item.product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Quantity lost" />
            </div>
            <Textarea placeholder="Reason for loss (spoiled, damaged, expired, etc.)" rows={2} />
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Record Loss & Remove from Inventory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;