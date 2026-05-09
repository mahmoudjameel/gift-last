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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Search, Loader2, Eye, User, Package, MapPin, Phone, Calendar, CreditCard, MessageCircle, Gift } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getMerchantOrders, updateOrderStatus, type Order } from "@/lib/merchant-data";

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

type OrderWithDetails = Order;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "قيد الانتظار", variant: "secondary" },
  processing: { label: "قيد التجهيز", variant: "secondary", className: "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent" },
  delivered: { label: "تم التسليم", variant: "default", className: "bg-green-500 hover:bg-green-600 text-white border-transparent" },
  completed: { label: "مكتمل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
  not_received: { label: "عدم استلام الطلب", variant: "destructive" },
};
// removed obsolete statusOptions definition if it matches strict content

const statusOptions = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "processing", label: "قيد التجهيز" },
  { value: "delivered", label: "تم التسليم" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
  { value: "not_received", label: "عدم استلام الطلب" },
];

export default function MerchantOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleMessageCustomer = (orderId: number, orderNumber: string) => {
    setLocation(`/dashboard/messages?orderId=${orderId}&orderNumber=${orderNumber}`);
  };

  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["merchant-orders", user?.id],
    enabled: !!user?.id,
    queryFn: () => getMerchantOrders(user!.id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-orders", user?.id] });
      toast({ title: "تم تحديث حالة الطلب بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث حالة الطلب" });
    }
  });

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customer?.name && order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.product?.name && order.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">الطلبات</h2>
            <p className="text-muted-foreground mt-2">إدارة طلبات متجرك</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {orders.length} طلب
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.filter(o => o.status === "pending").length}</div>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.filter(o => o.status === "processing").length}</div>
              <p className="text-xs text-muted-foreground">قيد التجهيز</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.filter(o => o.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground">مكتمل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {orders.reduce((sum, o) => sum + (o.isPaid ? o.totalAmount : 0), 0)} ر.س
              </div>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              قائمة الطلبات
            </CardTitle>
            <CardDescription>
              الطلبات الواردة لمتجرك مع تفاصيل العميل والمنتج
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الطلب، العميل أو المنتج..."
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
            ) : (
              <Tabs defaultValue="active" className="w-full" dir="rtl">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="active">الطلبات الحالية</TabsTrigger>
                  <TabsTrigger value="completed">الطلبات المكتملة</TabsTrigger>
                  <TabsTrigger value="cancelled">الطلبات الملغية</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  <OrdersTable
                    orders={filteredOrders.filter(o => ['pending', 'processing', 'delivered', 'not_received'].includes(o.status))}
                    updateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, status })}
                    onView={(order) => setSelectedOrder(order)}
                    onMessage={(id, num) => handleMessageCustomer(id, num)}
                  />
                </TabsContent>

                <TabsContent value="completed">
                  <OrdersTable
                    orders={filteredOrders.filter(o => o.status === 'completed')}
                    updateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, status })}
                    onView={(order) => setSelectedOrder(order)}
                    onMessage={(id, num) => handleMessageCustomer(id, num)}
                  />
                </TabsContent>

                <TabsContent value="cancelled">
                  <OrdersTable
                    orders={filteredOrders.filter(o => o.status === 'cancelled')}
                    updateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, status })}
                    onView={(order) => setSelectedOrder(order)}
                    onMessage={(id, num) => handleMessageCustomer(id, num)}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب #{selectedOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      بيانات العميل
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <p><strong>الاسم:</strong> {selectedOrder.customer?.name || "-"}</p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${selectedOrder.customer?.mobile}`} className="text-primary hover:underline">
                          {selectedOrder.customer?.mobile || "-"}
                        </a>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {selectedOrder.customer?.city || "-"}
                      </p>
                    </div>
                  </div>

                  {(selectedOrder.recipientName || selectedOrder.recipientPhone) && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        بيانات المستلم
                      </h4>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                        <p><strong>الاسم:</strong> {selectedOrder.recipientName || "-"}</p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${selectedOrder.recipientPhone}`} className="text-primary hover:underline">
                            {selectedOrder.recipientPhone || "-"}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOrder.giftCard && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                      <MessageCircle className="w-4 h-4" />
                      رسالة بطاقة الهدية (مرفقة مع الطلب)
                    </h4>
                    <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30 space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <p><strong>من (المرسل):</strong> {selectedOrder.giftCard.fromName}</p>
                        <p><strong>إلى (المستلم):</strong> {selectedOrder.giftCard.toName}</p>
                      </div>
                      {selectedOrder.giftCard.hideSenderIdentity && (
                        <p className="text-muted-foreground text-sm">لا تظهر هوية المرسل للمستلم</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">نص الرسالة:</p>
                        <p className="p-3 rounded-md bg-background border text-base font-medium min-h-[60px]">
                          {selectedOrder.giftCard.message ? selectedOrder.giftCard.message : "—"}
                        </p>
                      </div>
                      {(selectedOrder.giftCardFee ?? 0) > 0 && (
                        <p className="text-sm"><strong>رسوم البطاقة:</strong> {selectedOrder.giftCardFee} ر.س</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    تفاصيل التسليم / الاستلام
                  </h4>
                  <div className="p-4 rounded-lg border space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">نوع الطلب</p>
                        <p className="font-medium">
                          {selectedOrder.deliveryMethod === "pickup" ? "استلام من الفرع" : "توصيل"}
                        </p>
                      </div>
                      {(selectedOrder.deliveryFee ?? 0) > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">رسوم التوصيل</p>
                          <p className="font-medium">{selectedOrder.deliveryFee} ر.س</p>
                        </div>
                      )}
                    </div>
                    {selectedOrder.deliveryMethod === "pickup" && selectedOrder.deliveryAddress && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">الفرع المختار</p>
                        <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                      </div>
                    )}
                    {selectedOrder.deliveryMethod === "delivery" && (
                      <>
                        {selectedOrder.recipientCity && (
                          <div className="space-y-1 pt-2 border-t">
                            <p className="text-sm text-muted-foreground">المدينة</p>
                            <p className="font-medium">{selectedOrder.recipientCity}</p>
                          </div>
                        )}
                        {selectedOrder.deliveryAddress && (
                          <div className="space-y-1 pt-2 border-t">
                            <p className="text-sm text-muted-foreground">عنوان التوصيل</p>
                            <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                          </div>
                        )}
                        {(selectedOrder.deliveryDate || selectedOrder.deliveryTime) && (
                          <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
                            {selectedOrder.deliveryDate && (
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">تاريخ التوصيل</p>
                                <p className="font-medium">{selectedOrder.deliveryDate}</p>
                              </div>
                            )}
                            {selectedOrder.deliveryTime && (
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">وقت التوصيل</p>
                                <p className="font-medium">{selectedOrder.deliveryTime}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {selectedOrder.deliveryOptionName && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">خيار التوصيل</p>
                        <p className="font-medium">{selectedOrder.deliveryOptionName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.tapChargeId && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      تفاصيل الدفع الإلكتروني
                    </h4>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">رقم العملية (Tap)</p>
                        <p className="font-mono text-xs">{selectedOrder.tapChargeId}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">حالة الدفع</p>
                        <Badge variant={selectedOrder.paymentStatus === 'CAPTURED' ? 'default' : 'secondary'}>
                          {selectedOrder.paymentStatus === 'CAPTURED' ? 'مقبول' : selectedOrder.paymentStatus}
                        </Badge>
                      </div>
                      {selectedOrder.tapReceiptUrl && (
                        <div className="md:col-span-2">
                          <a
                            href={selectedOrder.tapReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm hover:underline flex items-center gap-1"
                          >
                            عرض إيصال الدفع
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    بيانات المنتج (الطلبات)
                  </h4>
                  {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                    <div className="space-y-4">
                      {selectedOrder.orderItems.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-muted/50 flex items-start gap-4 border">
                          <div className="space-y-2 flex-1">
                            <p><strong>المنتج:</strong> {selectedOrder.product?.name || item.productId}</p>
                            <p><strong>السعر للوحدة:</strong> {item.price} ر.س</p>
                            <p><strong>الكمية:</strong> {item.quantity}</p>
                            <p><strong>الإجمالي للعنصر:</strong> {(item.price * item.quantity).toFixed(0)} ر.س</p>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-sm font-medium text-muted-foreground mb-1">خيارات المنتج (من التطبيق):</p>
                                <ul className="list-disc list-inside text-sm space-y-0.5">
                                  {item.selectedOptions.map((opt: any, oi: number) => (
                                    <li key={oi}>
                                      {opt.optionTitle || opt.optionId}:{" "}
                                      {opt.textValue != null && opt.textValue !== ""
                                        ? opt.textValue
                                        : opt.selectedChoices?.map((c: any) => c.label || c.id).join(", ") || "—"}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="font-semibold">الإجمالي الكلي: {selectedOrder.totalAmount} ر.س</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-4">
                      {selectedOrder.product?.images && selectedOrder.product.images.length > 0 ? (
                        <img
                          src={selectedOrder.product.images[0]}
                          alt={selectedOrder.product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <p><strong>المنتج:</strong> {selectedOrder.product?.name || "-"}</p>
                        <p><strong>السعر:</strong> {selectedOrder.product?.price} ر.س</p>
                        <p><strong>الكمية:</strong> {selectedOrder.quantity}</p>
                        <p><strong>الإجمالي:</strong> {selectedOrder.totalAmount} ر.س</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold text-sm">الحالة</h4>
                    <Badge
                      variant={statusMap[selectedOrder.status]?.variant || "secondary"}
                      className={statusMap[selectedOrder.status]?.className}
                    >
                      {statusMap[selectedOrder.status]?.label || selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4" />
                      الدفع
                    </h4>
                    <Badge variant={selectedOrder.isPaid ? "default" : "outline"}>
                      {selectedOrder.isPaid ? "مدفوع" : "غير مدفوع"}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      التاريخ
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {formatFirebaseDate(selectedOrder.createdAt, "dd MMM yyyy")}
                    </p>
                  </div>
                </div>

                {selectedOrder.customerNote && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">ملاحظات العميل</h4>
                    <p className="text-muted-foreground">{selectedOrder.customerNote}</p>
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

function OrdersTable({ orders, updateStatus, onView, onMessage }: {
  orders: OrderWithDetails[],
  updateStatus: (id: string, status: string) => void,
  onView: (order: OrderWithDetails) => void,
  onMessage: (id: number, num: string) => void
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg">لا يوجد طلبات</h3>
        <p className="text-muted-foreground">لا توجد طلبات في هذه القائمة</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">رقم الطلب</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">المنتج</TableHead>
            <TableHead className="text-right">الكمية</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">الدفع</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono font-medium">
                <div className="flex items-center gap-2">
                  #{order.orderNumber}
                  {order.giftCard && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Gift className="w-3 h-3" />
                      بطاقة هدية
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.customer?.name || "زائر"}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="max-w-[150px] truncate">{order.product?.name || "منتج غير متوفر"}</span>
                </div>
              </TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell className="font-medium">{order.totalAmount} ر.س</TableCell>
              <TableCell>
                <Select
                  value={order.status}
                  onValueChange={(value) => updateStatus(order.id, value)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant={order.isPaid ? "default" : "outline"}>
                  {order.isPaid ? "مدفوع" : "غير مدفوع"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatFirebaseDate(order.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(order)}
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onMessage(Number(order.id), order.orderNumber)}
                    title="رسالة للعميل"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
