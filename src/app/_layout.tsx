import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrate } from '../core/taskStore';
import { colors } from '../ui/theme';

export default function RootLayout() {
  useEffect(() => {
    void hydrate();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: '大麦抢票助手' }} />
        <Stack.Screen name="task" options={{ title: '编辑任务' }} />
      </Stack>
    </SafeAreaProvider>
  );
}