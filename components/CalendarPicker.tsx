import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const AR_DAYS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_KEY_TO_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string;
  allowedDays?: string[];
  disablePastDates?: boolean;
}

export default function CalendarPicker({ visible, onClose, onSelect, selectedDate, allowedDays, disablePastDates = false }: CalendarPickerProps) {
  const { colors, language } = useApp();
  const isAr = language === 'ar';

  const today = new Date();
  const initialDate = selectedDate ? new Date(selectedDate) : today;
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const months = isAr ? AR_MONTHS : EN_MONTHS;
  const dayLabels = isAr ? AR_DAYS : EN_DAYS;

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const goToPrev = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }, [currentMonth]);

  const goToNext = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }, [currentMonth]);

  const formatDate = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const isSelected = (day: number) => {
    return selectedDate === formatDate(day);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const allowedDayIndices = useMemo(() => {
    if (!allowedDays || allowedDays.length === 0) return null;
    return new Set(allowedDays.map(k => DAY_KEY_TO_INDEX[k]).filter(v => v !== undefined));
  }, [allowedDays]);

  const isDayDisabled = useCallback((day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    if (disablePastDates) {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (date < todayStart) return true;
    }
    if (allowedDayIndices) {
      return !allowedDayIndices.has(date.getDay());
    }
    return false;
  }, [currentYear, currentMonth, allowedDayIndices, disablePastDates]);

  const handleSelect = (day: number) => {
    if (isDayDisabled(day)) return;
    onSelect(formatDate(day));
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={isAr ? goToNext : goToPrev} style={styles.navBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {months[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={isAr ? goToPrev : goToNext} style={styles.navBtn}>
            <ChevronRight size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.dayLabelsRow}>
          {dayLabels.map((label, i) => (
            <View key={i} style={styles.dayLabelCell}>
              <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((day, i) => (
            <View key={i} style={styles.dayCell}>
              {day !== null ? (
                <TouchableOpacity
                  onPress={() => handleSelect(day)}
                  disabled={isDayDisabled(day)}
                  style={[
                    styles.dayBtn,
                    isSelected(day) && { backgroundColor: colors.primary },
                    isToday(day) && !isSelected(day) && { borderWidth: 1.5, borderColor: colors.primary },
                    isDayDisabled(day) && { opacity: 0.25 },
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    { color: colors.text },
                    isSelected(day) && { color: '#FFF', fontWeight: '700' },
                    isToday(day) && !isSelected(day) && { color: colors.primary, fontWeight: '700' },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.footerBtn}>
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isDayDisabled(today.getDate()) && (currentMonth === today.getMonth() && currentYear === today.getFullYear())) return;
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              onSelect(todayStr);
              onClose();
            }}
            disabled={allowedDayIndices ? !allowedDayIndices.has(today.getDay()) : false}
            style={[styles.footerBtn, allowedDayIndices && !allowedDayIndices.has(today.getDay()) && { opacity: 0.3 }]}
          >
            <Text style={[styles.footerBtnText, { color: colors.primary }]}>
              {isAr ? 'اليوم' : 'Today'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.2)',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  footerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
