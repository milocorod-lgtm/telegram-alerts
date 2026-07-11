import React, { useEffect } from 'react';
import { AppState, Text } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import notifee, { EventType } from '@notifee/react-native';

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
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1976d2' }}>
      <Tab.Screen
        name="Inicio"
        component={WelcomeScreen}
        options={{ tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="Configurar"
        component={ConfigScreen}
        options={{ tabBarIcon: tabIcon('⚙️') }}
      />
      <Tab.Screen
        name="Estado"
        component={StatusScreen}
        options={{ tabBarIcon: tabIcon('📋') }}
      />
    </Tab.Navigator>
  );
}

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
    <NavigationContainer ref={navigationRef} onReady={onNavReady}>
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
