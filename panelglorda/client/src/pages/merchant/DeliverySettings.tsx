import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Truck,
    Store,
    MapPin,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Save,
    Clock,
    ExternalLink,
    Power,
    Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocData, setDocData, getCollectionAll, addCollectionDoc, updateDocData } from "@/lib/firestore";

interface Branch {
    id: string;
    cityId?: string;
    nameAr: string;
    nameEn: string;
    addressAr: string;
    addressEn: string;
    googleMapsUrl: string;
    lat?: number;
    lng?: number;
    workingDays: string[];
    workingHoursStart: string;
    workingHoursEnd: string;
    isActive: boolean;
}

interface City {
    id: string;
    nameAr: string;
    nameEn: string;
}

interface DeliveryTimeSlot {
    id: string;
    nameAr: string;
    nameEn: string;
    startTime: string;
    endTime: string;
}

interface DeliveryOption {
    id: string;
    type: 'own_delivery' | 'third_party';
    titleAr: string;
    titleEn: string;
    deliveryPrice: number;
    cityId: string;
    deliveryDays: string[];
    deliveryTimeSlots: DeliveryTimeSlot[];
    isActive: boolean;
}

const WEEKDAYS = [
    { id: 'sunday', nameAr: 'الأحد', nameEn: 'Sunday' },
    { id: 'monday', nameAr: 'الاثنين', nameEn: 'Monday' },
    { id: 'tuesday', nameAr: 'الثلاثاء', nameEn: 'Tuesday' },
    { id: 'wednesday', nameAr: 'الأربعاء', nameEn: 'Wednesday' },
    { id: 'thursday', nameAr: 'الخميس', nameEn: 'Thursday' },
    { id: 'friday', nameAr: 'الجمعة', nameEn: 'Friday' },
    { id: 'saturday', nameAr: 'السبت', nameEn: 'Saturday' },
];

