import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Image, Grid3X3, Plus, Trash2, Loader2, Edit, GripVertical, MapPin, ChevronsUpDown, Check, Tag, Percent, DollarSign, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saudiCities } from "@/constants/saudiCities";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef } from "react";
import { uploadToStorage } from "@/lib/storage-upload";
import { setDocData, getDocData } from "@/lib/firestore";
import {
  addBanner,
  addCategory,
  addCity,
  addDiscountCode,
  deleteBanner,
  deleteCategory,
  deleteCity,
  deleteDiscountCode,
  getBanners,
  getCategories,
  getCities,
  getDiscountCodes,
  seedPetaliaDemoData,
  updateBanner,
  updateCategory,
  updateCity,
  updateDiscountCode,
  type Banners,
  type Categories,
  type Cities,
  type DiscountCodes,
} from "@/lib/admin-data";

export default function AppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryIconInputRef = useRef<HTMLInputElement>(null);

  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [bannerForm, setBannerForm] = useState({
    title: "",
    image: "",
    link: "",
    isActive: true,
    sortOrder: 0
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameEn: "",
    icon: "",
    image: "",
    isActive: true,
    sortOrder: 0
  });

  const [isAddCityOpen, setIsAddCityOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityForm, setCityForm] = useState({
    name: "",
    nameEn: "",
    isActive: true,
    sortOrder: 0
  });

  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed" | "free_shipping",
    value: 0,
    minOrderAmount: 0,
    maxUses: null as number | null,
    isActive: true,
    expiresAt: ""
  });

  const { data: banners = [], isLoading: loadingBanners } = useQuery<Banners[]>({
    queryKey: ["banners"],
    queryFn: getBanners
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery<Categories[]>({
    queryKey: ["categories"],
    queryFn: getCategories
  });

  const { data: cities = [], isLoading: loadingCities } = useQuery<Cities[]>({
    queryKey: ["cities"],
    queryFn: getCities
  });

  const { data: discountCodes = [], isLoading: loadingDiscounts } = useQuery<DiscountCodes[]>({
    queryKey: ["discount-codes"],
    queryFn: getDiscountCodes
  });

  const [deliveryFee, setDeliveryFee] = useState<string | null>(null);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string>("25");
  const [isSavingDeliveryFee, setIsSavingDeliveryFee] = useState(false);
  const [isSeedingDemoData, setIsSeedingDemoData] = useState(false);

  // Load delivery fee setting
  React.useEffect(() => {
    const loadDeliveryFee = async () => {
      try {
        const setting = await getDocData<{ value?: string }>('settings/delivery_fee');
        if (setting && setting.value) {
          setDeliveryFee(setting.value);
          setDeliveryFeeInput(setting.value);
        }
      } catch (error) {
        console.error('Failed to load delivery fee:', error);
      }
    };
    loadDeliveryFee();
  }, []);

  const handleSaveDeliveryFee = async () => {
    const value = deliveryFeeInput.trim();
    if (!value || parseFloat(value) < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر صحيح",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDeliveryFee(true);
    try {
      // Save directly to Firestore
      await setDocData('settings/delivery_fee', {
        value: value,
        updatedAt: new Date()
      });
      
      setDeliveryFee(value);
      toast({
        title: "تم الحفظ",
        description: "تم تحديث سعر التوصيل بنجاح",
      });
    } catch (error: any) {
      console.error('Error saving delivery fee:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل تحديث سعر التوصيل. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDeliveryFee(false);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeedingDemoData(true);
    try {
      const result = await seedPetaliaDemoData();
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast({
        title: "تمت إضافة البيانات التجريبية",
        description: `تمت إضافة ${result.categories} تصنيف، ${result.merchants} متجر، ${result.products} منتج، ${result.cities} مدينة.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل إضافة البيانات التجريبية",
        description: error?.message || "حدث خطأ أثناء إنشاء Seed Data.",
      });
    } finally {
      setIsSeedingDemoData(false);
    }
  };

  // Helper function to convert base64 to File
  const base64ToFile = (base64String: string, filename: string): File => {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Helper function to upload base64 to Firebase Storage
  const uploadBase64ToStorage = async (base64String: string, folder: string): Promise<string> => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const mime = base64String.match(/data:(.*?);/)?.[1] || 'image/png';
    const extension = mime.split('/')[1] || 'png';
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;
    const file = base64ToFile(base64String, filename);
    return await uploadToStorage(file, folder);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'category') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "حجم الصورة كبير جداً", description: "الحد الأقصى 5 ميجابايت" });
      return;
    }

    setIsUploading(true);

    try {
      // Upload directly to Firebase Storage
      const uploadedUrl = await uploadToStorage(file, type === 'banner' ? 'banners' : 'categories');

      if (type === 'banner') {
        setBannerForm(prev => ({ ...prev, image: uploadedUrl }));
      } else { // type === 'category'
        setCategoryForm(prev => ({ ...prev, icon: uploadedUrl }));
      }
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "فشل رفع الصورة",
        description: error.message || "حدث خطأ أثناء رفع الصورة"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (categoryIconInputRef.current) {
        categoryIconInputRef.current.value = "";
      }
    }
  };

  // Banner mutations
  const createBannerMutation = useMutation({
    mutationFn: (data: typeof bannerForm) => addBanner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم إضافة البانر بنجاح" });
      setIsAddBannerOpen(false);
      resetBannerForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل إضافة البانر" });
    }
  });

  const updateBannerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof bannerForm> }) => updateBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم تحديث البانر بنجاح" });
      setEditingBanner(null);
      resetBannerForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث البانر" });
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: "تم حذف البانر" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل حذف البانر" });
    }
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryForm) => addCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "تم إضافة القسم بنجاح" });
      setIsAddCategoryOpen(false);
      resetCategoryForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل إضافة القسم" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof categoryForm> }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "تم تحديث القسم بنجاح" });
      setEditingCategory(null);
      resetCategoryForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث القسم" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "تم حذف القسم" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل حذف القسم" });
    }
  });

  // City mutations
  const createCityMutation = useMutation({
    mutationFn: (data: typeof cityForm) => addCity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast({ title: "تم إضافة المدينة بنجاح", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
      setIsAddCityOpen(false);
      resetCityForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل إضافة المدينة" });
    }
  });

  const updateCityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof cityForm> }) => updateCity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast({ title: "تم تحديث المدينة بنجاح" });
      setEditingCity(null);
      resetCityForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تحديث المدينة" });
    }
  });

  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => deleteCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast({ title: "تم حذف المدينة" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل حذف المدينة" });
    }
  });

  const createDiscountMutation = useMutation({
    mutationFn: (data: typeof discountForm) => addDiscountCode({ ...data, expiresAt: data.expiresAt || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      toast({ title: "تم إضافة كود الخصم بنجاح", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
      setIsDiscountOpen(false);
      resetDiscountForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const updateDiscountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof discountForm> }) =>
      updateDiscountCode(id, { ...data, expiresAt: data.expiresAt || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      toast({ title: "تم تحديث كود الخصم بنجاح", className: "bg-emerald-50 border-emerald-200 text-emerald-800" });
      setIsDiscountOpen(false);
      setEditingDiscount(null);
      resetDiscountForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: (id: string) => deleteDiscountCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      toast({ title: "تم حذف كود الخصم" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل حذف كود الخصم" });
    }
  });

  const resetBannerForm = () => {
    setBannerForm({ title: "", image: "", link: "", isActive: true, sortOrder: 0 });
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", nameEn: "", icon: "", image: "", isActive: true, sortOrder: 0 });
  };

  const resetCityForm = () => {
    setCityForm({ name: "", nameEn: "", isActive: true, sortOrder: 0 });
  };

  const resetDiscountForm = () => {
    setDiscountForm({
      code: "",
      type: "percentage",
      value: 0,
      minOrderAmount: 0,
      maxUses: null,
      isActive: true,
      expiresAt: ""
    });
  };

  const handleDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.code) {
      toast({ variant: "destructive", title: "اسم الكود مطلوب" });
      return;
    }
    if (discountForm.type !== "free_shipping" && discountForm.value <= 0) {
      toast({ variant: "destructive", title: "قيمة الخصم يجب أن تكون أكبر من صفر" });
      return;
    }
    if (discountForm.type === "percentage" && discountForm.value > 100) {
      toast({ variant: "destructive", title: "نسبة الخصم لا يمكن أن تتجاوز 100%" });
      return;
    }
    if (editingDiscount) {
      updateDiscountMutation.mutate({ id: editingDiscount.id, data: discountForm });
    } else {
      createDiscountMutation.mutate(discountForm);
    }
  };

  const openEditDiscount = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setDiscountForm({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      minOrderAmount: discount.minOrderAmount || 0,
      maxUses: discount.maxUses,
      isActive: discount.isActive,
      expiresAt: discount.expiresAt ? new Date(discount.expiresAt).toISOString().split("T")[0] : ""
    });
    setIsDiscountOpen(true);
  };

  const getDiscountTypeLabel = (type: string) => {
    switch (type) {
      case "percentage": return "نسبة مئوية";
      case "fixed": return "قيمة ثابتة";
      case "free_shipping": return "شحن مجاني";
      default: return type;
    }
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case "percentage": return <Percent className="w-4 h-4" />;
      case "fixed": return <DollarSign className="w-4 h-4" />;
      case "free_shipping": return <Truck className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const handleEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm({
      name: city.name,
      nameEn: city.nameEn || "",
      isActive: city.isActive,
      sortOrder: city.sortOrder
    });
  };

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityForm.name) {
      toast({ variant: "destructive", title: "اسم المدينة مطلوب" });
      return;
    }
    if (editingCity) {
      updateCityMutation.mutate({ id: editingCity.id, data: cityForm });
    } else {
      createCityMutation.mutate(cityForm);
    }
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      image: banner.image,
      link: banner.link || "",
      isActive: banner.isActive,
      sortOrder: banner.sortOrder
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      nameEn: category.nameEn || "",
      icon: category.icon || "",
      image: category.image || "",
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title || !bannerForm.image) {
      toast({ variant: "destructive", title: "العنوان والصورة مطلوبان" });
      return;
    }
    if (editingBanner) {
      updateBannerMutation.mutate({ id: editingBanner.id, data: bannerForm });
    } else {
      createBannerMutation.mutate(bannerForm);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast({ variant: "destructive", title: "اسم القسم مطلوب" });
      return;
    }

    // Check if icon is base64 and upload it before saving
    let finalCategoryForm = { ...categoryForm };
    if (categoryForm.icon && categoryForm.icon.startsWith('data:image/')) {
      setIsUploading(true);
      try {
        const uploadedUrl = await uploadBase64ToStorage(categoryForm.icon, 'categories');
        finalCategoryForm.icon = uploadedUrl;
        toast({ title: "تم رفع الصورة بنجاح" });
      } catch (error: any) {
        console.error("Base64 upload error:", error);
        toast({
          variant: "destructive",
          title: "فشل رفع الصورة",
          description: error.message || "حدث خطأ أثناء رفع الصورة"
        });
        setIsUploading(false);
        return; // Don't save if upload fails
      } finally {
        setIsUploading(false);
      }
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: finalCategoryForm });
    } else {
      createCategoryMutation.mutate(finalCategoryForm);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">إعدادات التطبيق</h2>
          <p className="text-muted-foreground mt-2">إدارة البانرات والأقسام المعروضة في التطبيق</p>
        </div>

        <Tabs defaultValue="banners" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="banners" className="gap-2">
              <Image className="w-4 h-4" />
              البانرات
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="cities" className="gap-2">
              <MapPin className="w-4 h-4" />
              المدن
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2">
              <Tag className="w-4 h-4" />
              أكواد الخصم
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <DollarSign className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banners">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    البانرات
                  </CardTitle>
                  <CardDescription className="mt-2">
                    إدارة صور البانر في الصفحة الرئيسية للتطبيق
                  </CardDescription>
                </div>
                <Dialog open={isAddBannerOpen || !!editingBanner} onOpenChange={(open) => {
                  if (!open) {
                    setIsAddBannerOpen(false);
                    setEditingBanner(null);
                    resetBannerForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" onClick={() => setIsAddBannerOpen(true)} data-testid="button-add-banner">
                      <Plus className="w-4 h-4" />
                      إضافة بانر
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingBanner ? "تعديل البانر" : "إضافة بانر جديد"}</DialogTitle>
                      <DialogDescription>
                        {editingBanner ? "قم بتعديل بيانات البانر" : "أضف صورة بانر جديدة للصفحة الرئيسية"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBannerSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>العنوان</Label>
                        <Input
                          placeholder="عنوان البانر"
                          value={bannerForm.title}
                          onChange={(e) => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                          data-testid="input-banner-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الصورة</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="رابط الصورة"
                            value={bannerForm.image}
                            onChange={(e) => setBannerForm(prev => ({ ...prev, image: e.target.value }))}
                            data-testid="input-banner-image"
                          />
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'banner')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع"}
                          </Button>
                        </div>
                        {bannerForm.image && (
                          <img src={bannerForm.image} alt="Preview" className="h-24 rounded-lg object-cover" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>الرابط (اختياري)</Label>
                        <Input
                          placeholder="رابط عند النقر على البانر"
                          value={bannerForm.link}
                          onChange={(e) => setBannerForm(prev => ({ ...prev, link: e.target.value }))}
                          data-testid="input-banner-link"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={bannerForm.isActive}
                          onCheckedChange={(checked) => setBannerForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label>نشط</Label>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createBannerMutation.isPending || updateBannerMutation.isPending}>
                          {(createBannerMutation.isPending || updateBannerMutation.isPending) &&
                            <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                          {editingBanner ? "حفظ التعديلات" : "إضافة البانر"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingBanners ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : banners.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا توجد بانرات</h3>
                    <p className="text-muted-foreground">قم بإضافة بانر جديد للصفحة الرئيسية</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {banners.map((banner) => (
                      <div key={banner.id} className="border rounded-lg overflow-hidden" data-testid={`card-banner-${banner.id}`}>
                        <img src={banner.image} alt={banner.title} className="w-full h-32 object-cover" />
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{banner.title}</span>
                            <Badge variant={banner.isActive ? "default" : "secondary"}>
                              {banner.isActive ? "نشط" : "معطل"}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditBanner(banner)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteBannerMutation.mutate(banner.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5" />
                    الأقسام
                  </CardTitle>
                  <CardDescription className="mt-2">
                    إدارة أقسام المنتجات في التطبيق
                  </CardDescription>
                </div>
                <Dialog open={isAddCategoryOpen || !!editingCategory} onOpenChange={(open) => {
                  if (!open) {
                    setIsAddCategoryOpen(false);
                    setEditingCategory(null);
                    resetCategoryForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" onClick={() => setIsAddCategoryOpen(true)} data-testid="button-add-category">
                      <Plus className="w-4 h-4" />
                      إضافة قسم
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
                      <DialogDescription>
                        {editingCategory ? "قم بتعديل بيانات القسم" : "أضف قسم جديد للتطبيق"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>اسم القسم (عربي)</Label>
                        <Input
                          placeholder="مثال: ورود وهدايا"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          data-testid="input-category-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم القسم (إنجليزي) - اختياري</Label>
                        <Input
                          placeholder="مثال: Flowers & Gifts"
                          value={categoryForm.nameEn}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, nameEn: e.target.value }))}
                          data-testid="input-category-name-en"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>أيقونة القسم (اختياري)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://example.com/icon.png"
                            value={categoryForm.icon}
                            onChange={async (e) => {
                              const value = e.target.value;
                              // If user pastes base64, automatically upload it to Firebase Storage
                              if (value.startsWith('data:image/')) {
                                setIsUploading(true);
                                try {
                                  const uploadedUrl = await uploadBase64ToStorage(value, 'categories');
                                  setCategoryForm(prev => ({ ...prev, icon: uploadedUrl }));
                                  toast({ title: "تم رفع الصورة بنجاح" });
                                } catch (error: any) {
                                  console.error("Base64 upload error:", error);
                                  toast({
                                    variant: "destructive",
                                    title: "فشل رفع الصورة",
                                    description: error.message || "حدث خطأ أثناء رفع الصورة"
                                  });
                                } finally {
                                  setIsUploading(false);
                                }
                                return;
                              }
                              setCategoryForm(prev => ({ ...prev, icon: value }));
                            }}
                            className="font-mono text-left"
                            dir="ltr"
                            data-testid="input-category-icon"
                          />
                          <input
                            type="file"
                            ref={categoryIconInputRef}
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'category')}
                            className="hidden"
                            id="category-icon-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => categoryIconInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                جاري الرفع...
                              </>
                            ) : (
                              <>
                                <Image className="w-4 h-4 mr-2" />
                                رفع صورة
                              </>
                            )}
                          </Button>
                        </div>
                        {categoryForm.icon && (
                          <div className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                            <img 
                              src={categoryForm.icon} 
                              alt="أيقونة" 
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                console.error('Image load error:', categoryForm.icon);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span className="text-xs text-muted-foreground">معاينة الأيقونة</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={categoryForm.isActive}
                          onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label>نشط</Label>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending || isUploading}>
                          {(createCategoryMutation.isPending || updateCategoryMutation.isPending || isUploading) &&
                            <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                          {isUploading ? "جاري رفع الصورة..." : editingCategory ? "حفظ التعديلات" : "إضافة القسم"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا توجد أقسام</h3>
                    <p className="text-muted-foreground">قم بإضافة قسم جديد</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-4" data-testid={`card-category-${category.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {category.icon && (
                              <img 
                                src={category.icon} 
                                alt={category.name}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  console.error('Category icon load error:', category.icon);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div className="font-medium">{category.name}</div>
                              {category.nameEn && <div className="text-sm text-muted-foreground">{category.nameEn}</div>}
                            </div>
                          </div>
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "نشط" : "معطل"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    المدن
                  </CardTitle>
                  <CardDescription className="mt-2">
                    المدن المتاحة للعملاء والتجار في التطبيق
                  </CardDescription>
                </div>
                <Dialog open={isAddCityOpen || !!editingCity} onOpenChange={(open) => {
                  if (!open) {
                    setIsAddCityOpen(false);
                    setEditingCity(null);
                    resetCityForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" onClick={() => setIsAddCityOpen(true)} data-testid="button-add-city">
                      <Plus className="w-4 h-4" />
                      إضافة مدينة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCity ? "تعديل المدينة" : "إضافة مدينة جديدة"}</DialogTitle>
                      <DialogDescription>
                        {editingCity ? "قم بتعديل بيانات المدينة" : "أضف مدينة جديدة للتطبيق"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCitySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>اختر المدينة</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !cityForm.name && "text-muted-foreground"
                              )}
                              data-testid="select-city"
                            >
                              {cityForm.name
                                ? cityForm.name + " - " + cityForm.nameEn
                                : "اختر مدينة من القائمة"}
                              <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start" dir="rtl">
                            <Command dir="rtl">
                              <CommandInput placeholder="ابحث عن مدينة..." className="text-right" />
                              <CommandList>
                                <CommandEmpty>لم يتم العثور على مدينة</CommandEmpty>
                                <CommandGroup className="max-h-[300px] overflow-y-auto">
                                  {saudiCities.map((city) => (
                                    <CommandItem
                                      value={city.nameAr + " " + city.nameEn}
                                      key={city.nameAr}
                                      onSelect={() => {
                                        setCityForm(prev => ({
                                          ...prev,
                                          name: city.nameAr,
                                          nameEn: city.nameEn
                                        }));
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "ml-2 h-4 w-4",
                                          city.nameAr === cityForm.name ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {city.nameAr} - {city.nameEn}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {cityForm.name && (
                        <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                          <p className="text-sm"><span className="text-muted-foreground">العربي:</span> {cityForm.name}</p>
                          <p className="text-sm"><span className="text-muted-foreground">الإنجليزي:</span> {cityForm.nameEn}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="citySortOrder">ترتيب العرض</Label>
                        <Input
                          id="citySortOrder"
                          type="number"
                          placeholder="0"
                          value={cityForm.sortOrder}
                          onChange={(e) => setCityForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                          data-testid="input-city-order"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cityForm.isActive}
                          onCheckedChange={(checked) => setCityForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label>نشط</Label>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createCityMutation.isPending || updateCityMutation.isPending} data-testid="button-submit-city">
                          {(createCityMutation.isPending || updateCityMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                          {editingCity ? "حفظ التعديلات" : "إضافة المدينة"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingCities ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : cities.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا توجد مدن</h3>
                    <p className="text-muted-foreground">قم بإضافة مدينة جديدة للبدء</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الاسم (عربي)</TableHead>
                          <TableHead className="text-right">الاسم (إنجليزي)</TableHead>
                          <TableHead className="text-right">الترتيب</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cities.map((city) => (
                          <TableRow key={city.id} data-testid={`row-city-${city.id}`}>
                            <TableCell className="font-medium">{city.name}</TableCell>
                            <TableCell className="text-muted-foreground">{city.nameEn || "-"}</TableCell>
                            <TableCell>{city.sortOrder}</TableCell>
                            <TableCell>
                              <Badge variant={city.isActive ? "default" : "secondary"}>
                                {city.isActive ? "نشط" : "معطل"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditCity(city)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteCityMutation.mutate(city.id)}
                                  disabled={deleteCityMutation.isPending}
                                  data-testid={`button-delete-city-${city.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
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

          <TabsContent value="discounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    أكواد الخصم
                  </CardTitle>
                  <CardDescription className="mt-2">
                    إدارة أكواد الخصم للتطبيق
                  </CardDescription>
                </div>
                <Dialog open={isDiscountOpen} onOpenChange={(open) => {
                  setIsDiscountOpen(open);
                  if (!open) {
                    setEditingDiscount(null);
                    resetDiscountForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-discount">
                      <Plus className="w-4 h-4" />
                      إضافة كود خصم
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingDiscount ? "تعديل كود الخصم" : "إضافة كود خصم جديد"}</DialogTitle>
                      <DialogDescription>
                        {editingDiscount ? "عدّل بيانات كود الخصم" : "أدخل بيانات كود الخصم الجديد"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDiscountSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="discountCode">اسم الكود</Label>
                        <Input
                          id="discountCode"
                          placeholder="مثال: SAVE20"
                          value={discountForm.code}
                          onChange={(e) => setDiscountForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          data-testid="input-discount-code"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>نوع الخصم</Label>
                        <Select
                          value={discountForm.type}
                          onValueChange={(value: "percentage" | "fixed" | "free_shipping") =>
                            setDiscountForm(prev => ({ ...prev, type: value, value: value === "free_shipping" ? 0 : prev.value }))
                          }
                        >
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              <div className="flex items-center gap-2">
                                <Percent className="w-4 h-4" />
                                نسبة مئوية
                              </div>
                            </SelectItem>
                            <SelectItem value="fixed">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                قيمة ثابتة
                              </div>
                            </SelectItem>
                            <SelectItem value="free_shipping">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                شحن مجاني
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {discountForm.type !== "free_shipping" && (
                        <div className="space-y-2">
                          <Label htmlFor="discountValue">
                            {discountForm.type === "percentage" ? "نسبة الخصم (%)" : "قيمة الخصم (ريال)"}
                          </Label>
                          <Input
                            id="discountValue"
                            type="number"
                            min="0"
                            max={discountForm.type === "percentage" ? 100 : undefined}
                            placeholder={discountForm.type === "percentage" ? "مثال: 20" : "مثال: 50"}
                            value={discountForm.value || ""}
                            onChange={(e) => setDiscountForm(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                            data-testid="input-discount-value"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="minOrderAmount">الحد الأدنى للطلب (ريال) - اختياري</Label>
                        <Input
                          id="minOrderAmount"
                          type="number"
                          min="0"
                          placeholder="مثال: 100"
                          value={discountForm.minOrderAmount || ""}
                          onChange={(e) => setDiscountForm(prev => ({ ...prev, minOrderAmount: parseInt(e.target.value) || 0 }))}
                          data-testid="input-min-order"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxUses">الحد الأقصى للاستخدام - اختياري</Label>
                        <Input
                          id="maxUses"
                          type="number"
                          min="1"
                          placeholder="اتركه فارغاً لاستخدام غير محدود"
                          value={discountForm.maxUses || ""}
                          onChange={(e) => setDiscountForm(prev => ({ ...prev, maxUses: e.target.value ? parseInt(e.target.value) : null }))}
                          data-testid="input-max-uses"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiresAt">تاريخ الانتهاء - اختياري</Label>
                        <Input
                          id="expiresAt"
                          type="date"
                          value={discountForm.expiresAt}
                          onChange={(e) => setDiscountForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                          data-testid="input-expires-at"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isActive">نشط</Label>
                        <Switch
                          id="isActive"
                          checked={discountForm.isActive}
                          onCheckedChange={(checked) => setDiscountForm(prev => ({ ...prev, isActive: checked }))}
                          data-testid="switch-is-active"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createDiscountMutation.isPending || updateDiscountMutation.isPending}
                          data-testid="button-submit-discount"
                        >
                          {(createDiscountMutation.isPending || updateDiscountMutation.isPending) &&
                            <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          }
                          {editingDiscount ? "حفظ التغييرات" : "إضافة الكود"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingDiscounts ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : discountCodes.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">لا توجد أكواد خصم</h3>
                    <p className="text-muted-foreground">قم بإضافة كود خصم جديد للبدء</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الكود</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">القيمة</TableHead>
                          <TableHead className="text-right">الاستخدام</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discountCodes.map((discount) => (
                          <TableRow key={discount.id} data-testid={`row-discount-${discount.id}`}>
                            <TableCell className="font-mono font-bold">{discount.code}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDiscountTypeIcon(discount.type)}
                                {getDiscountTypeLabel(discount.type)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {discount.type === "percentage" ? `${discount.value}%` :
                                discount.type === "fixed" ? `${discount.value} ريال` : "-"}
                            </TableCell>
                            <TableCell>
                              {discount.maxUses
                                ? `${discount.usedCount}/${discount.maxUses}`
                                : `${discount.usedCount} (غير محدود)`
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={discount.isActive ? "default" : "secondary"}>
                                {discount.isActive ? "نشط" : "غير نشط"}
                              </Badge>
                              {discount.expiresAt && new Date(discount.expiresAt) < new Date() && (
                                <Badge variant="destructive" className="mr-2">منتهي</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDiscount(discount)}
                                  data-testid={`button-edit-discount-${discount.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteDiscountMutation.mutate(discount.id)}
                                  disabled={deleteDiscountMutation.isPending}
                                  data-testid={`button-delete-discount-${discount.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  إعدادات التوصيل
                </CardTitle>
                <CardDescription>
                  إدارة أسعار التوصيل في التطبيق
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-semibold">إضافة بيانات تجريبية واقعية (Petalia)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        يضيف تلقائياً تصنيفات (زهور، كوزمتكس، كيك، عطور) مع متاجر ومنتجات وصور حقيقية قريبة لسيناريو التطبيق.
                      </p>
                    </div>
                    <Button
                      onClick={handleSeedDemoData}
                      disabled={isSeedingDemoData}
                      className="min-w-[180px]"
                      data-testid="button-seed-demo-data"
                    >
                      {isSeedingDemoData ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري الإضافة...
                        </>
                      ) : (
                        "إضافة Seed Data"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_fee">سعر التوصيل (ريال سعودي)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="delivery_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="25"
                        value={deliveryFeeInput}
                        onChange={(e) => setDeliveryFeeInput(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button
                        onClick={handleSaveDeliveryFee}
                        disabled={isSavingDeliveryFee}
                      >
                        {isSavingDeliveryFee ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          "حفظ"
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        السعر الحالي: {deliveryFee || 25} ريال
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      بعد الحفظ، سيتم تحديث السعر في التطبيق تلقائياً
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
