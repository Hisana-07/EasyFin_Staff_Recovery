import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CaseDetailScreen from './src/screens/CaseDetailScreen';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}