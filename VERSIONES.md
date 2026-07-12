# TelegramAlarm — Versiones

Este repositorio contiene **DOS proyectos que NO deben mezclarse**.

---

## ✅ VERSIÓN PERSONAL (esta) — la de Camilo, para uso propio

**Estado: CERRADA / FINAL — pendiente solo de revisión y comprobación en uso.**

Es la app hecha a la medida para el dueño, con todo lo probado y aprobado:

- Lee **su propia cuenta de Telegram** (userbot Telethon) — no requiere ser admin del canal.
- Backend único (un solo usuario): su cuenta, su configuración, su dispositivo.
- **Multi-canal**: uno o varios canales, cada uno con sus palabras y su texto de alerta.
- Alarma: suena (máx. 2 veces / tope duro 15 s, auto-apagado nativo), notificación de
  pantalla completa (Notifee) que muestra la alerta sobre el bloqueo, y pantalla de
  llamada al abrir/desbloquear.
- 3 pestañas: **Inicio**, **Configurar**, **Estado** (con historial y "borrar todo").
- Diseño oscuro premium (tema, degradados).

**Cómo mantenerla funcionando:**
1. Compilar: `eas build -p android --profile preview` e instalar el APK.
2. Configurar los canales reales en la app.
3. **Mantener el backend despierto** con cron-job.org (ping cada 10 min a `/api/health`);
   si no, Render (plan gratis) se duerme y borra la configuración.
4. En Android: Batería "Sin restricciones" + "Notificaciones de pantalla completa" activadas.

**Punto fijo en git:** etiqueta `v1.0-personal` (volver con `git checkout v1.0-personal`).

---

## 💼 VERSIÓN COMERCIAL (futura) — OTRO software, aparte

**Estado: NO iniciada. Es un rediseño, no "unos pasos más".**

Para publicar en Google Play y vender a muchos usuarios, esta versión personal NO sirve
tal cual (ver detalle abajo). Cuando se haga, será **un proyecto separado** para no
confundir con la versión personal.

Cambios de fondo que exige:
- **Arquitectura multiusuario**: login y datos aislados por usuario (no un solo backend).
- **Salir del userbot**: no se puede guardar la sesión de Telegram de cada usuario en el
  servidor (privacidad + términos de Telegram). Volver a la vía "bot" (requiere admin del
  canal) u otro modelo.
- **Requisitos de Play Store**: cuenta de desarrollador (25 USD), build AAB firmado,
  política de privacidad, formulario de Seguridad de los Datos, clasificación de contenido,
  ficha de tienda (capturas, ícono 512, gráfico 1024×500), justificación de permisos.
- **Backend de producción** real (con base de datos persistente, no plan gratis).
- Limpiar permisos de teléfono heredados de CallKeep (ya no se usan).

---

_Regla: la versión personal se toca solo para mantenerla. La comercial se construye
aparte cuando se decida, sin arrastrar los atajos de la personal._
