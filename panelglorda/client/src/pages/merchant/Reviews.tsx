import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, Package, User, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getMerchantReviews, type Review } from "@/lib/merchant-data";

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

interface ReviewWithDetails extends Review {
  customer?: {
    name: string;
    mobile: string;
  };
  product?: {
    name: string;
    images: string[];
  };
}

export default function MerchantReviews() {
  const { user } = useAuth();
  const merchantId = user?.id;

  const { data: reviews = [], isLoading } = useQuery<ReviewWithDetails[]>({
    queryKey: ["merchant-reviews", merchantId],
    queryFn: () => getMerchantReviews(merchantId!),
    enabled: !!merchantId,
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0
      ? Math.round((reviews.filter(r => r.rating === rating).length / reviews.length) * 100)
      : 0
  }));

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout role="merchant">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-display">التقييمات</h2>
          <p className="text-muted-foreground mt-2">تقييمات العملاء على منتجاتك</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ملخص التقييمات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">{averageRating}</div>
                <div className="flex justify-center mt-2">
                  {renderStars(Math.round(parseFloat(averageRating)))}
                </div>
                <p className="text-muted-foreground mt-2">{reviews.length} تقييم</p>
              </div>

              <div className="space-y-2">
                {ratingCounts.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="w-3 text-sm">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>جميع التقييمات</CardTitle>
              <CardDescription>آراء العملاء حول منتجاتك</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد تقييمات بعد</h3>
                  <p className="text-muted-foreground">
                    ستظهر تقييمات العملاء هنا عندما يقومون بتقييم منتجاتك
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      data-testid={`review-card-${review.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 border">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {review.customer?.name || "عميل"}
                              </span>
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatFirebaseDate(review.createdAt)}
                            </span>
                          </div>

                          {review.product && (
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Package className="w-3 h-3" />
                                {review.product.name}
                              </Badge>
                            </div>
                          )}

                          {review.comment && (
                            <p className="text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
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
