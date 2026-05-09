import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, Store, CreditCard, Loader2, Check, X, Eye, Building2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMerchantsByStatus, getWithdrawals, getTransactions, updateWithdrawalStatus } from "@/lib/admin-ops";

// Helper function to format Firebase Timestamp or Date
const formatFirebaseDate = (date: any): string => {
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

    return dateObj.toLocaleDateString('ar-SA');
  } catch {
    return 'غير محدد';
  }
};

type Merchant = any;
type Transaction = any;
type WithdrawalWithMerchant = Transaction & { merchant?: Merchant };

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithMerchant | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  const { data: merchants = [], isLoading: loadingMerchants } = useQuery<Merchant[]>({
    queryKey: ["admin-merchants", "all"],
    queryFn: () => getMerchantsByStatus()
  });

  const { data: withdrawals = [], isLoading: loadingWithdrawals } = useQuery<Transaction[]>({
    queryKey: ["admin-withdrawals"],
    queryFn: () => getWithdrawals()
  });

  const { data: allTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["admin-transactions"],
    queryFn: () => getTransactions()
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "completed" | "rejected" }) =>
      updateWithdrawalStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants", "all"] });
      toast({
        title: status === "completed" ? "تم الموافقة على طلب السحب" : "تم رفض طلب السحب",
        className: status === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : ""
      });
      setSelectedWithdrawal(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث طلب السحب" });
    }
  });

  const withdrawalsWithMerchants: WithdrawalWithMerchant[] = withdrawals.map((w: any) => ({
    ...w,
    merchant: merchants.find((m: any) => m.id === w.merchantId)
  }));

  const activeMerchants = merchants.filter(m => m.status === "active");
  const totalBalance = activeMerchants.reduce((sum, m) => sum + m.balance, 0);
  const pendingWithdrawalsAmount = withdrawals.reduce((sum, w) => sum + Math.abs(w.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(Math.abs(amount));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 ml-1" /> قيد المراجعة</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 ml-1" /> مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">المحافظ وطلبات السحب</h2>
          <p className="text-muted-foreground mt-2">إدارة محافظ التجار وطلبات سحب الأرصدة</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الأرصدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">{activeMerchants.length} تاجر نشط</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">طلبات السحب المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingWithdrawalsAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">{withdrawals.length} طلب</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المعاملات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allTransactions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">معاملة مالية</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="withdrawals" className="gap-2">
              <CreditCard className="w-4 h-4" />
              طلبات السحب
              {withdrawals.length > 0 && (
                <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {withdrawals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallets" className="gap-2">
              <Wallet className="w-4 h-4" />
              محافظ التجار
            </TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  طلبات السحب المعلقة
                </CardTitle>
                <CardDescription>
                  طلبات سحب الأرصدة من التجار بانتظار الموافقة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingWithdrawals ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : withdrawalsWithMerchants.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا توجد طلبات سحب معلقة</h3>
                    <p className="text-muted-foreground">ستظهر هنا طلبات السحب من التجار</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المتجر</TableHead>
                          <TableHead className="text-right">المبلغ</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawalsWithMerchants.map((withdrawal) => (
                          <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Store className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{withdrawal.merchant?.storeName || "غير معروف"}</div>
                                  <div className="text-sm text-muted-foreground">{withdrawal.merchant?.ownerName}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-bold text-lg">{formatCurrency(withdrawal.amount)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatFirebaseDate(withdrawal.createdAt)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(withdrawal.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedWithdrawal(withdrawal)}
                                  data-testid={`button-view-withdrawal-${withdrawal.id}`}
                                >
                                  <Eye className="w-4 h-4 ml-1" />
                                  التفاصيل
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => updateWithdrawalMutation.mutate({ id: withdrawal.id, status: "completed" })}
                                  disabled={updateWithdrawalMutation.isPending}
                                  data-testid={`button-approve-withdrawal-${withdrawal.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => updateWithdrawalMutation.mutate({ id: withdrawal.id, status: "rejected" })}
                                  disabled={updateWithdrawalMutation.isPending}
                                  data-testid={`button-reject-withdrawal-${withdrawal.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  محافظ التجار
                </CardTitle>
                <CardDescription>
                  عرض أرصدة جميع التجار والبيانات البنكية
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMerchants ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activeMerchants.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا يوجد تجار نشطين</h3>
                    <p className="text-muted-foreground">ستظهر هنا محافظ التجار عند تفعيلهم</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المتجر</TableHead>
                          <TableHead className="text-right">الرصيد الإجمالي</TableHead>
                          <TableHead className="text-right">المتاح للسحب (الصافي)</TableHead>
                          <TableHead className="text-right">البنك</TableHead>
                          <TableHead className="text-right">المدينة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeMerchants.map((merchant) => {
                          const netBalance = merchant.balance;
                          return (
                            <TableRow key={merchant.id} data-testid={`row-wallet-${merchant.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Store className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{merchant.storeName}</div>
                                    <div className="text-sm text-muted-foreground">{merchant.ownerName}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`font-bold text-lg ${merchant.balance > 0 ? 'text-muted-foreground' : ''}`}>
                                  {formatCurrency(merchant.balance)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`font-bold text-lg ${netBalance > 0 ? 'text-emerald-600' : ''}`}>
                                  {formatCurrency(netBalance)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {merchant.bankName ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span>{merchant.bankName}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">غير محدد</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{merchant.city}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedMerchant(merchant)}
                                  data-testid={`button-view-merchant-${merchant.id}`}
                                >
                                  <Eye className="w-4 h-4 ml-1" />
                                  التفاصيل
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب السحب</DialogTitle>
            <DialogDescription>معلومات الطلب والبيانات البنكية للتاجر</DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">المبلغ المطلوب</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">رصيد المحفظة</p>
                  <p className={`text-2xl font-bold ${(selectedWithdrawal.merchant?.balance || 0) >= Math.abs(selectedWithdrawal.amount) ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedWithdrawal.merchant?.balance || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <div>{getStatusBadge(selectedWithdrawal.status)}</div>
                </div>
              </div>

              {(selectedWithdrawal.merchant?.balance || 0) < Math.abs(selectedWithdrawal.amount) && selectedWithdrawal.status === "pending" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  تحذير: رصيد المحفظة أقل من المبلغ المطلوب للسحب
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  بيانات المتجر
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">اسم المتجر</p>
                    <p className="font-medium">{selectedWithdrawal.merchant?.storeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المالك</p>
                    <p className="font-medium">{selectedWithdrawal.merchant?.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الجوال</p>
                    <p className="font-medium font-mono" dir="ltr">{selectedWithdrawal.merchant?.mobile}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">البريد</p>
                    <p className="font-medium font-mono text-xs">{selectedWithdrawal.merchant?.email}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  البيانات البنكية
                </h4>
                {selectedWithdrawal.merchant?.bankName ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">اسم البنك</p>
                      <p className="font-medium">{selectedWithdrawal.merchant.bankName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">صاحب الحساب</p>
                      <p className="font-medium">{selectedWithdrawal.merchant.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">رقم الآيبان (IBAN)</p>
                      <p className="font-mono text-sm bg-background p-2 rounded border" dir="ltr">
                        {selectedWithdrawal.merchant.iban}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم إضافة البيانات البنكية بعد</p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>
                  إغلاق
                </Button>
                {selectedWithdrawal.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => updateWithdrawalMutation.mutate({ id: selectedWithdrawal.id, status: "rejected" })}
                      disabled={updateWithdrawalMutation.isPending}
                    >
                      <X className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => updateWithdrawalMutation.mutate({ id: selectedWithdrawal.id, status: "completed" })}
                      disabled={updateWithdrawalMutation.isPending}
                    >
                      {updateWithdrawalMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-1" />
                      ) : (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                      موافقة وتحويل
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل المحفظة</DialogTitle>
            <DialogDescription>معلومات التاجر والبيانات البنكية</DialogDescription>
          </DialogHeader>

          {selectedMerchant && (
            <div className="space-y-6">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">الرصيد الحالي</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(selectedMerchant.balance)}</p>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  بيانات المتجر
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">اسم المتجر</p>
                    <p className="font-medium">{selectedMerchant.storeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المالك</p>
                    <p className="font-medium">{selectedMerchant.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الجوال</p>
                    <p className="font-medium font-mono" dir="ltr">{selectedMerchant.mobile}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المدينة</p>
                    <p className="font-medium">{selectedMerchant.city}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  البيانات البنكية
                </h4>
                {selectedMerchant.bankName ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">اسم البنك</p>
                      <p className="font-medium">{selectedMerchant.bankName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">صاحب الحساب</p>
                      <p className="font-medium">{selectedMerchant.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">رقم الآيبان (IBAN)</p>
                      <p className="font-mono text-sm bg-background p-2 rounded border" dir="ltr">
                        {selectedMerchant.iban}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم إضافة البيانات البنكية بعد</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedMerchant(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
