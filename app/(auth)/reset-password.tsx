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
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const searchParams = useLocalSearchParams();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null);

    const showAlert = (title: string, message: string, onPress?: () => void) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
            if (onPress) onPress();
        } else {
            Alert.alert(title, message, onPress ? [{ text: 'ตกลง', onPress }] : undefined);
        }
    };

    useEffect(() => {
        // 1. ตรวจสอบ Error จาก URL query parameters (เช่น ลิงก์หมดอายุ หรือ ยกเลิก)
        const errorCode = searchParams.error_code || searchParams.error;
        const errorDesc = searchParams.error_description || searchParams.error_desc;

        if (errorCode === 'otp_expired') {
            showAlert(
                'ลิงก์หมดอายุ',
                'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุหรือเคยถูกใช้งานไปแล้ว กรุณากดส่งอีเมลลืมรหัสผ่านใหม่อีกครั้ง',
                () => router.replace('/(auth)/login')
            );
            return;
        } else if (errorDesc) {
            showAlert(
                'เกิดข้อผิดพลาด',
                typeof errorDesc === 'string' ? decodeURIComponent(errorDesc).replace(/\+/g, ' ') : 'ลิงก์ไม่ถูกต้องหรือหมดอายุ',
                () => router.replace('/(auth)/login')
            );
            return;
        }

        // 2. ตรวจสอบ Error จาก URL hash fragment (กรณีบนเว็บ)
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hash);
            const hashErrorCode = hashParams.get('error_code') || hashParams.get('error');
            const hashErrorDesc = hashParams.get('error_description') || hashParams.get('error_desc');

            if (hashErrorCode === 'otp_expired' || hash.includes('otp_expired')) {
                showAlert(
                    'ลิงก์หมดอายุ',
                    'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุหรือเคยถูกใช้งานไปแล้ว กรุณากดส่งใหม่อีกครั้ง',
                    () => {
                        window.history.replaceState(null, '', window.location.pathname);
                        router.replace('/(auth)/login');
                    }
                );
                return;
            } else if (hashErrorDesc) {
                showAlert(
                    'เกิดข้อผิดพลาด',
                    decodeURIComponent(hashErrorDesc).replace(/\+/g, ' '),
                    () => {
                        window.history.replaceState(null, '', window.location.pathname);
                        router.replace('/(auth)/login');
                    }
                );
                return;
            }
        }

        // 3. ตรวจสอบและดักจับ Session ของผู้ใช้
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) {
                setIsSessionReady(true);
            }
        });

        // Fallback เช็ค Session หลังจากโหลด 1.5 วินาที
        const timer = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsSessionReady(true);
            } else {
                showAlert(
                    'ไม่พบสิทธิ์การเข้าถึง',
                    'กรุณาเข้าใช้งานหน้านี้ผ่านลิงก์จากอีเมลรีเซ็ตรหัสผ่านเท่านั้น',
                    () => router.replace('/(auth)/login')
                );
            }
        }, 1500);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [searchParams]);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน');
            return;
        }

        if (password.length < 6) {
            showAlert('ข้อผิดพลาด', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('ข้อผิดพลาด', 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            showAlert('สำเร็จ', 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่', () => {
                // ล้าง session ล่าสุดออกเพื่อให้ต้อง Login ใหม่ด้วยรหัสผ่านใหม่
                supabase.auth.signOut();
                router.replace('/(auth)/login');
            });
        } catch (error: any) {
            showAlert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
        } finally {
            setLoading(false);
        }
    };

    if (!isSessionReady) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#cc292b" />
                <Text className="mt-4 text-[#64748b] text-base">กำลังตรวจสอบลิงก์ความปลอดภัย...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#cc292b]">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#cc292b" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#ffffff' }} bounces={false} keyboardShouldPersistTaps="handled">
                    
                    {/* Header Section */}
                    <View className="bg-[#cc292b] h-[220px] justify-center items-center relative overflow-hidden">
                        <View className="absolute w-[260px] h-[260px] rounded-[130px] bg-white/5 -top-[60px] -left-[40px]" />
                        <View className="absolute w-[180px] h-[180px] rounded-[90px] bg-white/5 -bottom-[50px] -right-[30px]" />

                        <View className="items-center z-10">
                            <Text className="text-[32px] font-bold text-white tracking-[1px] mb-2">IT VERTEX</Text>
                            <Text className="text-base text-white/80">ตั้งรหัสผ่านใหม่</Text>
                        </View>
                    </View>

                    {/* Form Section */}
                    <View className="flex-1 bg-white px-6 pt-8 pb-10 rounded-t-[24px] -mt-5">
                        <Text className="text-[22px] font-bold text-[#1e293b] text-center mb-2">กำหนดรหัสผ่านใหม่</Text>
                        <Text className="text-sm text-[#94a3b8] text-center mb-8">กรุณากรอกรหัสผ่านใหม่ที่คุณต้องการใช้งาน</Text>

                        {/* Password Input */}
                        <View className="mb-5">
                            <Text className="text-sm text-[#64748b] mb-2 font-semibold">รหัสผ่านใหม่ (New Password)</Text>
                            <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'password' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                                <TextInput
                                    className="flex-1 h-full text-[#1e293b] text-base"
                                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="p-2 justify-center items-center"
                                >
                                    <Ionicons 
                                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#64748b" 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View className="mb-5">
                            <Text className="text-sm text-[#64748b] mb-2 font-semibold">ยืนยันรหัสผ่านใหม่ (Confirm New Password)</Text>
                            <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'confirmPassword' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                                <TextInput
                                    className="flex-1 h-full text-[#1e293b] text-base"
                                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    onFocus={() => setFocusedField('confirmPassword')}
                                    onBlur={() => setFocusedField(null)}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="p-2 justify-center items-center"
                                >
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#64748b" 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            className={`bg-[#D32F2F] rounded-xl py-4 justify-center items-center mt-3 shadow-md shadow-[#D32F2F]/20 elevation-4 ${loading ? 'opacity-80' : ''}`}
                            onPress={handleResetPassword}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-white text-base font-bold">เปลี่ยนรหัสผ่าน</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <TouchableOpacity 
                            onPress={() => router.replace('/(auth)/login')}
                            className="mt-5 items-center"
                        >
                            <Text className="text-[#64748b] text-sm font-medium">ยกเลิกและกลับไปหน้าเข้าสู่ระบบ</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

