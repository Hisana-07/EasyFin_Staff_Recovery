import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { apiGet } from '../api';

const money = (n) =>
  '\u20B9' + String(Math.round(Number(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [staff, setStaff] = useState(null);
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('staff');
    navigation.replace('Login');
  }, [navigation]);

  const load = useCallback(async () => {
    setError('');
    try {
      const s = await SecureStore.getItemAsync('staff');
      if (s) setStaff(JSON.parse(s));
      const [dash, pending] = await Promise.all([
        apiGet('/analytics/dashboard'),
        apiGet('/cases?status=PENDING'),
      ]);
      setStats(dash.stats);
      setCases(pending.cases);
    } catch (e) {
      if (e.status === 401) {
        await logout();
        return;
      }
      setError(
        e.message === 'Network request failed'
          ? 'Cannot reach the server. Check Wi-Fi and the address in config.js.'
          : e.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcome}>Hello, {staff ? staff.name : ''}</Text>
          {staff ? <Text style={styles.area}>{staff.assignedArea}</Text> : null}
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {stats && (
        <View style={styles.grid}>
          <StatCard label="Loans assigned" value={stats.totalAssigned} />
          <StatCard label="Pending cases" value={stats.pendingCases} color="#c2410c" />
          <StatCard label="In progress" value={stats.inProgressCases} />
          <StatCard label="Completed" value={stats.completedCases} color="#15803d" />
          <StatCard label="Collected today" value={money(stats.todayRecoveredAmount)} color="#15803d" />
          <StatCard label="Total collected" value={money(stats.totalRecoveredAmount)} color="#15803d" />
        </View>
      )}

      <Text style={styles.sectionTitle}>Pending cases</Text>
      {cases.length === 0 && !error ? (
        <Text style={styles.empty}>No pending cases.</Text>
      ) : null}

      {cases.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={styles.caseCard}
          onPress={() => navigation.navigate('CaseDetail', { id: c.id })}
        >
          <View style={styles.caseTop}>
            <Text style={styles.caseName}>{c.customer.name}</Text>
            <Text style={styles.priority}>{c.priority}</Text>
          </View>
          <Text style={styles.caseLoan}>{c.loan.loanId} - {c.loan.loanType}</Text>
          <Text style={styles.caseDue}>To collect: {money(c.loan.overdueAmount)}</Text>
          <Text style={styles.caseDays}>{c.loan.overdueDays} days overdue</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcome: { fontSize: 20, fontWeight: 'bold' },
  area: { color: '#666', marginTop: 2 },
  logout: { color: '#1a56db', fontWeight: '600' },
  error: { color: '#c00', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginVertical: 8 },
  empty: { color: '#666' },
  caseCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12 },
  caseTop: { flexDirection: 'row', justifyContent: 'space-between' },
  caseName: { fontSize: 16, fontWeight: '600' },
  priority: { fontSize: 12, fontWeight: '700', color: '#c2410c' },
  caseLoan: { color: '#666', marginTop: 4 },
  caseDue: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  caseDays: { color: '#c2410c', marginTop: 2 },
});