import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingBag, Search, Loader2, Eye, User, Store, Package, MapPin, Phone, Calendar, CreditCard, ListChecks, Type, ToggleLeft, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getAllOrders } from "@/lib/admin-ops";

// Helper function to format Firebase Timestamp or Date
const formatFirebaseDate = (date: any, formatStr: string = "dd/MM/yyyy"): string => {
  if (!date) return 'غير محدد';

  try {
    let dateObj: Date;

    if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
      return 'غير محدد';
    }

    return format(dateObj, formatStr, { locale: ar });
  } catch {
    return 'غير محدد';
  }
};

interface OptionSelection {
  id: number;
  orderId: number;
  productOptionId: number;
  selectedChoiceId: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  optionTitle: string;
  optionType: string;
}

type OrderWithDetails = any;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", variant: "secondary" },
  processing: { label: "قيد التجهيز", variant: "default" },
  shipped: { label: "تم الشحن", variant: "default" },
  delivered: { label: "تم التسليم", variant: "default" },
  completed: { label: "مكتمل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
  rescheduled: { label: "إعادة جدولة", variant: "outline" },
  not_received: { label: "عدم استلام الطلب", variant: "destructive" },
};

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["admin-orders"],
    queryFn: () => getAllOrders()
  });

  const filteredOrders = orders.filter(order =>
    (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.customer?.name && order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.merchant?.storeName && order.merchant.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.product?.name && order.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">الطلبات</h2>
            <p className="text-muted-foreground mt-2">جميع الطلبات في النظام</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {orders.length} طلب
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              قائمة الطلبات
            </CardTitle>
            <CardDescription>
              جميع الطلبات مع تفاصيل العميل والمتجر والمنتج
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب، العميل، المتجر أو المنتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                  data-testid="input-search-orders"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12" data-testid="loading-orders">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20" data-testid="empty-orders">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">لا يوجد طلبات</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لم يتم إنشاء أي طلبات بعد"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border" data-testid="table-orders">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">المتجر</TableHead>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الدفع</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="font-mono font-medium" data-testid={`text-order-number-${order.id}`}>
                          #{order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span data-testid={`text-customer-${order.id}`}>{order.customer?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <span data-testid={`text-merchant-${order.id}`}>{order.merchant?.storeName || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="max-w-[150px] truncate" data-testid={`text-product-${order.id}`}>{order.product?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-amount-${order.id}`}>
                          {order.totalAmount} ر.س
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMap[order.status]?.variant || "secondary"} data-testid={`status-order-${order.id}`}>
                            {statusMap[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.isPaid ? "default" : "outline"} data-testid={`status-paid-${order.id}`}>
                            {order.isPaid ? "مدفوع" : "غير مدفوع"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" data-testid={`text-date-${order.id}`}>
                          {formatFirebaseDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب #{selectedOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      بيانات العميل
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <p><strong>الاسم:</strong> {selectedOrder.customer?.name || "-"}</p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {selectedOrder.customer?.mobile || "-"}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {selectedOrder.customer?.city || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      بيانات المتجر
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <p><strong>اسم المتجر:</strong> {selectedOrder.merchant?.storeName || "-"}</p>
                      <p><strong>المالك:</strong> {selectedOrder.merchant?.ownerName || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    بيانات المنتج
                  </h4>
                  <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-4">
                    {selectedOrder.product?.images && selectedOrder.product.images[0] && (
                      <img
                        src={selectedOrder.product.images[0]}
                        alt={selectedOrder.product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="space-y-2">
                      <p><strong>المنتج:</strong> {selectedOrder.product?.name || "-"}</p>
                      <p><strong>السعر:</strong> {selectedOrder.product?.price} ر.س</p>
                      <p><strong>الكمية:</strong> {selectedOrder.quantity}</p>
                      <p><strong>الإجمالي:</strong> {selectedOrder.totalAmount} ر.س</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      حالة الدفع
                    </h4>
                    <Badge variant={selectedOrder.isPaid ? "default" : "outline"} className="text-sm">
                      {selectedOrder.isPaid ? "مدفوع" : "غير مدفوع"}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الطلب
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {formatFirebaseDate(selectedOrder.createdAt, "dd MMMM yyyy - HH:mm")}
                    </p>
                  </div>
                </div>

                {selectedOrder.optionSelections && selectedOrder.optionSelections.length > 0 && (
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      خيارات العميل
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.optionSelections.map((sel) => (
                        <div key={sel.id} className="flex items-start gap-3 p-2 rounded bg-background border">
                          <div className="flex-shrink-0 mt-0.5">
                            {sel.optionType === "multiple_choice" && <ListChecks className="w-4 h-4 text-primary" />}
                            {sel.optionType === "text" && <Type className="w-4 h-4 text-primary" />}
                            {sel.optionType === "toggle" && <ToggleLeft className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{sel.optionTitle}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {sel.optionType === "text" && sel.textValue}
                              {sel.optionType === "toggle" && (
                                <span className="flex items-center gap-1">
                                  {sel.booleanValue ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      نعم
                                    </>
                                  ) : "لا"}
                                </span>
                              )}
                              {sel.optionType === "multiple_choice" && sel.textValue}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.customerNote && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">ملاحظات العميل</h4>
                    <p className="text-muted-foreground">{selectedOrder.customerNote}</p>
                  </div>
                )}

                {selectedOrder.deliveryAddress && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      عنوان التوصيل
                    </h4>
                    <p className="text-muted-foreground">{selectedOrder.deliveryAddress}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
