import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function DashboardScreen({ navigation }) {
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync('staff').then((s) => s && setStaff(JSON.parse(s)));
  }, []);

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('staff');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{staff ? `, ${staff.name}` : ''}</Text>
      <Text>Dashboard coming in the next step</Text>
      <TouchableOpacity onPress={logout}>
        <Text style={styles.link}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  link: { color: '#1a56db', marginTop: 24 },
});