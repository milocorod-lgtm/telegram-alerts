import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ConfigScreen from './src/screens/ConfigScreen';
import AlarmScreen from './src/screens/AlarmScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { initPush, onForegroundAlarm } from './src/services/pushService';
import { setupCallKeep, addCallKeepListeners } from './src/services/alarmService';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  useEffect(() => {
    setupCallKeep();
    initPush().catch(() => {});

    addCallKeepListeners({
      onAnswer: () => {
        if (navigationRef.isReady()) navigationRef.navigate('Config');
      },
      onEnd: () => {
        if (navigationRef.isReady()) navigationRef.navigate('Config');
      },
    });

    const unsubscribe = onForegroundAlarm((remoteMessage) => {
      const data = remoteMessage.data || {};
      if (navigationRef.isReady()) {
        navigationRef.navigate('Alarm', {
          chatName: data.chat_name,
          keyword: data.keyword,
          triggered: true,
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Config">
        <Stack.Screen name="Config" component={ConfigScreen} options={{ title: 'Configuracion' }} />
        <Stack.Screen name="Alarm" component={AlarmScreen} options={{ title: 'Alarma', headerShown: false }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
