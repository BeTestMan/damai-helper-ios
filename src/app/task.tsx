import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatDateTime, formatLead, parseDateTime } from '../core/format';
import { damaiDetailUrl, resolveDeepLink } from '../core/damaiLink';
import { createEmptyTask, fireAtMs, GrabTask } from '../core/model';
import { getTasks, upsertTask } from '../core/taskStore';
import { trueNow } from '../core/clock';
import { colors, radius, spacing } from '../ui/theme';

const LEAD_OPTIONS_MS = [5_000, 10_000, 30_000, 60_000, 3 * 60_000, 5 * 60_000];

export default function TaskScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = useMemo(() => {
    if (!params.id) return null;
    return getTasks().find((t) => t.id === params.id) ?? null;
  }, [params.id]);

  const [draft, setDraft] = useState<GrabTask>(() => editing ?? createEmptyTask(trueNow()));
  const [saleText, setSaleText] = useState(() => formatDateTime(draft.saleAtMs));
  const [saleError, setSaleError] = useState<string | null>(null);

  const patch = (part: Partial<GrabTask>) => setDraft((prev) => ({ ...prev, ...part }));

  const onSave = async () => {
    if (!draft.name.trim()) {
      Alert.alert('缺少名称', '请填写演出名称，方便识别任务。');
      return;
    }
    const saleAtMs = parseDateTime(saleText);
    if (saleAtMs == null) {
      setSaleError('格式应为 2026-10-10 20:00:00');
      return;
    }
    const deepLink = resolveDeepLink(draft.deepLink);
    if (!deepLink) {
      Alert.alert('缺少链接', '请填写大麦演出链接或商品 ID。');
      return;
    }
    if (fireAtMs({ ...draft, saleAtMs }) <= trueNow()) {
      Alert.alert('时间已过', '提醒时刻已经过去，请把开售时间设在未来。');
      return;
    }
    setSaleError(null);
    await upsertTask({ ...draft, name: draft.name.trim(), saleAtMs, deepLink });
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="演出名称">
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(v) => patch({ name: v })}
          placeholder="例如：王铮亮 时间回声 北京站"
          placeholderTextColor={colors.textDim}
        />
      </Field>

      <Field label="开售时间">
        <TextInput
          style={styles.input}
          value={saleText}
          onChangeText={(v) => {
            setSaleText(v);
            setSaleError(null);
          }}
          placeholder="2026-10-10 20:00:00"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
        />
        {saleError ? <Text style={styles.error}>{saleError}</Text> : null}
      </Field>

      <Field label="提前提醒">
        <View style={styles.chips}>
          {LEAD_OPTIONS_MS.map((ms) => {
            const active = draft.leadMs === ms;
            return (
              <Pressable
                key={ms}
                onPress={() => patch({ leadMs: ms })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {formatLead(ms)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="大麦链接 / 商品 ID">
        <TextInput
          style={styles.input}
          value={draft.deepLink}
          onChangeText={(v) => patch({ deepLink: v })}
          placeholder="71234567890 或 https://m.damai.cn/..."
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          {draft.deepLink.trim()
            ? `将打开：${resolveDeepLink(draft.deepLink) || '（无效）'}`
            : `只填数字会自动补全为详情页链接，例如 ${damaiDetailUrl('71234567890')}`}
        </Text>
      </Field>

      <Field label="备注">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={draft.note ?? ''}
          onChangeText={(v) => patch({ note: v })}
          placeholder="票档、观演人、场次等"
          placeholderTextColor={colors.textDim}
          multiline
        />
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>启用提醒</Text>
        <Switch
          value={draft.enabled}
          onValueChange={(v) => patch({ enabled: v })}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <Pressable style={styles.save} onPress={() => void onSave()}>
        <Text style={styles.saveText}>{editing ? '保存修改' : '创建任务'}</Text>
      </Pressable>
      <Pressable style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>取消</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  field: { gap: spacing.sm },
  label: { color: colors.textDim, fontSize: 13, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 12 },
  hint: { color: colors.textDim, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 14 },
  chipTextActive: { color: colors.accentText, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLabel: { color: colors.text, fontSize: 15 },
  save: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveText: { color: colors.accentText, fontSize: 16, fontWeight: '600' },
  cancel: { paddingVertical: spacing.md, alignItems: 'center' },
  cancelText: { color: colors.textDim, fontSize: 15 },
});