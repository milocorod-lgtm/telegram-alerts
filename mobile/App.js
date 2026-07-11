import React, { useEffect } from 'react';
import { AppState, Text } from 'react-native';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import notifee, { EventType } from '@notifee/react-native';
import theme from './src/theme';

import WelcomeScreen from './src/screens/WelcomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import StatusScreen from './src/screens/StatusScreen';
import AlarmScreen from './src/screens/AlarmScreen';
import { initPush, onForegroundAlarm } from './src/services/pushService';
import { stopAlarmSound } from './src/services/alarmService';
import {
  ensureAlarmChannel,
  ensureFullScreenPermission,
  getPendingAlarm,
  clearAlarmNotification,
} from './src/services/fullScreenAlarm';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function goToAlarm({ chatName, keyword, callText }) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Alarm', { chatName, keyword, callText, triggered: true });
  }
}

function tabIcon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.cyan,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.bgHero,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Inicio" component={WelcomeScreen} options={{ tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="Configurar" component={ConfigScreen} options={{ tabBarIcon: tabIcon('⚙️') }} />
      <Tab.Screen name="Estado" component={StatusScreen} options={{ tabBarIcon: tabIcon('📋') }} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: theme.bg, card: theme.bgHero, text: theme.text, border: theme.border, primary: theme.cyan },
};

export default function App() {
  useEffect(() => {
    ensureAlarmChannel();
    ensureFullScreenPermission();
    initPush().catch(() => {});

    const unsubForeground = onForegroundAlarm((remoteMessage) => {
      const data = remoteMessage.data || {};
      goToAlarm({ chatName: data.chat_name, keyword: data.keyword, callText: data.call_text });
    });

    const unsubNotifee = notifee.onForegroundEvent(async ({ type, detail }) => {
      const actionId = detail && detail.pressAction && detail.pressAction.id;
      if (type === EventType.DISMISSED || actionId === 'reject') {
        stopAlarmSound();
        await clearAlarmNotification();
      }
    });

    // Al volver al frente (abrir o DESBLOQUEAR): si hay alarma pendiente, mostrarla.
    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const pending = await getPendingAlarm();
        if (pending) goToAlarm(pending);
      }
    });

    return () => {
      unsubForeground();
      unsubNotifee();
      appStateSub.remove();
    };
  }, []);

  async function onNavReady() {
    const pending = await getPendingAlarm();
    if (pending) goToAlarm(pending);
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavReady} theme={navTheme}>
      <RootStack.Navigator>
        <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen
          name="Alarm"
          component={AlarmScreen}
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
