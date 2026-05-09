import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification
} from "@/lib/notifications";
import { Link } from "wouter";

interface NotificationBellProps {
  role: "merchant" | "admin";
}

export default function NotificationBell({ role }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: () => userId ? getUserNotifications(userId) : Promise.resolve([]),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["notifications-count", userId],
    queryFn: () => userId ? getUnreadCount(userId) : Promise.resolve(0),
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count", userId] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (userId) await markAllNotificationsAsRead(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count", userId] });
    },
  });

  const formatTime = (date: any) => {
    if (!date) return "";

    // Handle Firestore Timestamp
    let validDate: Date;
    if (typeof date === 'object' && 'seconds' in date) {
      validDate = new Date(date.seconds * 1000);
    } else {
      validDate = new Date(date);
    }

    if (isNaN(validDate.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - validDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return validDate.toLocaleDateString("ar-SA");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
          <span className="font-semibold text-sm">الإشعارات</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary/80"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 opacity-20" />
            <p>لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-muted/50",
                  !notification.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                )}
                onSelect={(e) => e.preventDefault()}
                onClick={() => {
                  if (!notification.isRead) {
                    markReadMutation.mutate(notification.id);
                  }
                  if (notification.link) {
                    setOpen(false);
                  }
                }}
                data-testid={`notification-item-${notification.id}`}
              >
                {notification.link ? (
                  <Link href={notification.link} className="w-full">
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className={cn(
                        "font-medium text-sm",
                        !notification.isRead && "text-primary"
                      )}>
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block text-left">
                      {formatTime(notification.createdAt)}
                    </span>
                  </Link>
                ) : (
                  <>
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className={cn(
                        "font-medium text-sm",
                        !notification.isRead && "text-primary"
                      )}>
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block text-left">
                      {formatTime(notification.createdAt)}
                    </span>
                  </>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
