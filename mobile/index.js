import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import { registerBackgroundHandler } from './src/services/pushService';
import { stopAlarmSound } from './src/services/alarmService';
import { clearAlarmNotification } from './src/services/fullScreenAlarm';
import App from './App';

// Debe registrarse antes de montar la app: es lo que permite que un push
// dispare la alarma aunque la app este cerrada o el celular bloqueado.
registerBackgroundHandler();

// Eventos de la notificacion cuando la app esta en segundo plano/cerrada:
// si el usuario la descarta o toca una accion, callamos la alarma.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const actionId = detail && detail.pressAction && detail.pressAction.id;
  if (type === EventType.DISMISSED || actionId === 'reject') {
    stopAlarmSound();
    await clearAlarmNotification();
  }
});

registerRootComponent(App);
