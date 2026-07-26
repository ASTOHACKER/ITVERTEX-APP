import { usePasswordStrength } from '@/hooks/use-password-strength';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// จำเป็นสำหรับ WebBrowser (เพื่อช่วยเคลียร์ session เวลาปิด browser)
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
    const router = useRouter();
    const searchParams = useLocalSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<'email' | 'password' | 'username' | 'firstName' | 'lastName' | 'phone' | null>(null);
    const [authProvider, setAuthProvider] = useState<'email' | 'google' | null>(null);
    const [needsPhone, setNeedsPhone] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const isChecking = React.useRef(false);

    // กฎความปลอดภัยของรหัสผ่าน (ใช้บังคับเฉพาะตอนลงทะเบียน)
    const { rules: passwordRules, isStrong: isPasswordStrong, ruleDefs } = usePasswordStrength(password);

    // ปุ่ม submit จะ disabled ตอน register เมื่อข้อมูลไม่ครบ / รหัสไม่แข็งแรง
    const isSubmitDisabled = loading || (!isLogin && (!email || !username || !isPasswordStrong));

    useEffect(() => {
        // 1. ตรวจสอบ error จาก URL query parameters (เช่น บน Mobile/Web)
        const errorCode = searchParams.error_code || searchParams.error;
        const errorDesc = searchParams.error_description || searchParams.error_desc;

        if (errorCode === 'otp_expired') {
            showAlert('ลิงก์หมดอายุ', 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุหรือเคยถูกใช้งานไปแล้ว กรุณากดส่งใหม่อีกครั้ง');
            return;
        } else if (errorDesc) {
            showAlert('เกิดข้อผิดพลาด', typeof errorDesc === 'string' ? decodeURIComponent(errorDesc).replace(/\+/g, ' ') : 'ลิงก์ไม่ถูกต้องหรือหมดอายุ');
            return;
        }

        // 2. ตรวจสอบ error จาก URL hash fragment (เช่น บน Web)
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hash);
            const hashErrorCode = hashParams.get('error_code') || hashParams.get('error');
            const hashErrorDesc = hashParams.get('error_description') || hashParams.get('error_desc');

            if (hashErrorCode === 'otp_expired' || hash.includes('otp_expired')) {
                showAlert('ลิงก์หมดอายุ', 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุหรือเคยถูกใช้งานไปแล้ว กรุณากดส่งใหม่อีกครั้ง');
                window.history.replaceState(null, '', window.location.pathname);
            } else if (hashErrorDesc) {
                showAlert('เกิดข้อผิดพลาด', decodeURIComponent(hashErrorDesc).replace(/\+/g, ' '));
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                checkUserPhone(session);
            } else {
                setLoading(false);
                setAuthProvider(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const checkUserPhone = async (currentSession?: any) => {
        if (isChecking.current) {
            return;
        }
        isChecking.current = true;
        try {
            const session = currentSession || (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('phone, first_name, last_name')
                .eq('id', session.user.id)
                .single();

            if (error || !data || !data.phone || !data.first_name || !data.last_name) {
                if (session.user?.user_metadata) {
                    const meta = session.user.user_metadata;
                    if (meta.full_name) {
                        const parts = meta.full_name.split(' ');
                        setFirstName(parts[0] || '');
                        setLastName(parts.slice(1).join(' ') || '');
                    } else {
                        setFirstName(meta.first_name || meta.given_name || '');
                        setLastName(meta.last_name || meta.family_name || '');
                    }
                }
                setNeedsPhone(true);
            } else {
                router.replace('/(tabs)');
            }
        } catch (err) {
            console.error('checkUserPhone error:', err);
            setNeedsPhone(true);
        } finally {
            setLoading(false);
            setAuthProvider(null);
            isChecking.current = false;
        }
    };

    const handleSaveProfile = async () => {
        if (!firstName || !lastName) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อและนามสกุล');
            return;
        }
        if (!phoneInput) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์');
            return;
        }
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { error } = await supabase.from('profiles').update({
                phone: phoneInput,
                first_name: firstName,
                last_name: lastName
            }).eq('id', session.user.id);

            if (error) {
                showAlert('เกิดข้อผิดพลาด', error.message);
            } else {
                showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
                setNeedsPhone(false);
                router.replace('/(tabs)');
            }
        }
        setLoading(false);
    };

    async function handleAuth() {
        if (!email || !password) {
            showAlert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }

        setLoading(true);
        setAuthProvider('email');

        if (isLogin) {
            let loginEmail = email.trim();

            // Check if input is a username (does not contain '@')
            if (!loginEmail.includes('@')) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', loginEmail)
                    .single();

                if (profileError || !profile || !profile.email) {
                    showAlert('เข้าสู่ระบบล้มเหลว', 'ไม่พบชื่อผู้ใช้งานหรืออีเมลนี้ในระบบ');
                    console.log('profileError:', profileError);
                    setLoading(false);
                    setAuthProvider(null);
                    return;
                }
                loginEmail = profile.email;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: password,
            });

            if (error) {
                showAlert('เข้าสู่ระบบล้มเหลวx', error.message);
                setLoading(false);
                setAuthProvider(null);
            }
        } else {
            if (!username) {
                showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อผู้ใช้สำหรับลงทะเบียน');
                setLoading(false);
                setAuthProvider(null);
                return;
            }

            if (!isPasswordStrong) {
                showAlert(
                    'รหัสผ่านไม่ปลอดภัย',
                    'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และสัญลักษณ์'
                );
                setLoading(false);
                setAuthProvider(null);
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        username: username.trim(),
                        role: 'Customer',
                    }
                }
            });

            if (error) {
                showAlert('ลงทะเบียนล้มเหลว', error.message);
                setLoading(false);
                setAuthProvider(null);
            } else {
                showAlert('สำเร็จ', 'ลงทะเบียนเรียบร้อยแล้ว');
                if (data.user) {
                    try {
                        await supabase.from('profiles').upsert({
                            id: data.user.id,
                            username: username.trim(),
                            email: email.trim(),
                            role: 'Customer'
                        });
                    } catch (upsertErr) {
                        console.warn('Upsert profile error:', upsertErr);
                    }
                }
                if (!data.session) {
                    setIsLogin(true);
                    setLoading(false);
                    setAuthProvider(null);
                }
            }
        }
    }

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setAuthProvider('google');
            const redirectUrl = Platform.OS === 'web'
                ? Linking.createURL('/login')
                : 'myapp://login';

            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                    }
                });
                if (error) throw error;
                return;
            }

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                }
            });

            if (error) throw error;

            if (data?.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (res.type === 'success' && res.url) {
                    const parsedUrl = Linking.parse(res.url);
                    const code = parsedUrl.queryParams?.code as string | undefined;
                    let accessToken = parsedUrl.queryParams?.access_token as string | undefined;
                    let refreshToken = parsedUrl.queryParams?.refresh_token as string | undefined;

                    if (!code && !accessToken && res.url.includes('#')) {
                        const hash = res.url.split('#')[1];
                        const hashParams = new URLSearchParams(hash);
                        accessToken = hashParams.get('access_token') || undefined;
                        refreshToken = hashParams.get('refresh_token') || undefined;
                    }

                    if (code) {
                        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
                        if (sessionError) {
                            setLoading(false);
                            setAuthProvider(null);
                            throw sessionError;
                        }
                    } else if (accessToken) {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });
                        if (sessionError) {
                            setLoading(false);
                            setAuthProvider(null);
                            throw sessionError;
                        }
                    } else {
                        setLoading(false);
                        setAuthProvider(null);
                        throw new Error('Missing OAuth code or token in redirect URL');
                    }
                } else {
                    setLoading(false);
                    setAuthProvider(null);
                }
            }
        } catch (error: any) {
            console.error('Google Login Error:', error.message);
            showAlert('เกิดข้อผิดพลาด', error.message);
            setLoading(false);
            setAuthProvider(null);
        }
    };

    const handleForgotPassword = () => {
        router.push('/(auth)/forgot-password');
    };

    return (
        <SafeAreaView className="flex-1 bg-[#D32F2F]">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#cc292b" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerClassName="grow bg-white" bounces={false} keyboardShouldPersistTaps="handled">




                    {/* Red Header Section */}
                    <View className="bg-[#D32F2F] pb-10 px-6 relative overflow-hidden" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 40 : 60 }}>
                        <View className="absolute w-[250px] h-[250px] rounded-[125px] bg-white/5 -top-[50px] -right-[80px]" />
                        <View className="absolute w-[100px] h-[100px] rounded-[50px] bg-white/10 top-[25px] -right-[5px]" />

                        <View className="mt-5">
                            <Text className="text-[32px] font-black text-white tracking-[1px] mb-2">IT VERTEX</Text>
                            <Text className="text-base text-white/80">Repair Management System</Text>
                        </View>
                    </View>

                    {/* White Form Section */}
                    <View className="flex-1 bg-white px-6 pt-8 pb-5">
                        {needsPhone ? (
                            <>
                                <Text className="text-[22px] font-bold text-[#1e293b] text-center mb-2">ข้อมูลเพิ่มเติม</Text>
                                <Text className="text-sm text-[#94a3b8] text-center mb-8">กรุณากรอกข้อมูลของคุณเพื่อใช้ในการติดต่อ</Text>

                                <View className="mb-5">
                                    <Text className="text-sm text-[#64748b] mb-2 font-semibold">ชื่อ (First Name)</Text>
                                    <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'firstName' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                        <TextInput
                                            className="flex-1 h-full text-[#1e293b] text-base"
                                            placeholder="กรอกชื่อจริง"
                                            placeholderTextColor="#94a3b8"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            onFocus={() => setFocusedField('firstName')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                <View className="mb-5">
                                    <Text className="text-sm text-[#64748b] mb-2 font-semibold">นามสกุล (Last Name)</Text>
                                    <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'lastName' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                        <TextInput
                                            className="flex-1 h-full text-[#1e293b] text-base"
                                            placeholder="กรอกนามสกุล"
                                            placeholderTextColor="#94a3b8"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            onFocus={() => setFocusedField('lastName')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                <View className="mb-5">
                                    <Text className="text-sm text-[#64748b] mb-2 font-semibold">เบอร์โทรศัพท์ (Phone)</Text>
                                    <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'phone' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                        <TextInput
                                            className="flex-1 h-full text-[#1e293b] text-base"
                                            placeholder="08X-XXX-XXXX"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="phone-pad"
                                            value={phoneInput}
                                            onChangeText={setPhoneInput}
                                            onFocus={() => setFocusedField('phone')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className="bg-[#D32F2F] rounded-xl py-4 justify-center items-center mt-3 shadow-md shadow-[#D32F2F]/20 elevation-4"
                                    onPress={handleSaveProfile}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-white text-base font-bold">บันทึกข้อมูล</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text className="text-[22px] font-bold text-[#1e293b] text-center mb-2">{isLogin ? 'ยินดีต้อนรับ' : 'ลงทะเบียนบัญชีใหม่'}</Text>
                                <Text className="text-sm text-[#94a3b8] text-center mb-8">กรุณาเลือกบทบาทและเข้าสู่ระบบ</Text>

                                <View className="mb-5">
                                    <Text className="text-sm text-[#64748b] mb-2 font-semibold">ชื่อผู้ใช้งาน (Email/User)</Text>
                                    <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'email' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                        <TextInput
                                            className="flex-1 h-full text-[#1e293b] text-base"
                                            placeholder="กรอกอีเมล"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                {!isLogin && (
                                    <View className="mb-5">
                                        <Text className="text-sm text-[#64748b] mb-2 font-semibold">ชื่อผู้ใช้งาน (Username)</Text>
                                        <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'username' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                            <TextInput
                                                className="flex-1 h-full text-[#1e293b] text-base"
                                                placeholder="กรอกชื่อผู้ใช้"
                                                placeholderTextColor="#94a3b8"
                                                value={username}
                                                onChangeText={setUsername}
                                                onFocus={() => setFocusedField('username')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </View>
                                    </View>
                                )}

                                <View className="mb-5">
                                    <Text className="text-sm text-[#64748b] mb-2 font-semibold">รหัสผ่าน (Password)</Text>
                                    <View className={`flex-row items-center bg-white border rounded-xl px-4 h-[52px] ${focusedField === 'password' ? 'border-[#D32F2F]' : 'border-[#e2e8f0]'}`}>
                                        <TextInput
                                            className="flex-1 h-full text-[#1e293b] text-base"
                                            placeholder="กรอกรหัสผ่าน"
                                            placeholderTextColor="#94a3b8"
                                            secureTextEntry={!showPassword}
                                            value={password}
                                            onChangeText={setPassword}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <TouchableOpacity
                                            className="p-2 justify-center items-center"
                                            onPress={() => setShowPassword(!showPassword)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#cbd5e1"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {!isLogin && (
                                        <View className="mt-3">
                                            <Text className="text-xs text-[#94a3b8] mb-1.5">รหัสผ่านต้องประกอบด้วย:</Text>
                                            {ruleDefs.map((rule) => {
                                                const ok = passwordRules[rule.key];
                                                return (
                                                    <View key={rule.key} className="flex-row items-center mt-1">
                                                        <Ionicons
                                                            name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                                                            size={14}
                                                            color={ok ? '#16a34a' : '#cbd5e1'}
                                                        />
                                                        <Text
                                                            className={`ml-1.5 text-xs ${ok ? 'text-green-600' : 'text-[#94a3b8]'}`}
                                                        >
                                                            {rule.label}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    className={`rounded-xl py-4 justify-center items-center mt-3 ${isSubmitDisabled ? 'bg-[#D32F2F]/40' : 'bg-[#D32F2F] shadow-md shadow-[#D32F2F]/20 elevation-4'}`}
                                    onPress={handleAuth}
                                    disabled={isSubmitDisabled}
                                    activeOpacity={0.8}
                                >
                                    {loading && authProvider === 'email' ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-white text-base font-bold">
                                            {isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {isLogin && (
                                    <TouchableOpacity className="mt-4 items-center" onPress={handleForgotPassword}>
                                        <Text className="text-[#D32F2F] text-sm font-medium">ลืมรหัสผ่าน?</Text>
                                    </TouchableOpacity>
                                )}

                                <View className="flex-row items-center my-6">
                                    <View className="flex-1 h-[1px] bg-[#f1f5f9]" />
                                    <Text className="text-[#94a3b8] px-4 text-sm">หรือ</Text>
                                    <View className="flex-1 h-[1px] bg-[#f1f5f9]" />
                                </View>

                                <TouchableOpacity
                                    className="flex-row items-center justify-center bg-white py-[14px] rounded-xl border border-[#e2e8f0] mb-4"
                                    onPress={handleGoogleLogin}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading && authProvider === 'google' ? (
                                        <ActivityIndicator color="#cc292b" />
                                    ) : (
                                        <>
                                            <Ionicons name="logo-google" size={20} color="#db4437" className="mr-2.5" />
                                            <Text className="text-[#475569] text-[15px] font-semibold">เข้าสู่ระบบด้วย Google X</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="items-center py-3"
                                    onPress={() => setIsLogin(!isLogin)}
                                    activeOpacity={0.7}
                                >
                                    <Text className="text-[#64748b] text-sm underline">
                                        {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View className="flex-1 justify-end items-center mt-10">
                            <Text className="text-[#94a3b8] text-xs">IT VERTEX v2.0 © 2026</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
