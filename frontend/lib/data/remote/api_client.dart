import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:frontend/core/constants.dart';

final _storage = FlutterSecureStorage();

// Callback para forzar logout desde el interceptor (evita dependencia circular)
void Function()? _onForceLogout;
void setForceLogoutCallback(void Function() cb) => _onForceLogout = cb;

// Ref global para poder hacer logout desde el interceptor
void setDioContainer(ProviderContainer c) {}

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Evitar bucle infinito en el propio endpoint de refresh
        if (error.requestOptions.path.contains('/auth/refresh')) {
          await _storage.deleteAll();
          _onForceLogout?.call();
          return handler.next(error);
        }
        final refreshToken = await _storage.read(key: 'refresh_token');
        if (refreshToken != null) {
          try {
            final res = await Dio().post(
              '${AppConstants.apiBaseUrl}/auth/refresh',
              data: {'refreshToken': refreshToken},
            );
            final newToken = res.data['accessToken'];
            await _storage.write(key: 'access_token', value: newToken);
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retryRes = await dio.fetch(error.requestOptions);
            return handler.resolve(retryRes);
          } catch (_) {
            await _storage.deleteAll();
            _onForceLogout?.call();
          }
        } else {
          await _storage.deleteAll();
          _onForceLogout?.call();
        }
      }
      handler.next(error);
    },
  ));

  return dio;
});
