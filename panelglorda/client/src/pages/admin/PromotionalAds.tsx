import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Edit, Trash2, Send, Loader2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getPromotionalAds,
  addPromotionalAd,
  updatePromotionalAd,
  deletePromotionalAd,
  type PromotionalAd,
} from "@/lib/admin-data";
import { callSendPromotionalPush } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";

export default function PromotionalAds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<PromotionalAd | null>(null);
  const [form, setForm] = useState({ title: "", body: "", order: 0, isActive: true });
  const [sendingAdId, setSendingAdId] = useState<string | null>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["promotionalAds"],
    queryFn: getPromotionalAds,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingAd) {
        await updatePromotionalAd(editingAd.id, data);
      } else {
        await addPromotionalAd(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionalAds"] });
      toast({ title: editingAd ? "تم تحديث الإعلان" : "تم إضافة الإعلان" });
      closeDialog();
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "خطأ", description: e?.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotionalAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionalAds"] });
      toast({ title: "تم حذف الإعلان", variant: "destructive" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "خطأ", description: e?.message });
    },
  });

  function openDialog(ad?: PromotionalAd) {
    setEditingAd(ad ?? null);
    setForm({
      title: ad?.title ?? "",
      body: ad?.body ?? "",
      order: ad?.order ?? ads.length,
      isActive: ad?.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAd(null);
    setForm({ title: "", body: "", order: 0, isActive: true });
  }

  async function handleSendPush(adId: string) {
    setSendingAdId(adId);
    try {
      const result = await callSendPromotionalPush(adId);
      if (result?.success) {
        toast({ title: "تم إرسال الإشعار لجميع المستخدمين" });
        queryClient.invalidateQueries({ queryKey: ["promotionalAds"] });
      } else {
        toast({ variant: "destructive", title: "فشل الإرسال", description: result?.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e?.message || "فشل إرسال الإشعار" });
    } finally {
      setSendingAdId(null);
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-primary" />
              الإعلانات الترويجية
            </h2>
            <p className="text-muted-foreground mt-2">
              إضافة إعلانات تظهر للمستخدمين كإشعارات (بوش نوتيفيكيشن) وفي شاشة الإشعارات. مثال: اشتري ١٠٠ ر.س والتوصيل مجاناً.
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة إعلان
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الإعلانات</CardTitle>
            <CardDescription>كل إعلان له عنوان ونص وترتيب. يمكنك إرسال الإعلان كإشعار فوري لجميع مستخدمي التطبيق.</CardDescription>
          </CardHeader>
          <CardContent>
            {ads.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">لا توجد إعلانات. أضف إعلاناً من الزر أعلاه.</p>
            ) : (
              <ul className="space-y-3">
                {ads.map((ad) => (
                  <li
                    key={ad.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-sm font-medium w-8">#{ad.order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ad.title || "—"}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ad.body || "—"}</p>
                      {ad.sentAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          آخر إرسال: {ad.sentAt?.seconds ? new Date(ad.sentAt.seconds * 1000).toLocaleString("ar-SA") : "—"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded ${ad.isActive ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                        {ad.isActive ? "نشط" : "غير نشط"}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => openDialog(ad)} className="gap-1">
                        <Edit className="w-4 h-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSendPush(ad.id)}
                        disabled={sendingAdId === ad.id}
                        className="gap-1"
                      >
                        {sendingAdId === ad.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        إرسال إشعار
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("حذف هذا الإعلان؟")) deleteMutation.mutate(ad.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAd ? "تعديل الإعلان" : "إضافة إعلان ترويجي"}</DialogTitle>
            <DialogDescription>
              العنوان يظهر في الإشعار. النص هو المحتوى الكامل (مثال: اشتري ١٠٠ ر.س والتوصيل مجاناً).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">العنوان</Label>
              <Input
                id="title"
                placeholder="مثال: عرض التوصيل المجاني"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">النص</Label>
              <Textarea
                id="body"
                placeholder="مثال: اشتري ١٠٠ ر.س أو أكثر واحصل على التوصيل مجاناً"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">ترتيب الظهور</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>الإعلان نشط (يظهر في التطبيق)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              إلغاء
            </Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingAd ? "حفظ التغييرات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
