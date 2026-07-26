import 'react-native-url-polyfill/auto'; // ✅ Fix: Supabase Network request failed on React Native
import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Kanit_300Light,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_600SemiBold,
  Kanit_700Bold,
} from '@expo-google-fonts/kanit';



// ป้องกันไม่ให้ Splash Screen ซ่อนอัตโนมัติก่อนฟอนต์โหลดเสร็จ
SplashScreen.preventAutoHideAsync().catch(() => {});

// ปิด popup บนเว็บอัตโนมัติเมื่อ Google ส่งค่ากลับมาที่แอป
WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  // anchor: '(tabs)',
};

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  const [loaded, error] = useFonts({
    Kanit_300Light,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_600SemiBold,
    Kanit_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="job-detail" options={{ headerShown: false }} />
        <Stack.Screen name="edit-job" options={{ headerShown: false }} />
        <Stack.Screen name="edit-customer" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="report-error" options={{ headerShown: false }} />
        <Stack.Screen name="receipt" options={{ headerShown: false }} />
        <Stack.Screen name="slips" options={{ headerShown: false }} />
        <Stack.Screen name="signing-test" options={{ headerShown: false }} />
        <Stack.Screen name="signing-test2" options={{ headerShown: false }} />
        <Stack.Screen name="repair_job_insert_test" options={{ headerShown: false }} />
        <Stack.Screen name="repair_job_insert_test_v2" options={{ headerShown: false }} />
        <Stack.Screen name="device_insert_test" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
