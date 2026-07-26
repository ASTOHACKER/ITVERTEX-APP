import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | null>(null);
  const [isSentSuccess, setIsSentSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSendResetEmail = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกอีเมลของคุณก่อนกดส่งลิงก์');
      return;
    }

    // Basic Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert('อีเมลไม่ถูกต้อง', 'กรุณาตรวจสอบรูปแบบอีเมลของคุณให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = Platform.OS === 'web'
        ? Linking.createURL('/reset-password')
        : 'myapp://reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setIsSentSuccess(true);
      setCooldown(60); // 60 seconds cooldown before allowing resend
    } catch (error: any) {
      showAlert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6 py-4"
        >
          {/* Back Button */}
          <TouchableOpacity
            className="flex-row items-center py-2 self-start mb-6"
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <View className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm mr-2">
              <Ionicons name="arrow-back" size={20} color="#64748b" />
            </View>
            <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              กลับไปหน้าเข้าสู่ระบบ
            </Text>
          </TouchableOpacity>

          {/* Card Container */}
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            {!isSentSuccess ? (
              <>
                {/* Header Icon */}
                <View className="w-16 h-16 rounded-2xl bg-red-500/10 items-center justify-center mb-4 align-self-center">
                  <Ionicons name="key-outline" size={32} color="#D32F2F" />
                </View>

                {/* Header Text */}
                <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                  ลืมรหัสผ่าน?
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-5">
                  กรุณากรอกอีเมลที่คุณใช้ลงทะเบียนในระบบ IT Vertex เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้คุณทางอีเมล
                </Text>

                {/* Email Input Field */}
                <View className="mb-5">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    อีเมลบัญชีผู้ใช้ (Email)
                  </Text>
                  <View
                    className={`flex-row items-center bg-slate-50 dark:bg-slate-700/50 border rounded-xl px-3.5 h-12 ${
                      focusedField === 'email'
                        ? 'border-[#D32F2F] bg-red-50/20'
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedField === 'email' ? '#D32F2F' : '#94a3b8'}
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-slate-800 dark:text-slate-100 text-base h-full"
                      placeholder="example@domain.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {email.length > 0 && (
                      <TouchableOpacity onPress={() => setEmail('')}>
                        <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  className={`rounded-xl py-3.5 justify-center items-center ${
                    !email.trim() || loading
                      ? 'bg-[#D32F2F]/50'
                      : 'bg-[#D32F2F] shadow-md shadow-[#D32F2F]/20'
                  }`}
                  onPress={handleSendResetEmail}
                  disabled={!email.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text className="text-white text-base font-bold">
                        ส่งลิงก์รีเซ็ตรหัสผ่าน
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* Success View */
              <View className="items-center py-4">
                <View className="w-20 h-20 rounded-full bg-emerald-500/10 items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={56} color="#10b981" />
                </View>

                <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                  ส่งอีเมลเรียบร้อยแล้ว!
                </Text>

                <Text className="text-sm text-slate-600 dark:text-slate-300 text-center mb-2 leading-6">
                  ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมล:
                </Text>

                <View className="bg-slate-100 dark:bg-slate-700/60 px-4 py-2 rounded-lg mb-4">
                  <Text className="text-base font-bold text-[#D32F2F]">
                    {email}
                  </Text>
                </View>

                <Text className="text-xs text-slate-400 dark:text-slate-400 text-center mb-6 leading-5">
                  กรุณาตรวจสอบใน Inbox หรือ Junk/Spam folder ของคุณ{'\n'}แล้วคลิกลิงก์เพื่อกำหนดรหัสผ่านใหม่
                </Text>

                {/* Resend Action */}
                <TouchableOpacity
                  className={`w-full py-3.5 rounded-xl border justify-center items-center mb-3 ${
                    cooldown > 0
                      ? 'border-slate-200 bg-slate-100'
                      : 'border-[#D32F2F] bg-white dark:bg-slate-800'
                  }`}
                  onPress={handleSendResetEmail}
                  disabled={cooldown > 0 || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#D32F2F" />
                  ) : (
                    <Text
                      className={`text-sm font-bold ${
                        cooldown > 0 ? 'text-slate-400' : 'text-[#D32F2F]'
                      }`}
                    >
                      {cooldown > 0
                        ? `ส่งอีเมลใหม่อีกครั้ง (${cooldown}s)`
                        : 'ส่งอีเมลใหม่อีกครั้ง'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity
                  className="py-2"
                  onPress={() => router.replace('/(auth)/login')}
                  activeOpacity={0.7}
                >
                  <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    กลับไปหน้าเข้าสู่ระบบ
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
