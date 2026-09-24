// PAUSE — onboarding, scelta del formato. Due card (Curiosità / Mini lezioni):
// quando l'utente ne accende una, sotto si apre un pannello che spiega in breve
// che cos'è quel formato; con entrambe accese compaiono entrambe le spiegazioni.
// In fase "argomenti" le stesse scelte si riducono a due pillole compatte.
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown, FadeOutUp, LinearTransition, Easing } from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons";

import { makeStyles, useTheme, spacing, typography, radius, withAlpha } from "@/src/theme";
import { KindIcon, StoryKind } from "@/src/components/kind-icon";
import { useI18n } from "@/src/i18n";

const ORDER: StoryKind[] = ["stories", "lessons"];
const ENTER = FadeInDown.duration(360).easing(Easing.out(Easing.cubic));
const EXIT = FadeOutUp.duration(200);
const LAYOUT = LinearTransition.duration(320).easing(Easing.inOut(Easing.cubic));

export function useModeCopy() {
  const { t } = useI18n();
  return {
    label: (k: StoryKind) => (k === "stories" ? t.onb_toggle_stories : t.onb_toggle_lessons),
    desc: (k: StoryKind) => (k === "stories" ? t.onb_stories_desc : t.onb_lessons_desc),
  };
}

export function ModeCards({ modes, onToggle }: { modes: Set<StoryKind>; onToggle: (k: StoryKind) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { label, desc } = useModeCopy();
  const active = ORDER.filter((k) => modes.has(k));

  return (
    <View testID="onboarding-modes">
      <View style={styles.row}>
        {ORDER.map((k) => {
          const on = modes.has(k);
          return (
            <Pressable
              key={k}
              onPress={() => onToggle(k)}
              testID={`onboarding-mode-${k}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [
                styles.card,
                on && { borderColor: colors.brand, backgroundColor: withAlpha(colors.brand, 0.07) },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardTop}>
                <KindIcon kind={k} size={52} lit={on} glow />
                <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={20} color={on ? colors.brand : colors.borderStrong} />
              </View>
              <Text style={[styles.cardLabel, on && { color: colors.onSurface }]}>{label(k)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pannello a tendina: una voce per ogni formato acceso. */}
      <Animated.View layout={LAYOUT} style={styles.panel} testID="onboarding-mode-panel">
        {active.length === 0 ? (
          <Animated.Text key="hint" entering={ENTER} exiting={EXIT} style={styles.hint} testID="onboarding-mode-hint">
            {t.onb_modes_hint}
          </Animated.Text>
        ) : (
          active.map((k, i) => (
            <Animated.View
              key={k}
              entering={ENTER.delay(i * 70)}
              exiting={EXIT}
              layout={LAYOUT}
              style={[styles.explain, i > 0 && styles.explainDivider]}
              testID={`onboarding-mode-explain-${k}`}
            >
              <KindIcon kind={k} size={30} lit glow={false} />
              <View style={styles.explainText}>
                <Text style={styles.explainTitle}>{label(k)}</Text>
                <Text style={styles.explainBody}>{desc(k)}</Text>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.View>
    </View>
  );
}

export function ModeChips({ modes, onToggle }: { modes: Set<StoryKind>; onToggle: (k: StoryKind) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { label } = useModeCopy();
  return (
    <View style={styles.chipRow} testID="onboarding-mode-chips">
      {ORDER.map((k) => {
        const on = modes.has(k);
        return (
          <Pressable
            key={k}
            onPress={() => onToggle(k)}
            testID={`onboarding-chip-${k}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [
              styles.chip,
              on && { borderColor: withAlpha(colors.brand, 0.7), backgroundColor: withAlpha(colors.brand, 0.08) },
              pressed && styles.pressed,
            ]}
          >
            <KindIcon kind={k} size={22} lit={on} glow={false} />
            <Text style={[styles.chipLabel, on && { color: colors.onSurface }]}>{label(k)}</Text>
            {on ? <Ionicons name="checkmark" size={14} color={colors.brand} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", gap: spacing.md },
  card: {
    flex: 1, gap: 8, padding: spacing.md, minHeight: 124, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLabel: { color: colors.onSurfaceSecondary, fontFamily: typography.bodyBold, fontSize: 16, marginTop: 2 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },

  panel: {
    marginTop: spacing.md, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
  },
  hint: {
    color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, textAlign: "center",
  },
  explain: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  explainDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  explainText: { flex: 1, gap: 3 },
  explainTitle: { color: colors.onSurface, fontFamily: typography.bodyBold, fontSize: 14 },
  explainBody: { color: colors.onSurfaceSecondary, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },

  chipRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40,
    paddingLeft: 8, paddingRight: 12, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border,
  },
  chipLabel: { color: colors.onSurfaceSecondary, fontFamily: typography.bodyBold, fontSize: 13 },
}));
