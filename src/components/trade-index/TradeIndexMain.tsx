import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp,
  Minus,
  MapPin,
  ArrowUp,
  ArrowDown,
  Lightbulb
} from "lucide-react";
import { useTradeIndexData } from "@/hooks/useTradeIndexData";

const TradeIndexMain = () => {
  const { insights } = useTradeIndexData();
  const [selectedMarket1, setSelectedMarket1] = useState("makola");
  const [selectedMarket2, setSelectedMarket2] = useState("texpo");

  const getStatusBadge = (status: string) => {
    const colors = {
      rising: "bg-red-100 text-red-800 border-red-200",
      dropping: "bg-green-100 text-green-800 border-green-200",
      stable: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };

    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors]}>
        {status}
      </Badge>
    );
  };

  const getBetterMarket = (price1: string | undefined, price2: string | undefined) => {
    // Handle undefined or null prices
    if (!price1 || !price2) return "unknown";

    const p1 = parseFloat(price1.replace('₵', '').replace(',', ''));
    const p2 = parseFloat(price2.replace('₵', '').replace(',', ''));

    // Handle invalid parsed numbers
    if (isNaN(p1) || isNaN(p2)) return "unknown";

    if (p1 < p2) return selectedMarket1;
    if (p2 < p1) return selectedMarket2;
    return "same";
  };

  const getTopMovers = () => {
    return marketCommodities
      .filter(c => c.trend !== "stable" && c.priceChange !== "₵0")
      .sort((a, b) => {
        const aChange = Math.abs(parseFloat((a.priceChange || '0').replace(/[₵+-]/g, '')));
        const bChange = Math.abs(parseFloat((b.priceChange || '0').replace(/[₵+-]/g, '')));
        return bChange - aChange;
      })
      .slice(0, 3);
  };

  // Mock market data for main trade index with price ranges
  const marketCommodities = [
    { name: "Rice", unit: "bag", minPrice: "₵115.00", maxPrice: "₵125.00", avgPrice: "₵120.00", makolaPrice: "₵120.00", texpoPrice: "₵118.00", trend: "up", priceChange: "+₵5", status: "rising" },
    { name: "Maize", unit: "bag", minPrice: "₵80.00", maxPrice: "₵90.00", avgPrice: "₵85.00", makolaPrice: "₵85.00", texpoPrice: "₵87.00", trend: "down", priceChange: "-₵3", status: "dropping" },
    { name: "Beans", unit: "cup", minPrice: "₵7.50", maxPrice: "₵9.00", avgPrice: "₵8.25", makolaPrice: "₵8.50", texpoPrice: "₵8.20", trend: "up", priceChange: "+₵0.50", status: "rising" },
    { name: "Tomato", unit: "rubber", minPrice: "₵10.00", maxPrice: "₵14.00", avgPrice: "₵12.00", makolaPrice: "₵12.00", texpoPrice: "₵13.00", trend: "stable", priceChange: "₵0", status: "stable" },
    { name: "Onion", unit: "rubber", minPrice: "₵13.00", maxPrice: "₵16.00", avgPrice: "₵14.50", makolaPrice: "₵15.00", texpoPrice: "₵14.50", trend: "down", priceChange: "-₵1", status: "dropping" },
    { name: "Pepper", unit: "rubber", minPrice: "₵16.00", maxPrice: "₵20.00", avgPrice: "₵18.00", makolaPrice: "₵18.00", texpoPrice: "₵17.50", trend: "up", priceChange: "+₵2", status: "rising" },
    { name: "Palm Oil", unit: "bottle", minPrice: "₵22.00", maxPrice: "₵28.00", avgPrice: "₵25.00", makolaPrice: "₵25.00", texpoPrice: "₵26.00", trend: "up", priceChange: "+₵3", status: "rising" },
    { name: "Groundnut Oil", unit: "bottle", minPrice: "₵20.00", maxPrice: "₵24.00", avgPrice: "₵22.00", makolaPrice: "₵22.00", texpoPrice: "₵21.50", trend: "stable", priceChange: "₵0", status: "stable" }
  ];

  return (
    <div className="space-y-6">
      {/* Main Trade Index Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            📊 Trade Index - Market Overview
          </CardTitle>
          <div className="text-sm text-muted-foreground mt-2">
            <p>💡 <strong>Price Ranges Guide:</strong> Use Min price for buying opportunities, Max price for selling potential, Average price for market reference</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Average Price</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Weekly Change</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketCommodities.map((commodity) => (
                <TableRow key={commodity.name}>
                  <TableCell className="font-medium">{commodity.name}</TableCell>
                  <TableCell className="text-muted-foreground">per {commodity.unit}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{commodity.minPrice} - {commodity.maxPrice}</span>
                      <span className="text-xs text-muted-foreground">Min - Max</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{commodity.avgPrice}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {commodity.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4 text-red-600" />
                      ) : commodity.trend === 'down' ? (
                        <ArrowDown className="w-4 h-4 text-green-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-600" />
                      )}
                      <span className={`text-sm ${commodity.trend === 'up' ? 'text-red-600' :
                          commodity.trend === 'down' ? 'text-green-600' :
                            'text-gray-600'
                        }`}>
                        {commodity.trend === 'up' ? 'Rising' :
                          commodity.trend === 'down' ? 'Falling' : 'Stable'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${commodity.trend === 'up' ? 'text-red-600' :
                        commodity.trend === 'down' ? 'text-green-600' :
                          'text-gray-600'
                      }`}>
                      {commodity.priceChange}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(commodity.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Market Comparison Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            🏪 Market Comparison
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">First Market:</label>
              <Select value={selectedMarket1} onValueChange={setSelectedMarket1}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makola">Makola Market</SelectItem>
                  <SelectItem value="texpo">Texpo Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground">vs</div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Second Market:</label>
              <Select value={selectedMarket2} onValueChange={setSelectedMarket2}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makola">Makola Market</SelectItem>
                  <SelectItem value="texpo">Texpo Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>{selectedMarket1 === 'makola' ? 'Makola Market' : 'Texpo Market'}</TableHead>
                <TableHead>{selectedMarket2 === 'makola' ? 'Makola Market' : 'Texpo Market'}</TableHead>
                <TableHead>Better Deal</TableHead>
                <TableHead>Price Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketCommodities.map((commodity) => {
                const market1Price = selectedMarket1 === 'makola' ? commodity.makolaPrice : commodity.texpoPrice;
                const market2Price = selectedMarket2 === 'makola' ? commodity.makolaPrice : commodity.texpoPrice;
                const betterMarket = getBetterMarket(market1Price, market2Price);

                // Calculate price difference
                const price1 = parseFloat(market1Price.replace('₵', '').replace(',', ''));
                const price2 = parseFloat(market2Price.replace('₵', '').replace(',', ''));
                const difference = Math.abs(price1 - price2).toFixed(2);

                return (
                  <TableRow key={commodity.name}>
                    <TableCell className="font-medium">{commodity.name}</TableCell>
                    <TableCell className="text-muted-foreground">per {commodity.unit}</TableCell>
                    <TableCell className="font-semibold">{market1Price}</TableCell>
                    <TableCell className="font-semibold">{market2Price}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          betterMarket === "unknown" ? "bg-gray-100 text-gray-800 border-gray-200" :
                            betterMarket === selectedMarket1 ? "bg-green-100 text-green-800 border-green-200" :
                              betterMarket === selectedMarket2 ? "bg-green-100 text-green-800 border-green-200" :
                                "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }
                      >
                        {betterMarket === "unknown" ? "⚪ No Data" :
                          betterMarket === selectedMarket1 ? `🟢 ${selectedMarket1 === 'makola' ? 'Makola' : 'Texpo'}` :
                            betterMarket === selectedMarket2 ? `🟢 ${selectedMarket2 === 'makola' ? 'Makola' : 'Texpo'}` :
                              "🟡 Same Price"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {difference === '0.00' ? 'Same' : `₵${difference}`}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Top Movers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            🚀 Top Movers This Week vs Last Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getTopMovers().map((mover, index) => (
              <div key={mover.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{mover.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {mover.trend === 'up' ? '📈 Rising fast' : '📉 Cheapest in weeks'}
                    </div>
                  </div>
                </div>
                <div className={`text-right ${mover.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                  <div className="font-semibold">{mover.priceChange}</div>
                  <div className="text-xs">
                    {mover.trend === 'up' ? 'vs last week' : 'price drop'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Trading Tip, Market Insights, Product Performance, and Inventory Linkages removed per request */}
    </div>
  );
};

export default TradeIndexMain;