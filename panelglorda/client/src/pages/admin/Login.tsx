import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import logoUrl from "@assets/kado-logo.jpg";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { getDocData, setDocData } from "@/lib/firestore";

const formSchema = z.object({
  email: z.literal("admin@admin.com", { errorMap: () => ({ message: "يجب استخدام حساب الأدمن الثابت" }) }),
  password: z.literal("123456", { errorMap: () => ({ message: "كلمة المرور الثابتة للأدمن هي 123456" }) }),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { refetch } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const fixedEmail = "admin@admin.com";
      const fixedPassword = "123456";

      // جرّب تسجيل الدخول، وإن لم يوجد الحساب يتم إنشاؤه آلياً
      let uid: string | null = null;
      try {
        const credential = await signInWithEmailAndPassword(auth, fixedEmail, fixedPassword);
        uid = credential.user.uid;
      } catch {
        const credential = await createUserWithEmailAndPassword(auth, fixedEmail, fixedPassword);
        uid = credential.user.uid;
      }

      // ضمان وجود وثيقة الدور في Firestore
      await setDocData(`users/${uid}`, {
        role: "admin",
        email: fixedEmail,
        name: "Admin",
      });

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً أيها المشرف",
      });

      setTimeout(() => {
        setLocation("/admin");
      }, 100);
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: error?.message || "حدث خطأ ما",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display">إدارة النظام</h1>
          <p className="text-muted-foreground text-sm">تسجيل الدخول المخصص لمشرفي النظام</p>
        </div>

        <Card className="border-muted/40 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات المشرف للمتابعة</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@kado.app" {...field} className="font-mono text-right" data-testid="input-admin-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            className="pl-10"
                            data-testid="input-admin-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-base font-display rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200 mt-2" disabled={isSubmitting} data-testid="button-admin-submit">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "الدخول للوحة التحكم"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            هذه الصفحة مخصصة للموظفين المصرح لهم فقط.
          </p>
        </div>
      </div>
    </div>
  );
}
