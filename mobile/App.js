import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CaseDetailScreen from './src/screens/CaseDetailScreen';
import StartRecoveryScreen from './src/screens/StartRecoveryScreen';
import ActiveRecoveryScreen from './src/screens/ActiveRecoveryScreen';
import CompleteScreen from './src/screens/CompleteScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard', headerBackVisible: false }}
        />
        <Stack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Case details' }} />
        <Stack.Screen name="StartRecovery" component={StartRecoveryScreen} options={{ title: 'Start recovery' }} />
        <Stack.Screen
          name="ActiveRecovery"
          component={ActiveRecoveryScreen}
          options={{ title: 'Recovery in progress', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Complete"
          component={CompleteScreen}
          options={{ title: 'Proof and outcome', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
