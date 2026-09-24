import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInRight, FadeInLeft, FadeIn, FadeOut, LinearTransition, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";

import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { makeStyles, useTheme, spacing, typography, radius, withAlpha } from "@/src/theme";
import { getOrCreateUserId, setOnboarded } from "@/src/session";
import { CategoryGrid, toggleInterest } from "@/src/components/category-grid";
import { PagerDots } from "@/src/components/pager";
import { OnboardingIntro } from "@/src/components/onboarding-intro";
import { ModeCards, ModeChips } from "@/src/components/onboarding-modes";
import { OnboardingSwipe, SwipeDir } from "@/src/components/onboarding-swipe";
import { OnboardingToast, OnboardingNotice } from "@/src/components/onboarding-toast";
import { ONB } from "@/src/components/onboarding-palette";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "@/src/i18n";

type Mode = "stories" | "lessons";

// Fasi: 0 intro · 1 scelta formato (Curiosità / Mini lezioni) · 2 argomenti.
const STEPS = 3;
const LAYOUT = LinearTransition.duration(340).easing(Easing.inOut(Easing.cubic));
const enterFrom = (dir: SwipeDir) => (dir > 0 ? FadeInRight : FadeInLeft).duration(380).easing(Easing.out(Easing.cubic));

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<SwipeDir>(1);
  const [notice, setNotice] = useState<OnboardingNotice | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modes, setModes] = useState<Set<Mode>>(new Set<Mode>());
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: categories, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
  });

  const topics = step === 2;
  const canContinue = topics ? selected.size > 0 && modes.size > 0 : modes.size > 0;

  const toggleMode = (m: Mode) => {
    Haptics.selectionAsync().catch(() => {});
    setModes((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      // in fase argomenti non si resta mai senza formato
      if (topics && next.size === 0) next.add(m);
      return next;
    });
  };

  const goTo = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDir(index >= step ? 1 : -1);
    setStep(index);
  };

  // Messaggio "ben fatto" quando manca una scelta obbligatoria.
  const explainMissing = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setNotice(
      step === 2 && modes.size > 0
        ? { title: t.onb_need_topic_t, body: t.onb_need_topic_b, icon: "grid-outline" }
        : { title: t.onb_need_mode_t, body: t.onb_need_mode_b, icon: "layers-outline" },
    );
  };

  const canSwipe = (d: SwipeDir) => (d < 0 ? step > 0 : step === 0 || canContinue);
  const onSwipe = (d: SwipeDir) => {
    if (d < 0) { goTo(step - 1); return; }
    if (step === 2) { onContinue(); return; }
    goTo(step + 1);
  };
  const onBlockedSwipe = (d: SwipeDir) => { if (d > 0) explainMissing(); };

  const onContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      const uid = await getOrCreateUserId();
      await api.setInterests(uid, Array.from(selected));
      await api.setContentModes(uid, Array.from(modes));
      await setOnboarded();
      router.replace("/(tabs)/discover");
    } finally {
      setSaving(false);
    }
  };

  const formats = modes.size === 2 ? t.onb_formats_both : modes.has("lessons") ? t.onb_formats_lessons : t.onb_formats_stories;

  // Only the presentation changes; topic selection and persistence stay intact.
  if (step === 0) {
    return (
      <OnboardingSwipe canGo={canSwipe} onGo={onSwipe} onBlocked={onBlockedSwipe} testID="onboarding-swipe">
        <Animated.View key="intro" entering={enterFrom(dir)} style={styles.container}>
          <OnboardingIntro onContinue={() => goTo(1)} />
        </Animated.View>
      </OnboardingSwipe>
    );
  }

  // ------------------------------------------- STEP 1 formato · STEP 2 argomenti
  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="onboarding-topics">
      {/* Fondo dark navy cinematografico con bagliori blu/viola (stile mockup). */}
      <LinearGradient colors={[ONB.bgTop, ONB.bgMid, ONB.bgBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.orb} pointerEvents="none" />
      <View style={styles.orbViolet} pointerEvents="none" />
      <OnboardingSwipe key={step} canGo={canSwipe} onGo={onSwipe} onBlocked={onBlockedSwipe} testID="onboarding-swipe">
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xxxl }} testID="onboarding-loading" />
      ) : isError || !categories ? (
        <View style={styles.errorWrap} testID="onboarding-error">
          <Ionicons name="cloud-offline-outline" size={44} color={colors.muted} />
          <Text style={styles.errorTitle}>{t.load_error}</Text>
          <Text style={styles.errorText}>{t.load_error_sub}</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.7 : 1 }]}
            testID="onboarding-retry"
          >
            {isFetching ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={colors.brand} />
                <Text style={styles.retryText}>{t.retry}</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, !topics && styles.contentCentered]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {topics ? (
            <Animated.View key="topics" entering={enterFrom(dir)} layout={LAYOUT}>
              <ModeChips modes={modes} onToggle={toggleMode} />
              <Text style={styles.stepTitle} testID="onboarding-topics-title">{t.onb_title}</Text>
              <Animated.View entering={FadeIn.delay(120).duration(360)} style={styles.hintCard} testID="onboarding-topics-hint">
                <Ionicons name="sparkles-outline" size={16} color={ONB.cyan} style={styles.hintIcon} />
                <Text style={styles.hintText}>{t.onb_topics_hint.replace("{formats}", formats)}</Text>
              </Animated.View>
              <CategoryGrid
                compact
                staggerIn
                glass
                categories={categories}
                selected={selected}
                modes={Array.from(modes)}
                onToggle={(id) => setSelected((prev) => toggleInterest(prev, id))}
              />
            </Animated.View>
          ) : (
            <Animated.View key="modes" entering={enterFrom(dir)} exiting={FadeOut.duration(160)} layout={LAYOUT}>
              <Text style={styles.stepTitle} testID="onboarding-modes-title">{t.onb_content_q}</Text>
              <ModeCards modes={modes} onToggle={toggleMode} />
            </Animated.View>
          )}
        </ScrollView>
      )}
      </OnboardingSwipe>

      <OnboardingToast notice={notice} bottom={insets.bottom + 132} onHide={() => setNotice(null)} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PagerDots count={STEPS} index={step} color={ONB.cyan} onSelect={(i) => i < step && goTo(i)} style={styles.dots} testID="onboarding-dots" />
        <Pressable
          onPress={() => {
            if (!canContinue) { explainMissing(); return; }
            if (!topics) { goTo(2); return; }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onContinue();
          }}
          disabled={saving}
          testID="onboarding-continue"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: canContinue ? 1 : 0.45 },
            canContinue && styles.ctaBtnActive,
            pressed && styles.ctaPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={ONB.cyan} />
          ) : (
            <>
              <Text style={styles.ctaText}>{topics ? t.onb_cta : t.onb_modes_next}</Text>
              <Ionicons name="arrow-forward" size={18} color={ONB.cyan} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: ONB.bgTop },
  orb: {
    position: "absolute", top: -140, right: -110, width: 340, height: 340, borderRadius: 170,
    backgroundColor: ONB.orb, boxShadow: "0px 0px 150px 70px rgba(31,75,255,0.16)" as any,
  },
  orbViolet: {
    position: "absolute", bottom: 120, left: -160, width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(120,60,255,0.06)", boxShadow: "0px 0px 140px 60px rgba(120,60,255,0.08)" as any,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  contentCentered: { flexGrow: 1, justifyContent: "center", paddingBottom: spacing.xxxl },
  stepTitle: {
    color: ONB.text, fontFamily: typography.displayBold, fontSize: 28, lineHeight: 34, marginBottom: spacing.lg,
    textShadowColor: "rgba(55,211,255,0.25)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  hintCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg,
    backgroundColor: "rgba(12,26,58,0.65)", borderWidth: 1, borderColor: "rgba(55,211,255,0.32)",
    boxShadow: "0px 0px 24px rgba(55,211,255,0.08)" as any,
  },
  hintIcon: { marginTop: 2 },
  hintText: { flex: 1, color: ONB.textSecondary, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
  dots: { alignSelf: "center", marginBottom: spacing.md },
  ctaBtn: {
    minHeight: 56, borderRadius: radius.pill, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: "rgba(8,20,47,0.85)",
    borderWidth: 1.5, borderColor: ONB.glassBorder,
  },
  ctaBtnActive: {
    borderColor: withAlpha(ONB.cyan, 0.7),
    boxShadow: `0px 0px 22px ${withAlpha(ONB.cyan, 0.28)}, 0px 8px 30px rgba(31,75,255,0.25)` as any,
  },
  ctaPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  ctaText: { color: ONB.cyanSoft, fontFamily: typography.bodyBold, fontSize: 16 },
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: "transparent",
  },
  errorWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  errorTitle: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 18, textAlign: "center" },
  errorText: { color: colors.muted, fontFamily: typography.body, fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 48, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brand,
  },
  retryText: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 15 },
}));
