import React, { useState, useEffect, useRef } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
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
import { setCustomNotificationHandler, registerForPushNotificationsAsync } from './src/utils/notifications';
import { startConnectivityMonitoring, stopConnectivityMonitoring } from './src/services/networkService';
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
  const pendingRoute = useAuthStore((s) => s.pendingRoute);
  const clearPendingRoute = useAuthStore((s) => s.clearPendingRoute);

  React.useEffect(() => {
    if (!pendingRoute) return;

    // Extraer path de cualquier formato: https://tryironflow.com/equipment/uuid o ironflow://equipment/uuid
    let path = '';
    try {
      const url = new URL(pendingRoute);
      path = url.pathname || url.host + (url.pathname || '');
    } catch {
      // Si falla URL parsing, intentar extraer directamente
      path = pendingRoute.replace(/^[a-z]+:\/\//, '');
    }

    const pathParts = path.split('/').filter(Boolean);
    if (pathParts[0] === 'equipment' && pathParts[1]) {
      setTimeout(() => {
        navigationRef.current?.navigate('EquipmentDetail', { equipmentId: pathParts[1] });
        clearPendingRoute();
      }, 300);
    } else {
      clearPendingRoute();
    }
  }, [pendingRoute, clearPendingRoute]);

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

const linking = {
  prefixes: ['https://tryironflow.com', 'http://tryironflow.com', 'ironflow://'],
  config: {
    screens: {
      App: {
        screens: {
          EquipmentDetail: 'equipment/:equipmentId',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
        },
      },
    },
  },
};

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

function DeepLinkHandler() {
  const token = useAuthStore((s) => s.token);
  const setPendingRoute = useAuthStore((s) => s.setPendingRoute);

  React.useEffect(() => {
    if (token) {
      startConnectivityMonitoring();
    } else {
      stopConnectivityMonitoring();
    }
  }, [token]);

  React.useEffect(() => {
    const handleUrl = ({ url }) => {
      if (!url) return;
      if (token) {
        // Usuario logueado: navegar directamente
        let path = '';
        try {
          const parsed = new URL(url);
          path = parsed.pathname || '';
        } catch {
          path = url.replace(/^[a-z]+:\/\//, '');
        }
        const parts = path.split('/').filter(Boolean);
        if (parts[0] === 'equipment' && parts[1]) {
          navigationRef.current?.navigate('EquipmentDetail', { equipmentId: parts[1] });
        }
      } else {
        // No logueado: guardar para después del login
        setPendingRoute(url);
      }
    };

    // Link recibido mientras la app está abierta
    const subscription = Linking.addEventListener('url', handleUrl);

    // Link que abrió la app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [token, setPendingRoute]);

  return null;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef(null);

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

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.url) {
        let path = '';
        try {
          const parsed = new URL(data.url);
          path = parsed.pathname || '';
        } catch {
          path = data.url.replace(/^[a-z]+:\/\//, '');
        }
        const parts = path.split('/').filter(Boolean);
        if (parts[0] === 'equipment' && parts[1]) {
          navigationRef.current?.navigate('EquipmentDetail', { equipmentId: parts[1] });
        }
      } else if (
        (data?.type === 'fault_created' || data?.type === 'fault_closed') &&
        data?.fault_id
      ) {
        navigationRef.current?.navigate('FaultDetail', { faultId: data.fault_id });
      }
    });
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
      <NavigationContainer ref={navigationRef} linking={linking}>
        <DeepLinkHandler />
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
