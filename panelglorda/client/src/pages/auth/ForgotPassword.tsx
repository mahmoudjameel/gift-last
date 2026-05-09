import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { Mail, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/شعار_غلوردا_1764881546720.jpg";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const formSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
});

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, values.email, {
        url: window.location.origin + "/",
        handleCodeInApp: false,
      });

      setEmailSent(true);
      toast({
        title: "تم إرسال رابط إعادة التعيين ✅",
        description: "يرجى التحقق من بريدك الإلكتروني",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "حدث خطأ ما";

      if (error.code === "auth/user-not-found") {
        errorMessage = "لا يوجد حساب بهذا البريد الإلكتروني";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صالح";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "تم إرسال الكثير من الطلبات. يرجى المحاولة لاحقاً";
      }

      toast({
        variant: "destructive",
        title: "خطأ",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
        <div className="w-full max-w-md space-y-8">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-1 bg-emerald-500 w-full" />
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold">تم إرسال الرابط بنجاح!</h2>
              <p className="text-muted-foreground text-sm">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
                <br />
                يرجى فتح الرابط لإعادة تعيين كلمة المرور.
              </p>
              <div className="pt-4">
                <Link href="/">
                  <Button className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display text-primary">نسيت كلمة المرور؟</h1>
          <p className="text-muted-foreground text-sm">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden">
          <div className="h-1 bg-primary w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              استعادة كلمة المرور
            </CardTitle>
            <CardDescription>سيتم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني</CardDescription>
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
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          className="bg-background/50 font-mono text-left"
                          dir="ltr"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Mail className="w-4 h-4 ml-2" />
                  )}
                  إرسال رابط إعادة التعيين
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
