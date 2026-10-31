import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { apiPost } from '../api';

const TYPES = [
  { key: 'BIKE', label: 'Bike' },
  { key: 'SCOOTER', label: 'Scooter' },
  { key: 'CAR', label: 'Car' },
  { key: 'AUTO', label: 'Auto' },
  { key: 'OTHER', label: 'Other' },
];

export default function StartRecoveryScreen({ route, navigation }) {
  const { caseId, customer, loan } = route.params;
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');

    if (!vehicleType) {
      setError('Select the vehicle type.');
      return;
    }
    if (vehicleNumber.replace(/[\s-]/g, '').length < 6) {
      setError('Enter the vehicle number (for example KA01AB1234).');
      return;
    }

    setLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission is needed to track the recovery route.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const initialLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || 0,
      };

      const data = await apiPost('/recovery/start', {
        assignmentId: caseId,
        customerId: customer._id || customer.id,
        loanId: loan._id || loan.id,
        vehicleType,
        vehicleNumber,
        initialLocation,
      });

      navigation.replace('ActiveRecovery', {
        session: data.session,
        caseId,
        customer,
        loan,
        startLocation: initialLocation,
      });
    } catch (e) {
      setError(
        e.message === 'Network request failed'
          ? 'Cannot reach the server. Check Wi-Fi and the address in config.js.'
          : e.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.customer}>{customer.name}</Text>
      <Text style={styles.loan}>{loan.loanId}</Text>

      <Text style={styles.label}>Type of vehicle</Text>
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.chip, vehicleType === t.key && styles.chipActive]}
            onPress={() => setVehicleType(t.key)}
          >
            <Text style={[styles.chipText, vehicleType === t.key && styles.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Vehicle number</Text>
      <TextInput
        style={styles.input}
        placeholder="KA01AB1234"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={14}
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={start} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start Recovery</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.note}>
        Your location is recorded from the moment you start until you stop.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  customer: { fontSize: 20, fontWeight: 'bold' },
  loan: { color: '#666', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  chipText: { fontSize: 15 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
    borderRadius: 8, padding: 14, fontSize: 16,
  },
  error: { color: '#c00', marginTop: 12 },
  button: {
    backgroundColor: '#15803d', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  note: { color: '#666', textAlign: 'center', marginTop: 12 },
});