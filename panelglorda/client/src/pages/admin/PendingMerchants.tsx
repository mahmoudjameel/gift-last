import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, Store, Eye, Clock, MapPin, Phone, Mail, Building, Truck, FileText, ExternalLink, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { getMerchantsByStatus, updateMerchantStatus } from "@/lib/admin-ops";

// Helper function to format Firebase Timestamp or Date
const formatFirebaseDate = (date: any, useLocaleString: boolean = false): string => {
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

    return useLocaleString ? dateObj.toLocaleString('ar-SA') : dateObj.toLocaleDateString('ar-SA');
  } catch {
    return 'غير محدد';
  }
};

const storeTypeLabels: Record<string, string> = {
  company: "شركة",
  institution: "مؤسسة",
  individual: "فرد"
};

const deliveryMethodLabels: Record<string, string> = {
  representative: "مندوب توصيل",
  pickup: "استلام من الفرع",
  all: "الكل"
};

export default function PendingMerchants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: allMerchants = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-merchants", "pending"],
    queryFn: () => getMerchantsByStatus("pending")
  });

  const pendingMerchants = allMerchants.filter(m => m.status === "pending");

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string; reason?: string }) =>
      updateMerchantStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchants", "pending"] });
      if (status === "active") {
        toast({
          title: "تم قبول المتجر بنجاح",
          description: "تم نقل المتجر إلى قائمة المتاجر النشطة",
          className: "bg-emerald-50 border-emerald-200 text-emerald-800"
        });
        navigate("/admin/merchants");
      } else {
        toast({
          title: "تم رفض الطلب",
          className: "bg-red-50 border-red-200 text-red-800"
        });
      }
      setIsDetailsOpen(false);
      setIsRejectOpen(false);
      setRejectReason("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث الحالة" });
    }
  });

  const handleApprove = (merchant: any) => {
    updateStatusMutation.mutate({ id: merchant.id, status: "active" });
  };

  const handleReject = () => {
    if (selectedMerchant) {
      updateStatusMutation.mutate({
        id: selectedMerchant.id,
        status: "rejected",
        reason: rejectReason || undefined
      });
    }
  };

  const handleViewDetails = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsDetailsOpen(true);
  };

  const openRejectDialog = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsRejectOpen(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">طلبات التسجيل</h2>
            <p className="text-muted-foreground mt-2">مراجعة طلبات تسجيل المتاجر الجديدة والموافقة عليها</p>
          </div>
          {pendingMerchants.length > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4 ml-2" />
              {pendingMerchants.length} طلبات معلقة
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingMerchants.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="font-semibold text-xl mb-2">لا توجد طلبات معلقة</h3>
            <p className="text-muted-foreground mb-4">جميع طلبات التسجيل تمت مراجعتها</p>
            <Button variant="outline" onClick={() => navigate("/admin/merchants")}>
              عرض جميع المتاجر
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingMerchants.map((merchant) => (
              <Card key={merchant.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`pending-merchant-${merchant.id}`}>
                <CardHeader className="bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      <Clock className="w-3 h-3 ml-1" />
                      قيد المراجعة
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFirebaseDate(merchant.createdAt)}
                    </span>
                  </div>
                  <CardTitle className="mt-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {merchant.storeName ? merchant.storeName.charAt(0) : "؟"}
                    </div>
                    <div>
                      <span className="block">{merchant.storeName}</span>
                      <span className="text-sm font-normal text-muted-foreground">{merchant.ownerName}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{merchant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">{merchant.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{storeTypeLabels[merchant.storeType]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{merchant.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span>{deliveryMethodLabels[merchant.deliveryMethod]}</span>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewDetails(merchant)}
                      data-testid={`button-view-${merchant.id}`}
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      التفاصيل
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(merchant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-approve-${merchant.id}`}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      قبول
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openRejectDialog(merchant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-reject-${merchant.id}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                تفاصيل طلب التسجيل
              </DialogTitle>
              <DialogDescription>مراجعة بيانات المتجر قبل الموافقة أو الرفض</DialogDescription>
            </DialogHeader>
            {selectedMerchant && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">اسم المتجر</p>
                    <p className="font-medium text-lg">{selectedMerchant.storeName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">اسم المالك</p>
                    <p className="font-medium text-lg">{selectedMerchant.ownerName}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">معلومات التواصل</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-mono text-sm">{selectedMerchant.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">رقم الجوال</p>
                      <p className="font-mono">{selectedMerchant.mobile}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">معلومات النشاط</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">نوع الكيان</p>
                      <p className="font-medium">{storeTypeLabels[selectedMerchant.storeType]}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {(selectedMerchant.storeType === "company" || selectedMerchant.storeType === "institution")
                          ? "رقم السجل التجاري"
                          : "رقم وثيقة العمل الحر"}
                      </p>
                      <p className="font-mono">{selectedMerchant.registrationNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">المدينة</p>
                      <p className="font-medium">{selectedMerchant.city}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">طريقة التوصيل</p>
                      <p className="font-medium">{deliveryMethodLabels[selectedMerchant.deliveryMethod]}</p>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    المستندات الرسمية
                  </h4>
                  {(selectedMerchant.storeType === "company" || selectedMerchant.storeType === "institution") && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">صورة السجل التجاري</p>
                      {selectedMerchant.commercialRegistrationDoc ? (
                        <a
                          href={selectedMerchant.commercialRegistrationDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200 hover:bg-green-100 transition-colors w-fit"
                          data-testid="link-commercial-doc"
                        >
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-700">عرض السجل التجاري</span>
                          <ExternalLink className="h-4 w-4 text-green-600" />
                        </a>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">لم يتم رفع صورة السجل التجاري</p>
                      )}
                    </div>
                  )}

                  {selectedMerchant.storeType === "individual" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">صورة الهوية الوطنية</p>
                        {selectedMerchant.nationalIdImage ? (
                          <a
                            href={selectedMerchant.nationalIdImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                            data-testid="link-national-id"
                          >
                            <Image className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-700">عرض الهوية</span>
                            <ExternalLink className="h-4 w-4 text-green-600" />
                          </a>
                        ) : (
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">لم يتم رفع صورة الهوية</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">شهادة العمل الحر</p>
                        {selectedMerchant.freelanceCertificateImage ? (
                          <a
                            href={selectedMerchant.freelanceCertificateImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                            data-testid="link-freelance-cert"
                          >
                            <FileText className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-700">عرض الشهادة</span>
                            <ExternalLink className="h-4 w-4 text-green-600" />
                          </a>
                        ) : (
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">لم يتم رفع شهادة العمل الحر</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedMerchant.branches && selectedMerchant.branches.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">الفروع ({selectedMerchant.branches.length})</h4>
                    <div className="space-y-2">
                      {selectedMerchant.branches.map((branch: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium">{branch.name}</p>
                          <a
                            href={branch.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            عرض على الخريطة
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-mono">{formatFirebaseDate(selectedMerchant.createdAt, true)}</p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => openRejectDialog(selectedMerchant)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    رفض الطلب
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(selectedMerchant)}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    <CheckCircle className="w-4 h-4 ml-1" />
                    قبول المتجر
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">رفض طلب التسجيل</DialogTitle>
              <DialogDescription>تأكيد رفض طلب تسجيل المتجر</DialogDescription>
            </DialogHeader>
            {selectedMerchant && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  هل أنت متأكد من رفض طلب تسجيل متجر <strong>{selectedMerchant.storeName}</strong>؟
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reason">سبب الرفض (اختياري)</Label>
                  <Textarea
                    id="reason"
                    placeholder="أدخل سبب الرفض..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    تأكيد الرفض
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
