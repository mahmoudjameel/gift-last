import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import {
  formatBranchTimeDisplay,
  formatDeliverySlotDisplay,
  formatDeliverySlotIso,
  parseBranchTimeValue,
  parseDeliverySlotValue,
} from '@/utils/merchantSchedulePickers';

export type SchedulePickerColors = {
  text: string;
  textMuted: string;
  textSecondary: string;
  card: string;
  border: string;
  primary: string;
  background: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  mode: 'datetime' | 'time';
  language: 'ar' | 'he';
  isRTL: boolean;
  colors: SchedulePickerColors;
  label: string;
  /** Defaults when opening picker with empty / unparsable branch time */
  parseDefaults?: { hour: number; minute: number };
  placeholder?: string;
};

export function MerchantSchedulePickerButton({
  value,
  onChange,
  mode,
  language,
  isRTL,
  colors,
  label,
  parseDefaults = { hour: 9, minute: 0 },
  placeholder,
}: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState(() => new Date());

  const displayText = useMemo(() => {
    if (mode === 'datetime') {
      const d = formatDeliverySlotDisplay(value, language);
      return d || '';
    }
    const v = value.trim();
    return v || '';
  }, [mode, value, language]);

  const ph =
    placeholder ??
    (language === 'ar'
      ? mode === 'datetime'
        ? 'اضغط لاختيار التاريخ والوقت'
        : 'اضغط لاختيار الوقت'
      : mode === 'datetime'
        ? 'Tap to pick date & time'
        : 'Tap to pick time');

  const commitDate = useCallback(
    (d: Date) => {
      if (mode === 'time') {
        onChange(formatBranchTimeDisplay(d, language));
      } else {
        onChange(formatDeliverySlotIso(d));
      }
    },
    [mode, onChange, language]
  );

  const openIos = useCallback(() => {
    if (mode === 'datetime') {
      setIosTemp(parseDeliverySlotValue(value));
    } else {
      setIosTemp(parseBranchTimeValue(value, parseDefaults.hour, parseDefaults.minute));
    }
    setIosOpen(true);
  }, [mode, value, parseDefaults.hour, parseDefaults.minute]);

  const openAndroid = useCallback(() => {
    if (mode === 'time') {
      const current = parseBranchTimeValue(value, parseDefaults.hour, parseDefaults.minute);
      DateTimePickerAndroid.open({
        value: current,
        mode: 'time',
        display: 'clock',
        is24Hour: false,
        onChange: (ev, date) => {
          if (ev.type === 'dismissed' || !date) return;
          commitDate(date);
        },
      });
      return;
    }

    const initial = parseDeliverySlotValue(value);
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      display: 'calendar',
      onChange: (ev, date) => {
        if (ev.type === 'dismissed' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          display: 'clock',
          is24Hour: false,
          onChange: (ev2, timeDate) => {
            if (ev2.type === 'dismissed' || !timeDate) return;
            const merged = new Date(date);
            merged.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
            commitDate(merged);
          },
        });
      },
    });
  }, [mode, value, parseDefaults.hour, parseDefaults.minute, commitDate]);

  const onPressField = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      openAndroid();
    } else {
      openIos();
    }
  }, [openAndroid, openIos]);

  const themeVariant = colors.background === '#0D0D0D' ? 'dark' : 'light';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.col}>
        <Text style={[styles.colLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.inputText, { color: colors.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={ph}
            placeholderTextColor={colors.textMuted}
            textAlign={isRTL ? 'right' : 'center'}
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.col}>
        <Text style={[styles.colLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onPressField}
          activeOpacity={0.7}
        >
          <Clock size={16} color={colors.primary} style={styles.clockIcon} />
          <Text
            style={[
              styles.valueText,
              { color: displayText ? colors.text : colors.textMuted },
            ]}
            numberOfLines={2}
          >
            {displayText || ph}
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} animationType="slide" transparent statusBarTranslucent>
          <View style={styles.iosOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosOpen(false)} />
            <View style={[styles.iosSheet, { backgroundColor: colors.background }]} pointerEvents="box-none">
              <View style={[styles.iosToolbar, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setIosOpen(false)} hitSlop={12}>
                  <Text style={[styles.iosToolbarBtn, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.iosToolbarTitle, { color: colors.text }]}>
                  {mode === 'datetime'
                    ? language === 'ar'
                      ? 'التاريخ والوقت'
                      : 'Date & time'
                    : language === 'ar'
                      ? 'الوقت'
                      : 'Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    commitDate(iosTemp);
                    setIosOpen(false);
                  }}
                  hitSlop={12}
                >
                  <Text style={[styles.iosToolbarBtn, { color: colors.primary, fontWeight: '700' }]}>
                    {language === 'ar' ? 'تم' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTemp}
                mode={mode === 'datetime' ? 'datetime' : 'time'}
                display="spinner"
                locale={language === 'ar' ? 'ar-SA' : 'he-IL'}
                themeVariant={themeVariant}
                onChange={(_, d) => {
                  if (d) setIosTemp(d);
                }}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1 },
  colLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  clockIcon: { marginLeft: 2 },
  valueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iosSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
  },
  iosToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iosToolbarBtn: { fontSize: 16 },
  iosToolbarTitle: { fontSize: 15, fontWeight: '700' },
  iosPicker: { alignSelf: 'center', width: '100%' },
});
