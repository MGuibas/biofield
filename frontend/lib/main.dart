import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/notifications.dart';
import 'data/remote/api_client.dart';
import 'data/remote/providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await FMTCObjectBoxBackend().initialise();
    await const FMTCStore('BioFieldCache').manage.create();
  } catch (e) {
    debugPrint('FMTC Init Error: $e');
  }
  await initNotifications();
  final container = ProviderContainer();
  setDioContainer(container);
  setForceLogoutCallback(() => container.read(authProvider.notifier).forceLogout());
  runApp(UncontrolledProviderScope(container: container, child: const BioFieldApp()));
}

class BioFieldApp extends ConsumerWidget {
  const BioFieldApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'BioField',
      theme: appTheme,
      darkTheme: appDarkTheme,
      themeMode: ref.watch(themeModeProvider),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
