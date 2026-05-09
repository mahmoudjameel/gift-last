import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { Store, ShieldCheck, Loader2, Eye, EyeOff, FileText, Shield, BookOpen } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import logoUrl from "@assets/شعار_غلوردا_1764881546720.jpg";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDocData } from "@/lib/firestore";

const formSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const { toast } = useToast();
  const { refetch } = useAuth();

  const fetchSetting = async (key: string) => (await getDocData<{ value?: string }>(`settings/${key}`)) || { value: "" };

  const { data: termsData } = useQuery({
    queryKey: ["settings", "merchant_terms_conditions"],
    queryFn: () => fetchSetting("merchant_terms_conditions"),
    staleTime: 0,
    refetchOnMount: "always"
  });

  const { data: privacyData } = useQuery({
    queryKey: ["settings", "merchant_privacy_policy"],
    queryFn: () => fetchSetting("merchant_privacy_policy"),
    staleTime: 0,
    refetchOnMount: "always"
  });

  const { data: aboutData } = useQuery({
    queryKey: ["settings", "merchant_about_us"],
    queryFn: () => fetchSetting("merchant_about_us"),
    staleTime: 0,
    refetchOnMount: "always"
  });

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
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const uid = credential.user.uid;

      const userDoc = await getDocData<{ role?: string; merchantId?: string }>(`users/${uid}`);
      if (!userDoc || userDoc.role !== "merchant") {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "صلاحيات غير صحيحة",
          description: "هذا الحساب ليس تاجر.",
        });
        return;
      }

      // Check merchant status
      const merchantId = userDoc.merchantId || uid;
      const merchantDoc = await getDocData<{ status?: string; storeName?: string }>(`merchants/${merchantId}`);

      if (!merchantDoc) {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "لم يتم العثور على بيانات التاجر.",
        });
        return;
      }

      // Handle different merchant statuses
      if (merchantDoc.status === "pending") {
        await signOut(auth);
        toast({
          variant: "default",
          title: "الحساب قيد المراجعة ⏳",
          description: "طلب تسجيلك قيد المراجعة حالياً. سيتم إشعارك عند تفعيل الحساب.",
        });
        return;
      }

      if (merchantDoc.status === "rejected") {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "تم رفض الطلب ❌",
          description: "للأسف تم رفض طلب تسجيلك. يرجى التواصل مع الدعم لمزيد من المعلومات.",
        });
        return;
      }

      if (merchantDoc.status !== "active") {
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "الحساب غير نشط",
          description: "حسابك غير نشط حالياً. يرجى التواصل مع الدعم.",
        });
        return;
      }

      // Merchant is active - proceed to dashboard
      await refetch();

      toast({
        title: "تم تسجيل الدخول بنجاح ✅",
        description: `مرحباً بك ${merchantDoc.storeName || "في لوحة التاجر"}`,
      });

      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg animate-in zoom-in duration-500">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" data-testid="img-logo" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-display text-primary">أهلاً بك</h1>
          <p className="text-muted-foreground">سجل دخولك للمتابعة إلى لوحة التحكم</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <div className="h-1 bg-primary w-full" />
          <CardHeader>
            <CardTitle>تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="bg-background/50 font-mono text-right" data-testid="input-email" />
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
                            className="bg-background/50 pl-10"
                            data-testid="input-password"
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
                <Button type="submit" className="w-full h-12 text-base font-display rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200" disabled={isSubmitting} data-testid="button-submit">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
                </Button>

                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-forgot-password">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
              <div>
                ليس لديك حساب؟{" "}
                <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                  سجل الآن كتاجر
                </Link>
              </div>
              <div>
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-primary text-sm p-0 h-auto"
                  onClick={() => setShowTermsDialog(true)}
                  data-testid="button-view-terms"
                >
                  <FileText className="w-3 h-3 ml-1" />
                  السياسات والشروط
                </Button>
              </div>
              <div className="pt-3 border-t">
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="link-admin-login">
                    <ShieldCheck className="w-4 h-4" />
                    دخول الإدارة
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                السياسات والشروط
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="terms" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="terms" className="gap-1 text-xs sm:text-sm">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">الشروط والأحكام</span>
                  <span className="sm:hidden">الشروط</span>
                </TabsTrigger>
                <TabsTrigger value="privacy" className="gap-1 text-xs sm:text-sm">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">سياسة الخصوصية</span>
                  <span className="sm:hidden">الخصوصية</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-1 text-xs sm:text-sm">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  من نحن
                </TabsTrigger>
              </TabsList>

              <TabsContent value="terms">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="prose prose-sm max-w-none text-right whitespace-pre-wrap">
                    {termsData?.value || "لم يتم إضافة الشروط والأحكام بعد."}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="privacy">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="prose prose-sm max-w-none text-right whitespace-pre-wrap">
                    {privacyData?.value || "لم يتم إضافة سياسة الخصوصية بعد."}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="about">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="prose prose-sm max-w-none text-right whitespace-pre-wrap">
                    {aboutData?.value || "لم يتم إضافة معلومات عنا بعد."}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowTermsDialog(false)} data-testid="button-close-terms">
                إغلاق
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
