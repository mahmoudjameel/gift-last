import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Store, TrendingUp, Activity, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { getMerchantsByStatus, getWithdrawals } from "@/lib/admin-ops";

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

const StatsCard = ({ title, value, icon: Icon, description, loading }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="text-2xl font-bold font-display" data-testid={`stat-${title}`}>{value}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const { data: merchants = [], isLoading: loadingMerchants } = useQuery<any[]>({
    queryKey: ["admin-merchants", "all"],
    queryFn: () => getMerchantsByStatus()
  });

  const { data: withdrawals = [], isLoading: loadingWithdrawals } = useQuery<any[]>({
    queryKey: ["admin-withdrawals"],
    queryFn: () => getWithdrawals()
  });

  const activeMerchants = merchants.filter(m => m.status === "active").length;
  const pendingMerchants = merchants.filter(m => m.status === "pending").length;
  const totalBalance = merchants.reduce((sum, m) => sum + m.balance, 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">لوحة الإدارة</h2>
          <p className="text-muted-foreground mt-2">مراقبة أداء المنصة والتجار</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="إجمالي التجار"
            value={merchants.length}
            icon={Store}
            description={`${activeMerchants} نشط`}
            loading={loadingMerchants}
          />
          <StatsCard
            title="طلبات معلقة"
            value={pendingMerchants}
            icon={Clock}
            description="بانتظار المراجعة"
            loading={loadingMerchants}
          />
          <StatsCard
            title="طلبات سحب معلقة"
            value={withdrawals.length}
            icon={Activity}
            description="بانتظار التحويل"
            loading={loadingWithdrawals}
          />
          <StatsCard
            title="إجمالي الأرصدة"
            value={`${(totalBalance / 100).toFixed(2)} ر.س`}
            icon={TrendingUp}
            description="أرصدة التجار"
            loading={loadingMerchants}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>أحدث التجار المسجلين</CardTitle>
              <CardDescription>آخر التجار الذين انضموا للمنصة</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMerchants ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : merchants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد تجار بعد</p>
              ) : (
                <div className="space-y-4">
                  {merchants.slice(0, 5).map((merchant) => (
                    <div key={merchant.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`merchant-card-${merchant.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {merchant.storeName ? merchant.storeName.charAt(0) : "؟"}
                        </div>
                        <div>
                          <p className="font-medium">{merchant.storeName}</p>
                          <p className="text-xs text-muted-foreground">{merchant.ownerName}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          merchant.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                            merchant.status === 'suspended' ? 'border-red-200 bg-red-50 text-red-700' :
                              'border-amber-200 bg-amber-50 text-amber-700'
                        }
                      >
                        {merchant.status === 'active' ? 'نشط' : merchant.status === 'suspended' ? 'موقوف' : 'معلق'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>طلبات السحب المعلقة</CardTitle>
              <CardDescription>طلبات تحويل الأرصدة للتجار</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWithdrawals ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">لا توجد طلبات سحب معلقة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200" data-testid={`withdrawal-card-${withdrawal.id}`}>
                      <div>
                        <p className="font-medium">طلب سحب #{withdrawal.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFirebaseDate(withdrawal.createdAt)}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-amber-700">
                        {Math.abs(withdrawal.amount / 100).toFixed(2)} ر.س
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
