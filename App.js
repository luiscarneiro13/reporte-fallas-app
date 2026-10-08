import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as Notifications from 'expo-notifications';
import { I18nProvider } from './src/i18n';
import { QUERY_STALE_TIME, QUERY_CACHE_TIME } from './src/constants';
import LoginScreen        from './src/screens/LoginScreen';
import Sidebar            from './src/components/Sidebar';
import ReportFaultScreen  from './src/screens/Operador/ReportFaultScreen';
import FaultSummaryScreen from './src/screens/Operador/FaultSummaryScreen';
import FaultDetailScreen  from './src/screens/Operador/FaultDetailScreen';
import EditFaultScreen    from './src/screens/Supervisor/EditFaultScreen';
import CloseFaultScreen     from './src/screens/Supervisor/CloseFaultScreen';
import MyProfileScreen      from './src/screens/MyProfileScreen';
import EquipmentScreen      from './src/screens/EquipmentScreen';
import EquipmentDetailScreen from './src/screens/EquipmentDetailScreen';
import DevConfigScreen      from './src/screens/DevConfigScreen';
import useAuthStore         from './src/store/authStore';
import { hasFaultSummaryHome } from './src/utils/roles';
import { NotificationContext } from './src/contexts/NotificationContext';
import { setCustomNotificationHandler, registerForPushNotificationsAsync, getNotificationTarget, isExpoGo } from './src/utils/notifications';
import { startConnectivityMonitoring, stopConnectivityMonitoring, subscribeToConnectivity } from './src/services/networkService';
import { syncAll } from './src/services/syncService';
import { checkForUpdate } from './src/services/versionCheck';
import ForceUpdateScreen from './src/components/ForceUpdateScreen';

setCustomNotificationHandler();

export const navigationRef = React.createRef();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime:    QUERY_CACHE_TIME,
      retry: 1,
    },
  },
});

const AuthStack = createNativeStackNavigator();
const AppStack  = createNativeStackNavigator();
const Drawer    = createDrawerNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

const drawerOptions = {
  headerShown: false,
  drawerStyle: { width: 260 },
};

const MENU_OPERADOR = [
  { key: 'ReportFault',  labelKey: 'menu.report_fault',  icon: 'flag-outline',          screen: 'ReportFault' },
  { key: 'FaultSummary', labelKey: 'menu.fault_summary', icon: 'document-text-outline', screen: 'FaultSummary' },
  { key: 'Equipment',    labelKey: 'menu.equipment',     icon: 'car-outline',           screen: 'Equipment' },
  { key: 'MyProfile',    labelKey: 'menu.my_profile',    icon: 'person-outline',        screen: 'MyProfile' },
];

function OperadorDrawer() {
  return (
    <Drawer.Navigator drawerContent={(props) => <Sidebar {...props} />} screenOptions={drawerOptions}>
      <Drawer.Screen name="ReportFault"  component={ReportFaultScreen} />
      <Drawer.Screen name="FaultSummary" component={FaultSummaryScreen} />
      <Drawer.Screen name="Equipment"    component={EquipmentScreen} />
      <Drawer.Screen name="MyProfile"    component={MyProfileScreen} />
      <Drawer.Screen name="DevConfig"    component={DevConfigScreen} />
    </Drawer.Navigator>
  );
}

const MENU_SUPERVISOR = [
  { key: 'FaultSummary', labelKey: 'menu.fault_summary', icon: 'document-text-outline', screen: 'FaultSummary' },
  { key: 'ReportFault',  labelKey: 'menu.report_fault',  icon: 'flag-outline',          screen: 'ReportFault' },
  { key: 'Equipment',    labelKey: 'menu.equipment',     icon: 'car-outline',           screen: 'Equipment' },
  { key: 'MyProfile',    labelKey: 'menu.my_profile',    icon: 'person-outline',        screen: 'MyProfile' },
];

