import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Users, Search, Loader2, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getCustomers } from "@/lib/admin-ops";

// Helper function to format Firebase Timestamp or Date
const formatFirebaseDate = (date: any): string => {
  if (!date) return 'غير محدد';

  try {
    let dateObj: Date;

    // Handle Firestore Timestamp (has seconds and nanoseconds)
    if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle Firestore Timestamp with toDate method
    else if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Handle regular Date object or string
    else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
      return 'غير محدد';
    }

    return format(dateObj, "dd MMM yyyy", { locale: ar });
  } catch {
    return 'غير محدد';
  }
};

interface Customer {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  city: string | null;
  createdAt?: any;
}

export default function AdminCustomers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["admin-customers"],
    queryFn: () => getCustomers()
  });

  const filteredCustomers = customers.filter(customer =>
    (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.mobile && customer.mobile.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.city && customer.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-display">العملاء</h2>
            <p className="text-muted-foreground mt-2">جميع العملاء المسجلين في التطبيق</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {customers.length} عميل
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              قائمة العملاء
            </CardTitle>
            <CardDescription>
              العملاء الذين سجلوا في التطبيق
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم، الجوال، البريد أو المدينة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                  data-testid="input-search-customers"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12" data-testid="loading-customers">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20" data-testid="empty-customers">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">لا يوجد عملاء</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لم يتم تسجيل أي عملاء بعد"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border" data-testid="table-customers">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">رقم الجوال</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">المدينة</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer, index) => (
                      <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                        <TableCell className="font-medium" data-testid={`text-index-${customer.id}`}>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {customer.name ? customer.name.charAt(0) : "؟"}
                              </span>
                            </div>
                            <span className="font-medium" data-testid={`text-name-${customer.id}`}>{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span className="font-mono" data-testid={`text-mobile-${customer.id}`}>{customer.mobile}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.email ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span className="font-mono text-sm" data-testid={`text-email-${customer.id}`}>{customer.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground" data-testid={`text-email-${customer.id}`}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.city ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span data-testid={`text-city-${customer.id}`}>{customer.city}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground" data-testid={`text-city-${customer.id}`}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="w-3 h-3" />
                            <span data-testid={`text-date-${customer.id}`}>{formatFirebaseDate(customer.createdAt)}</span>
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
      </div>
    </DashboardLayout>
  );
}
