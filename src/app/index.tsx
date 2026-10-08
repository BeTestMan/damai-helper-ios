import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatClockWithMillis, formatCountdown, formatDateTime, formatOffset } from '../core/format';
import { getLastSample, getOffsetMs, syncClock, trueNow } from '../core/clock';
import { fireAtMs, GrabTask } from '../core/model';
import { ensureNotificationPermission } from '../core/notifications';
import { removeTask, rescheduleAll, useTasks } from '../core/taskStore';
import { colors, radius, spacing } from '../ui/theme';

export default function HomeScreen() {
  const tasks = useTasks();
  const [now, setNow] = useState(() => trueNow());
  const [syncing, setSyncing] = useState(false);
  const [offset, setOffset] = useState(() => getOffsetMs());
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(trueNow()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  // 点通知进 App：如果通知里带了深链，交给系统去打开大麦
  useEffect(() => {
    const openFromNotification = (response: Notifications.NotificationResponse | null) => {
      const link = response?.notification.request.content.data?.deepLink;
      if (typeof link === 'string' && link) void openTarget(link);
    };
    openFromNotification(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, []);

  const onSync = useCallback(async () => {
    setSyncing(true);
    try {
      const sample = await syncClock();
      setOffset(sample.offsetMs);
      setSource(sample.source);
      await rescheduleAll();
      Alert.alert('校时完成', `来源：${sample.source}\n偏移：${formatOffset(sample.offsetMs)}\n往返时延：${sample.rttMs} ms`);
    } catch (e) {
      Alert.alert('校时失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>标准时间</Text>
        <Text style={styles.bigClock}>{formatClockWithMillis(now)}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.dim}>设备时钟偏移</Text>
          <Text style={[styles.value, offset === 0 && styles.valueDim]}>{formatOffset(offset)}</Text>
        </View>
        {source ? (
          <View style={styles.rowBetween}>
            <Text style={styles.dim}>时间源</Text>
            <Text style={styles.value}>{source}</Text>
          </View>
        ) : null}
        <Pressable style={[styles.button, syncing && styles.buttonDisabled]} onPress={onSync} disabled={syncing}>
          <Text style={styles.buttonText}>{syncing ? '校时中…' : '重新校时'}</Text>
        </Pressable>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>任务（{tasks.length}）</Text>
        <Pressable onPress={() => router.push('/task')}>
          <Text style={styles.link}>+ 新建</Text>
        </Pressable>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.dim}>还没有任务。先校时，再新建一个抢票任务。</Text>
        </View>
      ) : (
        tasks.map((task) => (
          <TaskCard key={task.id} task={task} now={now} />
        ))
      )}

      <Text style={styles.footnote}>
        提醒由系统按设备时钟触发。若设备时间被改动，请重新校时。
      </Text>
    </ScrollView>
  );
}

function TaskCard({ task, now }: { task: GrabTask; now: number }) {
  const fire = fireAtMs(task);
  const armed = Boolean(task.notificationId);
  const passed = fire <= now;

  const onDelete = () => {
    Alert.alert('删除任务', `确定删除「${task.name || '未命名'}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void removeTask(task.id) },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.taskName} numberOfLines={1}>
          {task.name || '未命名演出'}
        </Text>
        <Text style={[styles.badge, armed ? styles.badgeOk : passed ? styles.badgeDim : styles.badgeWarn]}>
          {armed ? '已排期' : passed ? '已过期' : '未排期'}
        </Text>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.dim}>开售</Text>
        <Text style={styles.value}>{formatDateTime(task.saleAtMs)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.dim}>提醒</Text>
        <Text style={styles.value}>{formatDateTime(fire)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.dim}>倒计时</Text>
        <Text style={[styles.value, !passed && styles.accent]}>{formatCountdown(fire - now)}</Text>
      </View>
      {task.note ? <Text style={styles.note}>{task.note}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => router.push(`/task?id=${task.id}`)}>
          <Text style={styles.actionText}>编辑</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => void openTarget(task.deepLink)}>
          <Text style={styles.actionText}>打开大麦</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onDelete}>
          <Text style={[styles.actionText, styles.danger]}>删除</Text>
        </Pressable>
      </View>
    </View>
  );
}

async function openTarget(link: string): Promise<void> {
  const { Linking } = await import('react-native');
  if (!link) {
    Alert.alert('缺少链接', '请先填写演出链接或商品 ID。');
    return;
  }
  try {
    await Linking.openURL(link);
  } catch {
    Alert.alert('打开失败', `系统无法打开：\n${link}`);
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.textDim, fontSize: 13, letterSpacing: 1 },
  bigClock: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dim: { color: colors.textDim, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  valueDim: { color: colors.textDim },
  accent: { color: colors.accent },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.accentText, fontWeight: '600', fontSize: 15 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  link: { color: colors.accent, fontSize: 15 },
  taskName: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  badge: {
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeOk: { backgroundColor: 'rgba(52,199,89,0.18)', color: colors.ok },
  badgeWarn: { backgroundColor: 'rgba(255,176,32,0.18)', color: colors.warn },
  badgeDim: { backgroundColor: 'rgba(155,163,180,0.18)', color: colors.textDim },
  note: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionText: { color: colors.text, fontSize: 14 },
  danger: { color: colors.danger },
  footnote: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});