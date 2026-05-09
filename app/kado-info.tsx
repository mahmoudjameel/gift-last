import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, CircleHelp, Headphones, Info, ScrollText, ShieldCheck } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

type KadoInfoPage = 'terms' | 'privacy' | 'faq' | 'support' | 'about';

type PageSection = {
  heading: string;
  body: string;
};

const pageContent: Record<KadoInfoPage, { title: string; kicker: string; sections: PageSection[] }> = {
  terms: {
    title: 'الشروط والأحكام',
    kicker: 'آخر تحديث تجريبي: مايو 2026',
    sections: [
      {
        heading: 'استخدام تطبيق KADO',
        body: 'تطبيق KADO هو منصة تجريبية لعرض الهدايا والمنتجات من متاجر محلية. باستخدامك للتطبيق، أنت توافق على التعامل مع المعلومات المعروضة كبيانات توضيحية قابلة للتحديث.',
      },
      {
        heading: 'الطلبات والدفع',
        body: 'أسعار المنتجات، رسوم التوصيل، وأوقات التسليم المعروضة هنا بيانات وهمية لأغراض العرض. يمكن لفريق KADO تحديثها أو استبدالها عند ربط التطبيق بالخدمات الحقيقية.',
      },
      {
        heading: 'مسؤولية المتاجر',
        body: 'كل متجر داخل KADO مسؤول عن دقة وصف منتجاته، توفرها، وجودة التجهيز والتسليم. تحتفظ KADO بحق مراجعة أي متجر يخالف تجربة المستخدم المطلوبة.',
      },
    ],
  },
  privacy: {
    title: 'سياسة الخصوصية',
    kicker: 'خصوصيتك جزء أساسي من تجربة KADO',
    sections: [
      {
        heading: 'البيانات التي نستخدمها',
        body: 'قد يستخدم KADO بيانات الحساب الأساسية، العنوان، الموقع التقريبي، وسجل الطلبات لتحسين تجربة التسوق واقتراح المتاجر القريبة.',
      },
      {
        heading: 'بيانات الموقع',
        body: 'يتم استخدام الموقع لعرض منطقة التوصيل المناسبة وتسهيل اختيار العنوان. لا يتم عرض موقعك للبائع إلا عند إنشاء طلب يتطلب توصيل.',
      },
      {
        heading: 'حماية المعلومات',
        body: 'هذه شاشة تجريبية، لكن التصميم يفترض تخزين البيانات الحساسة عبر خدمات آمنة وعدم مشاركتها مع أطراف خارجية إلا لتنفيذ الطلبات أو الدعم.',
      },
    ],
  },
  faq: {
    title: 'الأسئلة الشائعة',
    kicker: 'إجابات سريعة عن تجربة KADO',
    sections: [
      {
        heading: 'كيف أطلب هدية من KADO؟',
        body: 'اختر المنتج، أضفه للسلة، حدد العنوان ووقت التوصيل، ثم أكمل الطلب من صفحة الدفع.',
      },
      {
        heading: 'هل يمكن تغيير العنوان بعد الطلب؟',
        body: 'في النسخة التجريبية تظهر هذه الميزة كمحتوى وهمي. في التشغيل الحقيقي يمكن السماح بتعديل العنوان قبل قبول المتجر للطلب.',
      },
      {
        heading: 'كيف أتابع الطلب؟',
        body: 'يمكنك متابعة حالة الطلب من صفحة طلباتي، حيث تظهر حالات مثل قيد التجهيز، في الطريق، وتم التسليم.',
      },
    ],
  },
  support: {
    title: 'الدعم',
    kicker: 'فريق KADO هنا لمساعدتك',
    sections: [
      {
        heading: 'قنوات التواصل',
        body: 'لأغراض العرض، يمكنك اعتبار البريد support@kado.app ورقم التواصل 920000000 كبيانات وهمية لفريق الدعم.',
      },
      {
        heading: 'متى نرد عليك؟',
        body: 'عادة يتم الرد خلال ساعات العمل من 9 صباحاً حتى 9 مساءً. الطلبات العاجلة المتعلقة بالتوصيل لها أولوية أعلى.',
      },
      {
        heading: 'قبل التواصل',
        body: 'جهز رقم الطلب، اسم المتجر، وصورة المشكلة إن وجدت حتى يتمكن فريق KADO من مساعدتك بسرعة.',
      },
    ],
  },
  about: {
    title: 'من نحن',
    kicker: 'KADO لتجربة إهداء أسهل وأجمل',
    sections: [
      {
        heading: 'فكرة KADO',
        body: 'KADO تطبيق يربط العملاء بمتاجر الهدايا، الورد، الكيك، والعطور في تجربة واحدة مريحة وسريعة.',
      },
      {
        heading: 'رؤيتنا',
        body: 'نهدف إلى جعل إرسال الهدية تجربة بسيطة، شخصية، وموثوقة، من لحظة الاختيار حتى وصولها للمستلم.',
      },
      {
        heading: 'هذه نسخة تجريبية',
        body: 'المحتوى في هذه الصفحة وهمي ومخصص لتجربة التصميم والتنقل داخل التطبيق بدون الاعتماد على صفحات ويب خارجية.',
      },
    ],
  },
};

function normalizePage(page?: string): KadoInfoPage {
  const raw = `${page ?? ''}`.toLowerCase();
  if (raw.includes('privacy')) return 'privacy';
  if (raw.includes('faq')) return 'faq';
  if (raw.includes('support')) return 'support';
  if (raw.includes('about')) return 'about';
  return 'terms';
}

function pageIcon(page: KadoInfoPage) {
  switch (page) {
    case 'privacy':
      return ShieldCheck;
    case 'faq':
      return CircleHelp;
    case 'support':
      return Headphones;
    case 'about':
      return Info;
    case 'terms':
    default:
      return ScrollText;
  }
}

export default function KadoInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; page?: string }>();
  const { colors, isRTL } = useApp();

  const page = useMemo(() => normalizePage(typeof params.page === 'string' ? params.page : undefined), [params.page]);
  const content = pageContent[page];
  const PageIcon = pageIcon(page);
  const pageTitle = typeof params.title === 'string' && params.title.trim() ? params.title : content.title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {pageTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary + '18' }]}>
            <PageIcon size={28} color={colors.primary} />
          </View>
          <Text style={[styles.brandName, { color: colors.primary }]}>KADO</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{content.title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{content.kicker}</Text>
        </View>

        <View style={styles.sectionsWrap}>
          {content.sections.map((section, index) => (
            <View key={`${page}-${index}`} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{section.heading}</Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {section.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '900' as const,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  sectionsWrap: {
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '500' as const,
  },
});
