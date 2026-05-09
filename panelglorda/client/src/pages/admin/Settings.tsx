import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Key, Users, Trash2, Loader2, Shield, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { getAdmins, addAdmin, deleteAdmin } from "@/lib/admin-ops";

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

type Admin = any;

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ["admin-admins"],
    queryFn: () => getAdmins()
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => addAdmin({ email: data.email, name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
      toast({ title: "تم إضافة المسؤول بنجاح", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
      setIsAddOpen(false);
      setFormData({ name: "", email: "", password: "" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
      toast({ title: "تم حذف المسؤول" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      throw new Error("تغيير كلمة المرور غير مدعوم في الواجهة الجديدة");
    },
    onSuccess: () => { },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ variant: "destructive", title: "جميع الحقول مطلوبة" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "جميع الحقول مطلوبة" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "كلمتا المرور غير متطابقتان" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ variant: "destructive", title: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">الإعدادات</h2>
          <p className="text-muted-foreground mt-2">إدارة إعدادات الحساب والمسؤولين</p>
        </div>

        <Tabs defaultValue="password" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="password" className="gap-2">
              <Key className="w-4 h-4" />
              تغيير كلمة المرور
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Users className="w-4 h-4" />
              المسؤولين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  تغيير كلمة المرور
                </CardTitle>
                <CardDescription>
                  قم بتغيير كلمة المرور الخاصة بحسابك ({user?.email})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="أدخل كلمة المرور الحالية"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="أدخل كلمة المرور الجديدة"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-change-password">
                    {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    تغيير كلمة المرور
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    المسؤولين
                  </CardTitle>
                  <CardDescription className="mt-2">
                    إدارة حسابات مسؤولي لوحة التحكم
                  </CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-admin">
                      <UserPlus className="w-4 h-4" />
                      إضافة مسؤول
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة مسؤول جديد</DialogTitle>
                      <DialogDescription>أدخل بيانات المسؤول الجديد للوصول إلى لوحة التحكم</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">الاسم</Label>
                        <Input
                          id="name"
                          placeholder="اسم المسؤول"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          data-testid="input-admin-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          data-testid="input-admin-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">كلمة المرور</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="كلمة مرور قوية"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          data-testid="input-admin-password"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-admin">
                          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                          إضافة المسؤول
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : admins.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا يوجد مسؤولين</h3>
                    <p className="text-muted-foreground">قم بإضافة مسؤول جديد للبدء</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المسؤول</TableHead>
                          <TableHead className="text-right">البريد الإلكتروني</TableHead>
                          <TableHead className="text-right">تاريخ الإضافة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin) => (
                          <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {admin.name ? admin.name.charAt(0) : "؟"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{admin.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{admin.email}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {formatFirebaseDate(admin.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate(admin.id)}
                                disabled={deleteMutation.isPending || admin.id === user?.id}
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
