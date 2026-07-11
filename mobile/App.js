import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';

import ConfigScreen from './src/screens/ConfigScreen';
import AlarmScreen from './src/screens/AlarmScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { initPush, onForegroundAlarm } from './src/services/pushService';
import { stopAlarmSound } from './src/services/alarmService';
import {
  ensureAlarmChannel,
  ensureFullScreenPermission,
  getPendingAlarm,
  clearAlarmNotification,
} from './src/services/fullScreenAlarm';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function goToAlarm({ chatName, keyword, callText }) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Alarm', { chatName, keyword, callText, triggered: true });
  }
}

export default function App() {
  useEffect(() => {
    ensureAlarmChannel();
    ensureFullScreenPermission();
    initPush().catch(() => {});

    // Push recibido con la app en primer plano.
    const unsubForeground = onForegroundAlarm((remoteMessage) => {
      const data = remoteMessage.data || {};
      goToAlarm({ chatName: data.chat_name, keyword: data.keyword, callText: data.call_text });
    });

    // Acciones de la notificacion con la app en primer plano.
    const unsubNotifee = notifee.onForegroundEvent(async ({ type, detail }) => {
      const actionId = detail && detail.pressAction && detail.pressAction.id;
      if (type === EventType.DISMISSED || actionId === 'reject') {
        stopAlarmSound();
        await clearAlarmNotification();
      }
    });

    // Cada vez que la app vuelve al frente (al abrir o al DESBLOQUEAR), si hay
    // una alarma reciente sin atender, mostramos la pantalla de llamada de una.
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

  // Cuando la navegacion esta lista (incluye el arranque por el intent de
  // pantalla completa), revisamos si hay una alarma pendiente que mostrar.
  async function onNavReady() {
    const pending = await getPendingAlarm();
    if (pending) {
      goToAlarm(pending);
    }
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavReady}>
      <Stack.Navigator initialRouteName="Config">
        <Stack.Screen name="Config" component={ConfigScreen} options={{ title: 'Configuracion' }} />
        <Stack.Screen name="Alarm" component={AlarmScreen} options={{ title: 'Alarma', headerShown: false }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
