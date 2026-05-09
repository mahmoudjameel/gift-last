import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Search, MoreHorizontal, ShieldCheck, Ban, CheckCircle, Loader2, Store, Eye, FileText, ExternalLink, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMerchantsByStatus, updateMerchantStatus } from "@/lib/admin-ops";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

// Helper function to format Firebase Timestamp or Date
const formatFirebaseDate = (date: any): string => {
  if (!date) return 'غير محدد';

  try {
    // Handle Firestore Timestamp (has seconds and nanoseconds)
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toLocaleDateString('ar-SA');
    }
    // Handle Firestore Timestamp with toDate method
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('ar-SA');
    }
    // Handle regular Date object or string
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return 'غير محدد';
    }
    return parsed.toLocaleDateString('ar-SA');
  } catch {
    return 'غير محدد';
  }
};

type Merchant = any;

export default function AdminMerchants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: merchants = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-merchants", "all"],
    queryFn: () => getMerchantsByStatus()
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateMerchantStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchants", "all"] });
      toast({
        title: status === "active" ? "تم قبول المتجر" : status === "suspended" ? "تم إيقاف المتجر" : "تم تحديث الحالة",
        className: status === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : ""
      });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث الحالة" });
    }
  });

  const pendingCount = merchants.filter(m => m.status === "pending").length;

  const filteredMerchants = merchants.filter((m: any) =>
    (m.storeName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.ownerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsDetailsOpen(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">التجار</h2>
            <p className="text-muted-foreground mt-2">إدارة حسابات التجار والموافقة على الطلبات الجديدة</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-amber-100 text-amber-800">
              <ShieldCheck className="w-4 h-4 ml-2" />
              {pendingCount} طلبات معلقة
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث عن تاجر بالاسم أو البريد..."
            className="max-w-sm border-none shadow-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-merchants"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">لا توجد متاجر</h3>
            <p className="text-muted-foreground">لم يتم التسجيل أي تاجر بعد</p>
          </div>
        ) : (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] text-right">التاجر</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المدينة</TableHead>
                  <TableHead className="text-right">الرصيد</TableHead>
                  <TableHead className="text-right">تاريخ الانضمام</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id} data-testid={`row-merchant-${merchant.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://avatar.vercel.sh/${merchant.email}`} />
                          <AvatarFallback>{merchant.storeName ? merchant.storeName.charAt(0) : "؟"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{merchant.storeName}</span>
                          <span className="text-xs text-muted-foreground">{merchant.ownerName} ({merchant.email})</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{storeTypeLabels[merchant.storeType] || merchant.storeType}</TableCell>
                    <TableCell>{merchant.city}</TableCell>
                    <TableCell className="font-mono">{merchant.balance?.toFixed(2) || "0.00"} ر.س</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatFirebaseDate(merchant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          merchant.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                            merchant.status === 'suspended' ? 'border-red-200 bg-red-50 text-red-700' :
                              'border-amber-200 bg-amber-50 text-amber-700'
                        }
                      >
                        {
                          merchant.status === 'active' ? 'نشط' :
                            merchant.status === 'suspended' ? 'موقوف' : 'قيد المراجعة'
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-merchant-menu-${merchant.id}`}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => handleViewDetails(merchant)}
                          >
                            <Eye className="w-4 h-4" /> تفاصيل الحساب
                          </DropdownMenuItem>

                          {merchant.status === 'pending' && (
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700"
                              onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: "active" })}
                            >
                              <CheckCircle className="w-4 h-4" /> قبول المتجر
                            </DropdownMenuItem>
                          )}

                          {merchant.status === 'active' && (
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: "suspended" })}
                            >
                              <Ban className="w-4 h-4" /> إيقاف الحساب
                            </DropdownMenuItem>
                          )}

                          {merchant.status === 'suspended' && (
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700"
                              onClick={() => updateStatusMutation.mutate({ id: merchant.id, status: "active" })}
                            >
                              <CheckCircle className="w-4 h-4" /> إعادة تفعيل
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل المتجر</DialogTitle>
              <DialogDescription>معلومات كاملة عن المتجر والمالك</DialogDescription>
            </DialogHeader>
            {selectedMerchant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">اسم المتجر</p>
                    <p className="font-medium">{selectedMerchant.storeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">اسم المالك</p>
                    <p className="font-medium">{selectedMerchant.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium font-mono">{selectedMerchant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الجوال</p>
                    <p className="font-medium font-mono">{selectedMerchant.mobile}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نوع الكيان</p>
                    <p className="font-medium">{storeTypeLabels[selectedMerchant.storeType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم السجل</p>
                    <p className="font-medium font-mono">{selectedMerchant.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المدينة</p>
                    <p className="font-medium">{selectedMerchant.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة التوصيل</p>
                    <p className="font-medium">{deliveryMethodLabels[selectedMerchant.deliveryMethod]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                    <p className="font-medium font-mono">{selectedMerchant.balance?.toFixed(2) || "0.00"} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                    <p className="font-medium">{formatFirebaseDate(selectedMerchant.createdAt)}</p>
                  </div>
                </div>
                {/* Documents Section */}
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    المستندات الرسمية
                  </p>
                  {(selectedMerchant.storeType === "company" || selectedMerchant.storeType === "institution") && (
                    <div className="space-y-2">
                      {selectedMerchant.commercialRegistrationDoc ? (
                        <a
                          href={selectedMerchant.commercialRegistrationDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded bg-green-50 border-green-200 hover:bg-green-100 transition-colors w-fit"
                          data-testid="link-commercial-doc"
                        >
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">صورة السجل التجاري</span>
                          <ExternalLink className="h-3 w-3 text-green-600" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">لم يتم رفع السجل التجاري</p>
                      )}
                    </div>
                  )}

                  {selectedMerchant.storeType === "individual" && (
                    <div className="flex flex-wrap gap-2">
                      {selectedMerchant.nationalIdImage ? (
                        <a
                          href={selectedMerchant.nationalIdImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                          data-testid="link-national-id"
                        >
                          <Image className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">صورة الهوية</span>
                          <ExternalLink className="h-3 w-3 text-green-600" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">لم يتم رفع الهوية</p>
                      )}
                      {selectedMerchant.freelanceCertificateImage ? (
                        <a
                          href={selectedMerchant.freelanceCertificateImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                          data-testid="link-freelance-cert"
                        >
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">شهادة العمل الحر</span>
                          <ExternalLink className="h-3 w-3 text-green-600" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">لم يتم رفع شهادة العمل الحر</p>
                      )}
                    </div>
                  )}
                </div>

                {selectedMerchant.branches && selectedMerchant.branches.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">الفروع</p>
                    <div className="space-y-2">
                      {selectedMerchant.branches.map((branch: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-md">
                          <p className="font-medium">{branch.name}</p>
                          <a href={branch.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            {branch.mapLink}
                          </a>
                        </div>
                      ))}
                    </div>
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
