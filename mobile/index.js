import { registerRootComponent } from 'expo';
import { registerBackgroundHandler } from './src/services/pushService';
import App from './App';

// Debe registrarse antes de montar la app: es lo que permite que un push
// dispare la alarma aunque la app este cerrada o el celular bloqueado.
registerBackgroundHandler();

registerRootComponent(App);