function SupervisorDrawer() {
  return (
    <Drawer.Navigator drawerContent={(props) => <Sidebar {...props} />} screenOptions={drawerOptions}>
      <Drawer.Screen name="FaultSummary" component={FaultSummaryScreen} />
      <Drawer.Screen name="ReportFault"  component={ReportFaultScreen} />
      <Drawer.Screen name="Equipment"    component={EquipmentScreen} />
      <Drawer.Screen name="MyProfile"    component={MyProfileScreen} />
      <Drawer.Screen name="DevConfig"    component={DevConfigScreen} />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const roles = useAuthStore((s) => s.roles);
  const MainDrawer = hasFaultSummaryHome(roles) ? SupervisorDrawer : OperadorDrawer;

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Main"              component={MainDrawer} />
      <AppStack.Screen name="FaultDetail"       component={FaultDetailScreen} />
      <AppStack.Screen name="EditFault"         component={EditFaultScreen} />
      <AppStack.Screen name="CloseFault"        component={CloseFaultScreen} />
      <AppStack.Screen name="EquipmentDetail"   component={EquipmentDetailScreen} />
    </AppStack.Navigator>
  );
}

const RootStack = createNativeStackNavigator();

function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {token
        ? <RootStack.Screen name="App"  component={AppNavigator} />
        : <RootStack.Screen name="Auth" component={AuthNavigator} />
      }
    </RootStack.Navigator>
  );
}

function ConnectivityHandler() {
  const token = useAuthStore((s) => s.token);

  React.useEffect(() => {
    if (!token) {
      stopConnectivityMonitoring();
      return;
    }
    startConnectivityMonitoring();
    const unsubscribe = subscribeToConnectivity((online) => {
      if (online) syncAll();
    });
    return () => {
      unsubscribe();
      stopConnectivityMonitoring();
    };
  }, [token]);

  return null;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef(null);
  const pendingNavigationRef = useRef(null);

  useEffect(() => {
    if (token) {
      checkForUpdate().then(setUpdateInfo);
    } else {
      setUpdateInfo(null);
    }
  }, [token]);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((t) => setExpoPushToken(t || ''))
      .catch(() => setExpoPushToken(''));
  }, []);

  // La navegación se difiere hasta que el NavigationContainer esté listo y el
  // stack "App" montado (sesión hidratada); si no, en arranque en frío se
  // perdía y la app quedaba en la pantalla de inicio.
  const flushPendingNavigation = useCallback(() => {
    const target = pendingNavigationRef.current;
    const nav = navigationRef.current;
    if (!target || !nav?.isReady() || !nav.getRootState()?.routeNames?.includes('App')) return;
    pendingNavigationRef.current = null;
    nav.navigate('App', { screen: target.name, params: target.params });
  }, []);

  useEffect(() => {
    if (isExpoGo) return undefined;
    let lastHandledId = null;
    const handleResponse = (response) => {
      const request = response?.notification?.request;
      if (request?.identifier && request.identifier === lastHandledId) return;
      lastHandledId = request?.identifier ?? null;
      const target = getNotificationTarget(request?.content?.data);
      if (!target) return;
      pendingNavigationRef.current = target;
      flushPendingNavigation();
    };

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      handleResponse(initialResponse);
      Notifications.clearLastNotificationResponse();
    }

    notificationListener.current = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
    };
  }, []);

  if (updateInfo?.updateRequired && updateInfo?.force) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ForceUpdateScreen
          updateUrl={updateInfo.updateUrl}
          message={updateInfo.message}
          force
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <NotificationContext.Provider value={{ expoPushToken }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={flushPendingNavigation}
        onStateChange={flushPendingNavigation}
      >
        <ConnectivityHandler />
        <RootNavigator />
        {updateInfo?.updateRequired && !updateInfo?.force && (
          <View style={StyleSheet.absoluteFill}>
            <ForceUpdateScreen
              updateUrl={updateInfo.updateUrl}
              message={updateInfo.message}
              force={false}
              onSkip={() => setUpdateInfo(null)}
            />
          </View>
        )}
      </NavigationContainer>
      </NotificationContext.Provider>
      </I18nProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
