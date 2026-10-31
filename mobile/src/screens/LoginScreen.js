import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../api';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showError = (e) =>
    setError(
      e.message === 'Network request failed'
        ? 'Cannot reach the server. Check Wi-Fi and the address in config.js.'
        : e.message
    );

  const sendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/auth/send-otp', { phone });
      setDemoOtp(data.demoOtp || '');
      setStep('otp');
      if (data.demoOtp) setShowPopup(true);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/auth/verify-otp', { phone, otp });
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('staff', JSON.stringify(data.staff));
      navigation.replace('Dashboard');
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EasyFin Recovery</Text>
      <Text style={styles.subtitle}>Staff login</Text>

      <TextInput
        style={styles.input}
        placeholder="Mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        value={phone}
        onChangeText={setPhone}
        editable={step === 'phone'}
      />

      {step === 'otp' && (
        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={step === 'phone' ? sendOtp : verifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 'phone' ? 'Send OTP' : 'Verify & Login'}
          </Text>
        )}
      </TouchableOpacity>

      {step === 'otp' && (
        <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); }}>
          <Text style={styles.link}>Change number</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showPopup} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Your OTP</Text>
            <Text style={styles.popupOtp}>{demoOtp}</Text>
            <Text style={styles.popupNote}>Valid for 5 minutes</Text>
            <TouchableOpacity style={styles.button} onPress={() => setShowPopup(false)}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 14 },
  button: { backgroundColor: '#1a56db', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c00', marginBottom: 8, textAlign: 'center' },
  link: { color: '#1a56db', textAlign: 'center', marginTop: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  popup: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center' },
  popupTitle: { fontSize: 18, fontWeight: '600' },
  popupOtp: { fontSize: 40, fontWeight: 'bold', letterSpacing: 6, marginVertical: 12 },
  popupNote: { color: '#666', marginBottom: 16 },
});