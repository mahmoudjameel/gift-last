import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Shield, BookOpen, Loader2, Save, Smartphone, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSetting, setSetting } from "@/lib/admin-ops";

export default function AdminPolicies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Customer App Policies
  const [customerPrivacyPolicy, setCustomerPrivacyPolicy] = useState("");
  const [customerTermsConditions, setCustomerTermsConditions] = useState("");
  const [customerAboutUs, setCustomerAboutUs] = useState("");
  
  // Merchant Panel Policies
  const [merchantPrivacyPolicy, setMerchantPrivacyPolicy] = useState("");
  const [merchantTermsConditions, setMerchantTermsConditions] = useState("");
  const [merchantAboutUs, setMerchantAboutUs] = useState("");

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["admin-settings-policies"],
    queryFn: async () => {
      const keys = [
        "privacy_policy",
        "terms_conditions",
        "about_us",
        "merchant_privacy_policy",
        "merchant_terms_conditions",
        "merchant_about_us",
      ];
      const results = await Promise.all(keys.map((k) => getSetting(k)));
      return keys.reduce((acc, key, idx) => {
        acc[key] = results[idx]?.value || "";
        return acc;
      }, {} as Record<string, string>);
    }
  });

  useEffect(() => {
    if (settings) {
      setCustomerPrivacyPolicy(settings["privacy_policy"] || "");
      setCustomerTermsConditions(settings["terms_conditions"] || "");
      setCustomerAboutUs(settings["about_us"] || "");
      setMerchantPrivacyPolicy(settings["merchant_privacy_policy"] || "");
      setMerchantTermsConditions(settings["merchant_terms_conditions"] || "");
      setMerchantAboutUs(settings["merchant_about_us"] || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => setSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings-policies"] });
      toast({ title: "تم الحفظ بنجاح", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل الحفظ" });
    }
  });

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
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">السياسات والشروط</h2>
          <p className="text-muted-foreground mt-2">إدارة سياسة الخصوصية والشروط والأحكام للعملاء والتجار</p>
        </div>

        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="customers" className="gap-2">
              <Smartphone className="w-4 h-4" />
              تطبيق العملاء
            </TabsTrigger>
            <TabsTrigger value="merchants" className="gap-2">
              <Store className="w-4 h-4" />
              لوحة التجار
            </TabsTrigger>
          </TabsList>

          {/* Customer App Policies */}
          <TabsContent value="customers">
            <Tabs defaultValue="privacy" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-xl">
                <TabsTrigger value="privacy" className="gap-2">
                  <Shield className="w-4 h-4" />
                  سياسة الخصوصية
                </TabsTrigger>
                <TabsTrigger value="terms" className="gap-2">
                  <FileText className="w-4 h-4" />
                  الشروط والأحكام
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  عن التطبيق
                </TabsTrigger>
              </TabsList>

              <TabsContent value="privacy">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      سياسة الخصوصية - تطبيق العملاء
                    </CardTitle>
                    <CardDescription>
                      سياسة الخصوصية المعروضة للعملاء في التطبيق
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى سياسة الخصوصية</Label>
                      <Textarea
                        placeholder="اكتب سياسة الخصوصية هنا..."
                        value={customerPrivacyPolicy}
                        onChange={(e) => setCustomerPrivacyPolicy(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-customer-privacy"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "privacy_policy", value: customerPrivacyPolicy })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-customer-privacy"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terms">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      الشروط والأحكام - تطبيق العملاء
                    </CardTitle>
                    <CardDescription>
                      الشروط والأحكام المعروضة للعملاء في التطبيق
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى الشروط والأحكام</Label>
                      <Textarea
                        placeholder="اكتب الشروط والأحكام هنا..."
                        value={customerTermsConditions}
                        onChange={(e) => setCustomerTermsConditions(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-customer-terms"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "terms_conditions", value: customerTermsConditions })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-customer-terms"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      عن التطبيق - تطبيق العملاء
                    </CardTitle>
                    <CardDescription>
                      معلومات عن التطبيق المعروضة للعملاء
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى صفحة عن التطبيق</Label>
                      <Textarea
                        placeholder="اكتب معلومات عن التطبيق هنا..."
                        value={customerAboutUs}
                        onChange={(e) => setCustomerAboutUs(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-customer-about"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "about_us", value: customerAboutUs })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-customer-about"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Merchant Panel Policies */}
          <TabsContent value="merchants">
            <Tabs defaultValue="privacy" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-xl">
                <TabsTrigger value="privacy" className="gap-2">
                  <Shield className="w-4 h-4" />
                  سياسة الخصوصية
                </TabsTrigger>
                <TabsTrigger value="terms" className="gap-2">
                  <FileText className="w-4 h-4" />
                  الشروط والأحكام
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  عن المنصة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="privacy">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      سياسة الخصوصية - لوحة التجار
                    </CardTitle>
                    <CardDescription>
                      سياسة الخصوصية المعروضة للتجار عند التسجيل وتسجيل الدخول
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى سياسة الخصوصية</Label>
                      <Textarea
                        placeholder="اكتب سياسة الخصوصية للتجار هنا..."
                        value={merchantPrivacyPolicy}
                        onChange={(e) => setMerchantPrivacyPolicy(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-merchant-privacy"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "merchant_privacy_policy", value: merchantPrivacyPolicy })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-merchant-privacy"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terms">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      الشروط والأحكام - لوحة التجار
                    </CardTitle>
                    <CardDescription>
                      الشروط والأحكام التي يجب على التجار الموافقة عليها عند التسجيل وتسجيل الدخول
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى الشروط والأحكام</Label>
                      <Textarea
                        placeholder="اكتب الشروط والأحكام للتجار هنا..."
                        value={merchantTermsConditions}
                        onChange={(e) => setMerchantTermsConditions(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-merchant-terms"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "merchant_terms_conditions", value: merchantTermsConditions })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-merchant-terms"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      عن المنصة - لوحة التجار
                    </CardTitle>
                    <CardDescription>
                      معلومات عن المنصة المعروضة للتجار
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>محتوى صفحة عن المنصة</Label>
                      <Textarea
                        placeholder="اكتب معلومات عن المنصة للتجار هنا..."
                        value={merchantAboutUs}
                        onChange={(e) => setMerchantAboutUs(e.target.value)}
                        className="min-h-[300px] font-sans"
                        data-testid="textarea-merchant-about"
                      />
                    </div>
                    <Button 
                      onClick={() => saveMutation.mutate({ key: "merchant_about_us", value: merchantAboutUs })}
                      disabled={saveMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-merchant-about"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
