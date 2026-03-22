import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final notifPlugin = FlutterLocalNotificationsPlugin();
bool _initialized = false;

Future<void> initNotifications() async {
  if (_initialized) return;
  _initialized = true;
  await notifPlugin.initialize(
    settings: const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ),
  );
  await notifPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.requestNotificationsPermission();
}

Future<void> showNotification({required String title, required String body}) async {
  await notifPlugin.show(
    id: DateTime.now().millisecondsSinceEpoch ~/ 1000 % 100000,
    title: title,
    body: body,
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        'biofield_channel', 'BioField',
        channelDescription: 'Notificaciones de actividad',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
      ),
      iOS: DarwinNotificationDetails(),
    ),
  );
}
