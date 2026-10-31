import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { apiPost } from '../api';
import { distanceMeters, formatDistance, formatDuration } from '../utils/geo';

export default function ActiveRecoveryScreen({ route, navigation }) {
  useKeepAwake();
  const { session, caseId, customer, loan } = route.params;
  const sessionId = session.sessionId || session._id;
  const started = session.startTime || session.startedAt || session.createdAt;
  const startedAt = useRef(started ? new Date(started).getTime() : Date.now());

  const [path, setPath] = useState([]);
  const [meters, setMeters] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [stopping, setStopping] = useState(false);

  const pathRef = useRef([]);
  const metersRef = useRef(0);
  const pendingRef = useRef([]);
  const pendingMetersRef = useRef(0);
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const allowLeave = useRef(false);

  const flush = async () => {
    if (!pendingRef.current.length) return;
    const points = pendingRef.current;
    const inc = pendingMetersRef.current;
    pendingRef.current = [];
    pendingMetersRef.current = 0;
    try {
      await apiPost(`/recovery/sessions/${sessionId}/points`, {
        points,
        incrementalDistanceMeters: Math.round(inc),
      });
    } catch (e) {
      pendingRef.current = points.concat(pendingRef.current);
      pendingMetersRef.current += inc;
    }
  };

  const addPoint = (p) => {
    const last = pathRef.current[pathRef.current.length - 1];
    const d = last ? distanceMeters(last, p) : 0;
    if (last && d < 3) return;
    pathRef.current = [...pathRef.current, p];
    metersRef.current += d;
    pendingRef.current.push(p);
    pendingMetersRef.current += d;
    setPath(pathRef.current);
    setMeters(metersRef.current);
  };

  useEffect(() => {
    const t = setInterval(() => setSeconds((Date.now() - startedAt.current) / 1000), 1000);
    const f = setInterval(flush, 10000);
    return () => { clearInterval(t); clearInterval(f); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Please allow location access to track the recovery.');
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 3000 },
        (loc) => {
          const c = loc.coords;
          if (c.accuracy && c.accuracy > 50) return;
          addPoint({
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: c.accuracy || 0,
            speed: c.speed && c.speed > 0 ? c.speed : 0,
            timestamp: new Date(loc.timestamp).toISOString(),
          });
          mapRef.current?.animateCamera({ center: { latitude: c.latitude, longitude: c.longitude }, zoom: 17 });
        }
      );
      if (cancelled) sub.remove(); else watchRef.current = sub;
    })();
    return () => { cancelled = true; watchRef.current?.remove(); };
  }, []);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (allowLeave.current) return;
        e.preventDefault();
        Alert.alert('Recovery in progress', 'Tap Stop Recovery to finish before leaving.');
      }),
    [navigation]
  );

  const doStop = async () => {
    setStopping(true);
    watchRef.current?.remove();
    watchRef.current = null;
    let end = pathRef.current[pathRef.current.length - 1];
    try {
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const p = {
        latitude: cur.coords.latitude,
        longitude: cur.coords.longitude,
        accuracy: cur.coords.accuracy || 0,
        speed: 0,
        timestamp: new Date().toISOString(),
      };
      addPoint(p);
      end = pathRef.current[pathRef.current.length - 1];
    } catch (e) {}
    if (!end) {
      Alert.alert('No location yet', 'Could not read your location. Move to an open area and try again.');
      setStopping(false);
      return;
    }
    await flush();
    allowLeave.current = true;
    navigation.replace('Complete', {
      session,
      caseId,
      customer,
      loan,
      distanceMeters: metersRef.current,
      durationSeconds: (Date.now() - startedAt.current) / 1000,
      startLocation: pathRef.current[0] || session.startLocation || null,
      endLocation: end,
    });
  };

  const stop = () =>
    Alert.alert('Stop recovery?', 'Tracking will end and you will add proof next.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: doStop },
    ]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        initialRegion={{ latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      >
        {path.length > 1 && <Polyline coordinates={path} strokeWidth={5} strokeColor="#1a56db" />}
        {path.length > 0 && <Marker coordinate={path[0]} title="Start" pinColor="green" />}
      </MapView>
      <View style={styles.panel}>
        <Text style={styles.name}>{customer?.name || 'Recovery in progress'}</Text>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(seconds)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDistance(meters)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
        {path.length === 0 && <Text style={styles.wait}>Waiting for GPS signal...</Text>}
        <TouchableOpacity style={styles.stopBtn} onPress={stop} disabled={stopping}>
          {stopping ? <ActivityIndicator color="#fff" /> : <Text style={styles.stopText}>Stop Recovery</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  map: { flex: 1 },
  panel: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 8 },
  stat: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#666' },
  wait: { color: '#b45309', marginBottom: 8 },
  stopBtn: { backgroundColor: '#b91c1c', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  stopText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
