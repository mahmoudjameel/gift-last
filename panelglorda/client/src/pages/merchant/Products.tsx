import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal, Edit, Trash, Loader2, Package, Upload, X, ImageIcon, ListPlus, Type, ToggleLeft, Star, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { uploadMultipleToStorage } from "@/lib/storage-upload";
import { getCollectionAll } from "@/lib/firestore";
import {
  addProduct,
  deleteProduct,
  getMerchantProducts,
  getProductOptions,
  saveProductOptions as persistProductOptions,
  setProductVisibility,
  updateProduct,
  type Product,
  type ProductOption
} from "@/lib/merchant-data";

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  isActive: boolean;
}

const MAX_IMAGES = 5;

export default function MerchantProducts() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    productType: "gifts",
    category: "",
    promoBadge: "",
    allowsGiftCard: false,
    giftCardFee: ""
  });

  const productTypeLabels: Record<string, string> = {
    gifts: "هدايا",
    flowers: "ورد"
  };

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => getCollectionAll<Category>("categories"),
  });

  const promoBadgeOptions = [
    { value: "none", label: "بدون عنوان ترويجي" },
    { value: "عرض خاص", label: "عرض خاص" },
    { value: "توصيل مجاني", label: "توصيل مجاني" },
    { value: "الأكثر مبيعاً", label: "الأكثر مبيعاً" },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (files.length > remainingSlots) {
      toast({ variant: "destructive", title: `يمكنك إضافة ${remainingSlots} صور فقط` });
      return;
    }

    setIsUploading(true);

    try {
      // Upload directly to Firebase Storage
      const filesArray = Array.from(files);
      const uploadedUrls = await uploadMultipleToStorage(filesArray, "products");

      setImages(prev => [...prev, ...uploadedUrls]);
      toast({ title: "تم رفع الصور بنجاح" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "فشل رفع الصور",
        description: error.message || "حدث خطأ أثناء رفع الصور"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const setMainImage = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const newImages = [...prev];
      const [selectedImage] = newImages.splice(index, 1);
      newImages.unshift(selectedImage);
      return newImages;
    });
  };

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["merchant-products", user?.id],
    queryFn: () => getMerchantProducts(user!.id),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const newId = await addProduct({
        merchantId: user!.id,
        ...data,
      });
      return newId;
    },
    onSuccess: async (productId) => {
      try {
        // Save product options (even if empty array)
        await persistProductOptions(productId, productOptions);
        queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
        setIsAddOpen(false);
        resetForm();
        toast({ title: "تم إضافة المنتج بنجاح" });
      } catch (error) {
        console.error("Error saving product options:", error);
        // Still show success for product creation, but warn about options
        queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
        setIsAddOpen(false);
        resetForm();
        toast({ 
          variant: "destructive", 
          title: "تم إضافة المنتج لكن فشل حفظ الخيارات",
          description: "يرجى المحاولة مرة أخرى" 
        });
      }
    },
    onError: (error: any) => {
      console.error("Error creating product:", error);
      toast({ 
        variant: "destructive", 
        title: "فشل إضافة المنتج",
        description: error?.message || "حدث خطأ غير متوقع"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      await updateProduct(id, data);
      return { ...data, id };
    },
    onSuccess: async (result) => {
      try {
        // Save product options (even if empty array to clear existing options)
        await persistProductOptions(result.id, productOptions);
        queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
        setIsEditOpen(false);
        setEditingProduct(null);
        resetForm();
        toast({ title: "تم تحديث المنتج بنجاح" });
      } catch (error) {
        console.error("Error saving product options:", error);
        // Still show success for product update, but warn about options
        queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
        setIsEditOpen(false);
        setEditingProduct(null);
        resetForm();
        toast({ 
          variant: "destructive", 
          title: "تم تحديث المنتج لكن فشل حفظ الخيارات",
          description: "يرجى المحاولة مرة أخرى" 
        });
      }
    },
    onError: (error: any) => {
      console.error("Error updating product:", error);
      toast({ 
        variant: "destructive", 
        title: "فشل تحديث المنتج",
        description: error?.message || "حدث خطأ غير متوقع"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
      toast({ title: "تم حذف المنتج بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل حذف المنتج" });
    }
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setProductVisibility(id, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products", user?.id] });
      toast({ title: variables.isActive ? "تم إظهار المنتج" : "تم إخفاء المنتج" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "فشل تغيير حالة المنتج" });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", stock: "", productType: "gifts", category: "", promoBadge: "", allowsGiftCard: false, giftCardFee: "" });
    setImages([]);
    setProductOptions([]);
  };

  const addOption = (type: "multiple_choice" | "text" | "toggle") => {
    const newOption: ProductOption = {
      type,
      title: "",
      placeholder: type === "text" ? "أدخل النص هنا..." : undefined,
      required: false,
      choices: type === "multiple_choice" ? [{ label: "" }] : undefined
    };
    setProductOptions([...productOptions, newOption]);
  };

  const updateOption = (index: number, updates: Partial<ProductOption>) => {
    const newOptions = [...productOptions];
    newOptions[index] = { ...newOptions[index], ...updates };
    setProductOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setProductOptions(productOptions.filter((_, i) => i !== index));
  };

  const addChoice = (optionIndex: number) => {
    const newOptions = [...productOptions];
    if (newOptions[optionIndex].choices) {
      newOptions[optionIndex].choices!.push({ label: "" });
      setProductOptions(newOptions);
    }
  };

  const updateChoice = (optionIndex: number, choiceIndex: number, label: string) => {
    const newOptions = [...productOptions];
    if (newOptions[optionIndex].choices) {
      newOptions[optionIndex].choices![choiceIndex].label = label;
      setProductOptions(newOptions);
    }
  };

  const removeChoice = (optionIndex: number, choiceIndex: number) => {
    const newOptions = [...productOptions];
    if (newOptions[optionIndex].choices) {
      newOptions[optionIndex].choices = newOptions[optionIndex].choices!.filter((_, i) => i !== choiceIndex);
      setProductOptions(newOptions);
    }
  };

  const saveProductOptions = async (productId: string) => {
    if (productOptions.length === 0) return;
    try {
      await persistProductOptions(productId, productOptions);
    } catch (error) {
      console.error("Failed to save product options:", error);
    }
  };

  const loadProductOptions = async (productId: string) => {
    try {
      const options = await getProductOptions(productId);
        setProductOptions(options.map((opt: any) => ({
          type: opt.type,
          title: opt.title,
          placeholder: opt.placeholder,
          required: opt.required,
          choices: opt.choices?.map((c: any) => ({ label: c.label }))
        })));
    } catch (error) {
      console.error("Failed to load product options:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ variant: "destructive", title: "يجب تسجيل الدخول كـ تاجر" });
      return;
    }
    const data = {
      name: formData.name,
      description: formData.description,
      price: Math.round(parseFloat(formData.price) || 0), // Save as integer without decimals
      stock: parseInt(formData.stock),
      productType: formData.productType,
      category: formData.category || formData.productType,
      promoBadge: formData.promoBadge || null,
      images: images,
      status: parseInt(formData.stock) > 0 ? "active" : "out_of_stock",
      allowsGiftCard: formData.allowsGiftCard,
      giftCardFee: formData.allowsGiftCard ? Math.round(parseFloat(formData.giftCardFee) || 0) : 0
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(Math.round(product.price)), // Display as integer without decimals
      stock: String(product.stock),
      productType: product.productType || "gifts",
      category: product.category || "",
      promoBadge: product.promoBadge || "",
      allowsGiftCard: product.allowsGiftCard ?? false,
      giftCardFee: product.giftCardFee != null ? String(product.giftCardFee) : ""
    });
    setImages(product.images || []);
    setProductOptions([]);
    await loadProductOptions(product.id);
    setIsEditOpen(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">المنتجات</h2>
            <p className="text-muted-foreground mt-2">إدارة منتجات متجرك وتتبع المخزون</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm} data-testid="button-add-product">
                <Plus className="w-4 h-4" />
                إضافة منتج
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <DialogHeader className="text-right flex-shrink-0">
                  <DialogTitle>إضافة منتج جديد</DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل المنتج الجديد هنا. اضغط حفظ عند الانتهاء.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">اسم المنتج</Label>
                      <Input
                        id="name"
                        placeholder="مثال: باقة ورد فاخرة"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        data-testid="input-product-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">وصف المنتج</Label>
                      <Textarea
                        id="description"
                        placeholder="وصف المنتج..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        data-testid="input-product-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">السعر (ر.س)</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          min="0"
                          step="1"
                          value={formData.price}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow integers (no decimals)
                            if (value === '' || /^\d+$/.test(value)) {
                              setFormData({ ...formData, price: value });
                            }
                          }}
                          required
                          data-testid="input-product-price"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="stock">الكمية</Label>
                        <Input
                          id="stock"
                          type="number"
                          placeholder="0"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          required
                          data-testid="input-product-stock"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">فئة المنتج</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger id="category" data-testid="select-product-category">
                          <SelectValue placeholder="اختر فئة المنتج" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id?.toString() || cat.id}>
                              {cat.name || cat.nameEn || ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="promoBadge">العنوان الترويجي</Label>
                      <Select
                        value={formData.promoBadge}
                        onValueChange={(value) => setFormData({ ...formData, promoBadge: value })}
                      >
                        <SelectTrigger id="promoBadge" data-testid="select-promo-badge">
                          <SelectValue placeholder="اختر عنوان ترويجي (اختياري)" />
                        </SelectTrigger>
                        <SelectContent>
                          {promoBadgeOptions.map((option) => (
                            <SelectItem key={option.value || "none"} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allowsGiftCard">متاح مع بطاقة هدية</Label>
                        <Switch
                          id="allowsGiftCard"
                          checked={formData.allowsGiftCard}
                          onCheckedChange={(checked) => setFormData({ ...formData, allowsGiftCard: checked })}
                        />
                      </div>
                      {formData.allowsGiftCard && (
                        <div className="grid gap-2">
                          <Label htmlFor="giftCardFee">رسوم بطاقة الإهداء (ر.س)</Label>
                          <Input
                            id="giftCardFee"
                            type="number"
                            placeholder="0"
                            min="0"
                            step="1"
                            value={formData.giftCardFee}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d+$/.test(v)) setFormData({ ...formData, giftCardFee: v });
                            }}
                          />
                          <p className="text-xs text-muted-foreground">اتركه 0 أو فارغاً إذا بدون رسوم إضافية</p>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label>صور المنتج ({images.length}/{MAX_IMAGES})</Label>
                      <p className="text-xs text-muted-foreground">اضغط على النجمة لتعيين الصورة الرئيسية</p>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        {images.length > 0 && (
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {images.map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img}
                                  alt={`صورة ${index + 1}`}
                                  className={`w-full h-16 object-cover rounded border-2 ${index === 0 ? 'border-primary' : 'border-transparent'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setMainImage(index)}
                                  className={`absolute -top-1 -left-1 rounded-full p-0.5 transition-opacity ${index === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                                  title={index === 0 ? 'الصورة الرئيسية' : 'تعيين كصورة رئيسية'}
                                >
                                  <Star className={`w-3 h-3 ${index === 0 ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {images.length < MAX_IMAGES && (
                          <div className="flex flex-col items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                              id="product-images"
                              data-testid="input-product-images"
                            />
                            <label
                              htmlFor="product-images"
                              className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isUploading ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-8 h-8" />
                                  <span className="text-xs">اضغط لرفع الصور</span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">يمكنك رفع من 1 إلى 5 صور (JPEG, PNG, GIF, WebP)</p>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-2">
                      <Label>خيارات المنتج (اختياري)</Label>
                      <p className="text-xs text-muted-foreground mb-2">أضف خيارات يمكن للعميل اختيارها عند الطلب</p>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption("multiple_choice")}
                          className="gap-1"
                        >
                          <ListPlus className="w-3 h-3" /> خيار واحد
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption("text")}
                          className="gap-1"
                        >
                          <Type className="w-3 h-3" /> مربع نص
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption("toggle")}
                          className="gap-1"
                        >
                          <ToggleLeft className="w-3 h-3" /> تفعيل/إيقاف
                        </Button>
                      </div>

                      {productOptions.length > 0 && (
                        <div className="space-y-3 mt-3">
                          {productOptions.map((option, optIndex) => (
                            <div key={optIndex} className="border rounded-lg p-3 bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {option.type === "multiple_choice" ? "خيار واحد" :
                                    option.type === "text" ? "مربع نص" : "تفعيل/إيقاف"}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(optIndex)}
                                  className="h-6 w-6 p-0 text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <Input
                                placeholder="عنوان الخيار (مثال: اللون، الحجم)"
                                value={option.title}
                                onChange={(e) => updateOption(optIndex, { title: e.target.value })}
                                className="mb-2"
                              />
                              {option.type === "text" && (
                                <Input
                                  placeholder="نص توضيحي (مثال: اكتب رسالتك هنا)"
                                  value={option.placeholder || ""}
                                  onChange={(e) => updateOption(optIndex, { placeholder: e.target.value })}
                                  className="mb-2"
                                />
                              )}
                              {option.type === "multiple_choice" && option.choices && (
                                <div className="space-y-1">
                                  {option.choices.map((choice, choiceIndex) => (
                                    <div key={choiceIndex} className="flex gap-1">
                                      <Input
                                        placeholder={`الخيار ${choiceIndex + 1}`}
                                        value={choice.label}
                                        onChange={(e) => updateChoice(optIndex, choiceIndex, e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                      {option.choices!.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeChoice(optIndex, choiceIndex)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addChoice(optIndex)}
                                    className="text-xs"
                                  >
                                    + إضافة خيار
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Switch
                                  checked={option.required}
                                  onCheckedChange={(checked) => updateOption(optIndex, { required: checked })}
                                />
                                <span className="text-xs">إجباري</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4">
                  <Button type="submit" disabled={createMutation.isPending || isUploading} data-testid="button-save-product">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ المنتج"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث عن منتج..."
            className="max-w-sm border-none shadow-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-products"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">لا توجد منتجات</h3>
            <p className="text-muted-foreground">ابدأ بإضافة منتجات لمتجرك</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                data-testid={`card-product-${product.id}`}
              >
                <div className="aspect-square relative bg-muted">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <Badge
                      variant={
                        product.status === 'active' ? 'default' :
                          product.status === 'hidden' ? 'secondary' : 'destructive'
                      }
                      className={`text-xs ${product.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' :
                        product.status === 'hidden' ? 'bg-gray-500 hover:bg-gray-600' : ''
                        }`}
                    >
                      {
                        product.status === 'active' ? 'نشط' :
                          product.status === 'hidden' ? 'مخفي' : 'غير نشط'
                      }
                    </Badge>
                  </div>
                  {product.promoBadge && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-xs">{product.promoBadge}</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate mb-1">{product.name}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`text-xs ${product.productType === 'flowers' ? 'border-pink-300 text-pink-600' : 'border-amber-300 text-amber-600'}`}>
                      {productTypeLabels[product.productType] || product.productType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">المخزون: {product.stock}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{(product.price / 100).toFixed(2)} ر.س</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-product-menu-${product.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => toggleVisibilityMutation.mutate({ id: product.id, isActive: product.status === "hidden" })}
                        >
                          {product.status === 'hidden' ? (
                            <><Eye className="w-4 h-4" /> إظهار</>
                          ) : (
                            <><EyeOff className="w-4 h-4" /> إخفاء</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => deleteMutation.mutate(product.id)}
                        >
                          <Trash className="w-4 h-4" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <DialogHeader className="text-right flex-shrink-0">
                <DialogTitle>تعديل المنتج</DialogTitle>
                <DialogDescription>
                  عدّل تفاصيل المنتج. اضغط حفظ عند الانتهاء.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">اسم المنتج</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">وصف المنتج</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-price">السعر (ر.س)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        placeholder="0"
                        min="0"
                        step="1"
                        value={formData.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow integers (no decimals)
                          if (value === '' || /^\d+$/.test(value)) {
                            setFormData({ ...formData, price: value });
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-stock">الكمية</Label>
                      <Input
                        id="edit-stock"
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">فئة المنتج</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="اختر فئة المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id?.toString() || cat.id}>
                            {cat.name || cat.nameEn || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-promoBadge">العنوان الترويجي</Label>
                    <Select
                      value={formData.promoBadge}
                      onValueChange={(value) => setFormData({ ...formData, promoBadge: value })}
                    >
                      <SelectTrigger id="edit-promoBadge">
                        <SelectValue placeholder="اختر عنوان ترويجي (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        {promoBadgeOptions.map((option) => (
                          <SelectItem key={option.value || "none"} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-allowsGiftCard">متاح مع بطاقة هدية</Label>
                      <Switch
                        id="edit-allowsGiftCard"
                        checked={formData.allowsGiftCard}
                        onCheckedChange={(checked) => setFormData({ ...formData, allowsGiftCard: checked })}
                      />
                    </div>
                    {formData.allowsGiftCard && (
                      <div className="grid gap-2">
                        <Label htmlFor="edit-giftCardFee">رسوم بطاقة الإهداء (ر.س)</Label>
                        <Input
                          id="edit-giftCardFee"
                          type="number"
                          placeholder="0"
                          min="0"
                          step="1"
                          value={formData.giftCardFee}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^\d+$/.test(v)) setFormData({ ...formData, giftCardFee: v });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>صور المنتج ({images.length}/{MAX_IMAGES})</Label>
                    <p className="text-xs text-muted-foreground">اضغط على النجمة لتعيين الصورة الرئيسية</p>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      {images.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {images.map((img, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={img}
                                alt={`صورة ${index + 1}`}
                                className={`w-full h-16 object-cover rounded border-2 ${index === 0 ? 'border-primary' : 'border-transparent'}`}
                              />
                              <button
                                type="button"
                                onClick={() => setMainImage(index)}
                                className={`absolute -top-1 -left-1 rounded-full p-0.5 transition-opacity ${index === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                                title={index === 0 ? 'الصورة الرئيسية' : 'تعيين كصورة رئيسية'}
                              >
                                <Star className={`w-3 h-3 ${index === 0 ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {images.length < MAX_IMAGES && (
                        <div className="flex flex-col items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="edit-product-images"
                          />
                          <label
                            htmlFor="edit-product-images"
                            className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isUploading ? (
                              <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-8 h-8" />
                                <span className="text-xs">اضغط لرفع الصور</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">يمكنك رفع من 1 إلى 5 صور (JPEG, PNG, GIF, WebP)</p>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-2">
                    <Label>خيارات المنتج (اختياري)</Label>
                    <p className="text-xs text-muted-foreground mb-2">أضف خيارات يمكن للعميل اختيارها عند الطلب</p>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption("multiple_choice")}
                        className="gap-1"
                      >
                        <ListPlus className="w-3 h-3" /> خيار واحد
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption("text")}
                        className="gap-1"
                      >
                        <Type className="w-3 h-3" /> مربع نص
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption("toggle")}
                        className="gap-1"
                      >
                        <ToggleLeft className="w-3 h-3" /> تفعيل/إيقاف
                      </Button>
                    </div>

                    {productOptions.length > 0 && (
                      <div className="space-y-3 mt-3">
                        {productOptions.map((option, optIndex) => (
                          <div key={optIndex} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {option.type === "multiple_choice" ? "خيار واحد" :
                                  option.type === "text" ? "مربع نص" : "خيار واحد"}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(optIndex)}
                                className="h-6 w-6 p-0 text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="عنوان الخيار (مثال: اللون، الحجم)"
                              value={option.title}
                              onChange={(e) => updateOption(optIndex, { title: e.target.value })}
                              className="mb-2"
                            />
                            {option.type === "text" && (
                              <Input
                                placeholder="نص توضيحي (مثال: اكتب رسالتك هنا)"
                                value={option.placeholder || ""}
                                onChange={(e) => updateOption(optIndex, { placeholder: e.target.value })}
                                className="mb-2"
                              />
                            )}
                            {option.type === "multiple_choice" && option.choices && (
                              <div className="space-y-1">
                                {option.choices.map((choice, choiceIndex) => (
                                  <div key={choiceIndex} className="flex gap-1">
                                    <Input
                                      placeholder={`الخيار ${choiceIndex + 1}`}
                                      value={choice.label}
                                      onChange={(e) => updateChoice(optIndex, choiceIndex, e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                    {option.choices!.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeChoice(optIndex, choiceIndex)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addChoice(optIndex)}
                                  className="text-xs"
                                >
                                  + إضافة خيار
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Switch
                                checked={option.required}
                                onCheckedChange={(checked) => updateOption(optIndex, { required: checked })}
                              />
                              <span className="text-xs">إجباري</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4">
                <Button type="submit" disabled={updateMutation.isPending || isUploading}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