export default function DeliverySettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // General Settings State
    const [enabledMethods, setEnabledMethods] = useState<('pickup' | 'delivery')[]>([]);

    // Branch Dialog State
    const [branchDialogOpen, setBranchDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [branchForm, setBranchForm] = useState({
        nameAr: '',
        nameEn: '',
        cityId: '',
        addressAr: '',
        addressEn: '',
        googleMapsUrl: '',
        workingDays: [] as string[],
        workingHoursStart: '09:00',
        workingHoursEnd: '23:00',
        isActive: true,
    });

    // Delivery Option Dialog State
    const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
    const [editingDelivery, setEditingDelivery] = useState<DeliveryOption | null>(null);
    const [deliveryForm, setDeliveryForm] = useState({
        type: 'own_delivery' as 'own_delivery' | 'third_party',
        titleAr: '',
        titleEn: '',
        deliveryPrice: 0,
        cityId: '',
        deliveryDays: [] as string[],
        deliveryTimeSlots: [] as DeliveryTimeSlot[],
        isActive: true,
    });

    const [newTimeSlot, setNewTimeSlot] = useState({
        nameAr: '',
        nameEn: '',
        startTime: '09:00',
        endTime: '12:00',
    });

    // Fetch merchant data
    const { data: merchant } = useQuery({
        queryKey: ['merchant-profile', user?.id],
        enabled: !!user?.id,
        queryFn: () => getDocData(`merchants/${user!.id}`),
    });

    // Update enabled methods when merchant data changes
    useEffect(() => {
        if (merchant?.enabledDeliveryMethods) {
            setEnabledMethods(merchant.enabledDeliveryMethods);
        }
    }, [merchant]);

    // Fetch cities
    const { data: cities = [] } = useQuery<City[]>({
        queryKey: ["cities"],
        queryFn: () => getCollectionAll<City>("cities"),
    });

    // Fetch branches
    const { data: branches = [], isLoading: loadingBranches } = useQuery<Branch[]>({
        queryKey: ['branches', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const data = await getCollectionAll<Branch>(`merchants/${user!.id}/branches`);
            return data.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
        },
    });

    // Fetch delivery options
    const { data: deliveryOptions = [], isLoading: loadingDelivery } = useQuery<DeliveryOption[]>({
        queryKey: ['deliveryOptions', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const data = await getCollectionAll<DeliveryOption>(`merchants/${user!.id}/deliveryOptions`);
            return data.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
        },
    });

    // Update enabled delivery methods
    const updateMethodsMutation = useMutation({
        mutationFn: async (methods: ('pickup' | 'delivery')[]) => {
            if (!user?.id) throw new Error('لا يوجد تاجر مسجّل');
            await setDocData(`merchants/${user.id}`, { enabledDeliveryMethods: methods });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant-profile', user?.id] });
            toast({ title: 'تم حفظ إعدادات التوصيل بنجاح' });
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        },
    });

    // Branch mutations
    const saveBranchMutation = useMutation({
        mutationFn: async (data: typeof branchForm) => {
            if (!user?.id) throw new Error('لا يوجد تاجر مسجّل');
            if (editingBranch) {
                await updateDocData(`merchants/${user.id}/branches/${editingBranch.id}`, data);
            } else {
                await addCollectionDoc(`merchants/${user.id}/branches`, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches', user?.id] });
            toast({ title: editingBranch ? 'تم تحديث الفرع بنجاح' : 'تم إضافة الفرع بنجاح' });
            closeBranchDialog();
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        },
    });

    const toggleBranchMutation = useMutation({
        mutationFn: async ({ branchId, isActive }: { branchId: string; isActive: boolean }) => {
            if (!user?.id) throw new Error('لا يوجد تاجر مسجّل');
            await updateDocData(`merchants/${user.id}/branches/${branchId}`, { isActive });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches', user?.id] });
            toast({ title: 'تم تحديث حالة الفرع' });
        },
    });

    // Delivery option mutations
    const saveDeliveryMutation = useMutation({
        mutationFn: async (data: typeof deliveryForm) => {
            if (!user?.id) throw new Error('لا يوجد تاجر مسجّل');
            if (editingDelivery) {
                await updateDocData(`merchants/${user.id}/deliveryOptions/${editingDelivery.id}`, data);
            } else {
                await addCollectionDoc(`merchants/${user.id}/deliveryOptions`, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveryOptions', user?.id] });
            toast({ title: editingDelivery ? 'تم تحديث خيار التوصيل' : 'تم إضافة خيار التوصيل' });
            closeDeliveryDialog();
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        },
    });

    const toggleDeliveryMutation = useMutation({
        mutationFn: async ({ optionId, isActive }: { optionId: string; isActive: boolean }) => {
            if (!user?.id) throw new Error('لا يوجد تاجر مسجّل');
            await updateDocData(`merchants/${user.id}/deliveryOptions/${optionId}`, { isActive });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveryOptions', user?.id] });
            toast({ title: 'تم تحديث حالة خيار التوصيل' });
        },
    });

    // Helper functions
    const openBranchDialog = (branch?: Branch) => {
        if (branch) {
            setEditingBranch(branch);
            setBranchForm({
                nameAr: branch.nameAr,
                nameEn: branch.nameEn,
                cityId: branch.cityId || '',
                addressAr: branch.addressAr,
                addressEn: branch.addressEn,
                googleMapsUrl: branch.googleMapsUrl,
                workingDays: branch.workingDays,
                workingHoursStart: branch.workingHoursStart,
                workingHoursEnd: branch.workingHoursEnd,
                isActive: branch.isActive,
            });
        } else {
            setEditingBranch(null);
            setBranchForm({
                nameAr: '',
                nameEn: '',
                cityId: '',
                addressAr: '',
                addressEn: '',
                googleMapsUrl: '',
                workingDays: [],
                workingHoursStart: '09:00',
                workingHoursEnd: '23:00',
                isActive: true,
            });
        }
        setBranchDialogOpen(true);
    };

    const closeBranchDialog = () => {
        setBranchDialogOpen(false);
        setEditingBranch(null);
    };

    const openDeliveryDialog = (option?: DeliveryOption) => {
        if (option) {
            setEditingDelivery(option);
            setDeliveryForm({
                type: option.type,
                titleAr: option.titleAr,
                titleEn: option.titleEn,
                deliveryPrice: option.deliveryPrice || 0,
                cityId: option.cityId || '',
                deliveryDays: option.deliveryDays,
                deliveryTimeSlots: option.deliveryTimeSlots,
                isActive: option.isActive,
            });
        } else {
            setEditingDelivery(null);
            setDeliveryForm({
                type: 'own_delivery',
                titleAr: '',
                titleEn: '',
                deliveryPrice: 0,
                cityId: '',
                deliveryDays: [],
                deliveryTimeSlots: [],
                isActive: true,
            });
        }
        setDeliveryDialogOpen(true);
    };

    const closeDeliveryDialog = () => {
        setDeliveryDialogOpen(false);
        setEditingDelivery(null);
    };

    const toggleDeliveryMethod = (method: 'pickup' | 'delivery') => {
        const newMethods = enabledMethods.includes(method)
            ? enabledMethods.filter((m) => m !== method)
            : [...enabledMethods, method];
        setEnabledMethods(newMethods);
        updateMethodsMutation.mutate(newMethods);
    };

    const addTimeSlot = () => {
        if (!newTimeSlot.nameAr || !newTimeSlot.nameEn) {
            toast({ variant: 'destructive', title: 'يرجى إدخال اسم الفترة بالعربية والإنجليزية' });
            return;
        }
        const slot: DeliveryTimeSlot = {
            id: Date.now().toString(),
            ...newTimeSlot,
        };
        setDeliveryForm((prev) => ({
            ...prev,
            deliveryTimeSlots: [...prev.deliveryTimeSlots, slot],
        }));
        setNewTimeSlot({ nameAr: '', nameEn: '', startTime: '09:00', endTime: '12:00' });
    };

    const removeTimeSlot = (id: string) => {
        setDeliveryForm((prev) => ({
            ...prev,
            deliveryTimeSlots: prev.deliveryTimeSlots.filter((slot) => slot.id !== id),
        }));
    };

    return (
        <DashboardLayout role="merchant">
            <div className="space-y-8 max-w-4xl">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-display">إعدادات التوصيل والفروع</h2>
                    <p className="text-muted-foreground mt-2">إدارة خيارات التوصيل والاستلام من الفروع</p>
                </div>

                {/* General Delivery Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            الخيارات العامة
                        </CardTitle>
                        <CardDescription>اختر طرق التوصيل المتاحة لعملائك</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-4 border rounded-lg">
                            <Checkbox
                                id="pickup"
                                checked={enabledMethods.includes('pickup')}
                                onCheckedChange={() => toggleDeliveryMethod('pickup')}
                            />
                            <div className="flex-1">
                                <Label htmlFor="pickup" className="text-base font-medium cursor-pointer">
                                    الاستلام من الفرع
                                </Label>
                                <p className="text-sm text-muted-foreground">يمكن للعملاء استلام طلباتهم من فروعك</p>
                            </div>
                            <Store className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex items-center gap-3 p-4 border rounded-lg">
                            <Checkbox
                                id="delivery"
                                checked={enabledMethods.includes('delivery')}
                                onCheckedChange={() => toggleDeliveryMethod('delivery')}
                            />
                            <div className="flex-1">
                                <Label htmlFor="delivery" className="text-base font-medium cursor-pointer">
                                    التوصيل
                                </Label>
                                <p className="text-sm text-muted-foreground">توصيل الطلبات إلى عناوين العملاء</p>
                            </div>
                            <Truck className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                {/* Branches Management */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="w-5 h-5" />
                                    إدارة الفروع
                                </CardTitle>
                                <CardDescription>أضف وعدّل فروع متجرك</CardDescription>
                            </div>
                            <Button onClick={() => openBranchDialog()} className="gap-2">
                                <Plus className="w-4 h-4" />
                                إضافة فرع
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingBranches ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : branches.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">
                                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>لا توجد فروع مضافة بعد</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {branches.map((branch) => (
                                    <div
                                        key={branch.id}
                                        className={`p-4 border rounded-lg ${!branch.isActive ? 'opacity-50 bg-muted/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{branch.nameAr}</h3>
                                                    {!branch.isActive && (
                                                        <span className="text-xs bg-muted px-2 py-1 rounded">غير نشط</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{branch.addressAr}</p>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {branch.workingHoursStart} - {branch.workingHoursEnd}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {branch.workingDays.length} أيام
                                                    </div>
                                                </div>
                                                {branch.googleMapsUrl && (
                                                    <a
                                                        href={branch.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                        عرض في خرائط جوجل
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => toggleBranchMutation.mutate({ branchId: branch.id, isActive: !branch.isActive })}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => openBranchDialog(branch)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delivery Options Management */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Truck className="w-5 h-5" />
                                    خيارات التوصيل
                                </CardTitle>
                                <CardDescription>حدد أيام وأوقات التوصيل المتاحة</CardDescription>
                            </div>
                            <Button onClick={() => openDeliveryDialog()} className="gap-2">
                                <Plus className="w-4 h-4" />
                                إضافة خيار توصيل
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingDelivery ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : deliveryOptions.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">
                                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>لا توجد خيارات توصيل مضافة بعد</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {deliveryOptions.map((option) => (
                                    <div
                                        key={option.id}
                                        className={`p-4 border rounded-lg ${!option.isActive ? 'opacity-50 bg-muted/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{option.titleAr}</h3>
                                                    {!option.isActive && (
                                                        <span className="text-xs bg-muted px-2 py-1 rounded">غير نشط</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <Calendar className="w-4 h-4" />
                                                        أيام التوصيل: {option.deliveryDays.join(', ')}
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 mt-2">
                                                        {option.cityId && (
                                                            <div className="flex items-center gap-1 text-primary">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {cities.find(c => c.id === option.cityId)?.nameAr || 'مدينة غير معروفة'}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 font-bold text-green-600">
                                                            سعر التوصيل: {option.deliveryPrice} ر.س
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Clock className="w-4 h-4" />
                                                        {option.deliveryTimeSlots.length} فترة زمنية
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        toggleDeliveryMutation.mutate({ optionId: option.id, isActive: !option.isActive })
                                                    }
                                                >
                                                    <Power className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => openDeliveryDialog(option)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Branch Dialog */}
                <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}</DialogTitle>
                            <DialogDescription>أدخل معلومات الفرع باللغتين العربية والإنجليزية</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nameAr">اسم الفرع (عربي)</Label>
                                    <Input
                                        id="nameAr"
                                        value={branchForm.nameAr}
                                        onChange={(e) => setBranchForm({ ...branchForm, nameAr: e.target.value })}
                                        placeholder="فرع الرياض - العليا"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nameEn">Branch Name (English)</Label>
                                    <Input
                                        id="nameEn"
                                        value={branchForm.nameEn}
                                        onChange={(e) => setBranchForm({ ...branchForm, nameEn: e.target.value })}
                                        placeholder="Riyadh - Olaya Branch"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="branch-cityId">المدينة</Label>
                                <Select
                                    value={branchForm.cityId || undefined}
                                    onValueChange={(value) => setBranchForm({ ...branchForm, cityId: value })}
                                >
                                    <SelectTrigger id="branch-cityId">
                                        <SelectValue placeholder="اختر المدينة" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]" position="popper">
                                        {cities.map((city) => (
                                            <SelectItem key={city.id} value={city.id}>
                                                {city.nameAr || (city as any).name || city.nameEn || city.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="addressAr">العنوان (عربي)</Label>
                                    <Input
                                        id="addressAr"
                                        value={branchForm.addressAr}
                                        onChange={(e) => setBranchForm({ ...branchForm, addressAr: e.target.value })}
                                        placeholder="شارع العليا، الرياض"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="addressEn">Address (English)</Label>
                                    <Input
                                        id="addressEn"
                                        value={branchForm.addressEn}
                                        onChange={(e) => setBranchForm({ ...branchForm, addressEn: e.target.value })}
                                        placeholder="Olaya Street, Riyadh"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="googleMapsUrl">رابط خرائط جوجل</Label>
                                <Input
                                    id="googleMapsUrl"
                                    value={branchForm.googleMapsUrl}
                                    onChange={(e) => setBranchForm({ ...branchForm, googleMapsUrl: e.target.value })}
                                    placeholder="https://maps.google.com/?q=24.7136,46.6753"
                                    dir="ltr"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>أيام العمل</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEEKDAYS.map((day) => (
                                        <div key={day.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={day.id}
                                                checked={branchForm.workingDays.includes(day.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setBranchForm({
                                                            ...branchForm,
                                                            workingDays: [...branchForm.workingDays, day.id],
                                                        });
                                                    } else {
                                                        setBranchForm({
                                                            ...branchForm,
                                                            workingDays: branchForm.workingDays.filter((d) => d !== day.id),
                                                        });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={day.id} className="cursor-pointer">
                                                {day.nameAr}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="workingHoursStart">من الساعة</Label>
                                    <Input
                                        id="workingHoursStart"
                                        type="time"
                                        value={branchForm.workingHoursStart}
                                        onChange={(e) => setBranchForm({ ...branchForm, workingHoursStart: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="workingHoursEnd">إلى الساعة</Label>
                                    <Input
                                        id="workingHoursEnd"
                                        type="time"
                                        value={branchForm.workingHoursEnd}
                                        onChange={(e) => setBranchForm({ ...branchForm, workingHoursEnd: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeBranchDialog}>
                                إلغاء
                            </Button>
                            <Button onClick={() => saveBranchMutation.mutate(branchForm)} disabled={saveBranchMutation.isPending}>
                                {saveBranchMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                <Save className="w-4 h-4 ml-2" />
                                {editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delivery Option Dialog */}
                <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingDelivery ? 'تعديل خيار التوصيل' : 'إضافة خيار توصيل جديد'}</DialogTitle>
                            <DialogDescription>حدد أيام وأوقات التوصيل المتاحة</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="titleAr">اسم الخيار (عربي)</Label>
                                    <Input
                                        id="titleAr"
                                        value={deliveryForm.titleAr}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, titleAr: e.target.value })}
                                        placeholder="توصيل بمندوب المتجر"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="titleEn">Option Name (English)</Label>
                                    <Input
                                        id="titleEn"
                                        value={deliveryForm.titleEn}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, titleEn: e.target.value })}
                                        placeholder="Store Representative Delivery"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryPrice">سعر التوصيل (ر.س)</Label>
                                    <Input
                                        id="deliveryPrice"
                                        type="number"
                                        value={deliveryForm.deliveryPrice}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryPrice: Number(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="delivery-cityId">المدينة</Label>
                                    <Select
                                        value={deliveryForm.cityId || undefined}
                                        onValueChange={(value) => setDeliveryForm({ ...deliveryForm, cityId: value })}
                                    >
                                        <SelectTrigger id="delivery-cityId">
                                            <SelectValue placeholder="اختر المدينة" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl" className="z-[200]" position="popper">
                                            {cities.map((city) => (
                                                <SelectItem key={city.id} value={city.id}>
                                                    {city.nameAr || (city as any).name || city.nameEn || city.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>أيام التوصيل</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEEKDAYS.map((day) => (
                                        <div key={day.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`delivery-${day.id}`}
                                                checked={deliveryForm.deliveryDays.includes(day.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setDeliveryForm({
                                                            ...deliveryForm,
                                                            deliveryDays: [...deliveryForm.deliveryDays, day.id],
                                                        });
                                                    } else {
                                                        setDeliveryForm({
                                                            ...deliveryForm,
                                                            deliveryDays: deliveryForm.deliveryDays.filter((d) => d !== day.id),
                                                        });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`delivery-${day.id}`} className="cursor-pointer">
                                                {day.nameAr}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label>فترات التوصيل</Label>
                                {deliveryForm.deliveryTimeSlots.map((slot) => (
                                    <div key={slot.id} className="flex items-center gap-2 p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium">{slot.nameAr}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {slot.startTime} - {slot.endTime}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeTimeSlot(slot.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}

                                <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
                                    <Label className="text-sm font-medium">إضافة فترة جديدة</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="الاسم بالعربية"
                                            value={newTimeSlot.nameAr}
                                            onChange={(e) => setNewTimeSlot({ ...newTimeSlot, nameAr: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Name in English"
                                            value={newTimeSlot.nameEn}
                                            onChange={(e) => setNewTimeSlot({ ...newTimeSlot, nameEn: e.target.value })}
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="time"
                                            value={newTimeSlot.startTime}
                                            onChange={(e) => setNewTimeSlot({ ...newTimeSlot, startTime: e.target.value })}
                                        />
                                        <Input
                                            type="time"
                                            value={newTimeSlot.endTime}
                                            onChange={(e) => setNewTimeSlot({ ...newTimeSlot, endTime: e.target.value })}
                                        />
                                    </div>
                                    <Button type="button" variant="outline" className="w-full" onClick={addTimeSlot}>
                                        <Plus className="w-4 h-4 ml-2" />
                                        إضافة الفترة
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDeliveryDialog}>
                                إلغاء
                            </Button>
                            <Button
                                onClick={() => saveDeliveryMutation.mutate(deliveryForm)}
                                disabled={saveDeliveryMutation.isPending}
                            >
                                {saveDeliveryMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                <Save className="w-4 h-4 ml-2" />
                                {editingDelivery ? 'حفظ التعديلات' : 'إضافة الخيار'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
