import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../domain/models/models.dart';
import '../../presentation/projects/project_map_screen.dart';
import '../../presentation/auth/login_screen.dart';
import '../../presentation/auth/register_screen.dart';
import '../../presentation/projects/projects_screen.dart';
import '../../presentation/projects/project_detail_screen.dart';
import '../../presentation/observations/observation_form_screen.dart';
import '../../presentation/observations/observation_detail_screen.dart';
import '../../presentation/routes/route_recording_screen.dart';
import '../../presentation/routes/route_detail_screen.dart';
import '../../presentation/notes/note_form_screen.dart';
import '../../presentation/auth/profile_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/projects',
    redirect: (context, state) {
      final loggedIn = auth != null;
      final onAuth = state.matchedLocation.startsWith('/auth');
      if (!loggedIn && !onAuth) return '/auth/login';
      if (loggedIn && onAuth) return '/projects';
      return null;
    },
    routes: [
      GoRoute(path: '/auth/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/auth/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(
        path: '/projects',
        builder: (_, __) => const ProjectsScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, state) => ProjectDetailScreen(projectId: state.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'observations/new',
                builder: (_, state) {
                  final extra = state.extra as Map<String, dynamic>?;
                  return ObservationFormScreen(
                    projectId: state.pathParameters['id']!,
                    routeId: extra?['routeId'] as String?,
                  );
                },
              ),
              GoRoute(
                path: 'observations/:obsId/edit',
                builder: (_, state) => ObservationFormScreen(
                  projectId: state.pathParameters['id']!,
                  existing: state.extra as ObservationModel?,
                ),
              ),
              GoRoute(
                path: 'observations/:obsId/view',
                builder: (_, state) => ObservationDetailScreen(observation: state.extra as ObservationModel),
              ),
              GoRoute(
                path: 'routes/:routeId/view',
                builder: (_, state) => RouteDetailScreen(route: state.extra as RouteModel),
              ),
              GoRoute(path: 'routes/record',    builder: (_, state) => RouteRecordingScreen(projectId: state.pathParameters['id']!)),
              GoRoute(path: 'notes/new',        builder: (_, state) => NoteFormScreen(projectId: state.pathParameters['id']!)),
              GoRoute(
                path: 'notes/:noteId/edit',
                builder: (_, state) => NoteFormScreen(
                  projectId: state.pathParameters['id']!,
                  existing: state.extra as NoteModel?,
                ),
              ),
              GoRoute(path: 'map',              builder: (_, state) => ProjectMapScreen(projectId: state.pathParameters['id']!)),
            ],
          ),
        ],
      ),
    ],
  );
});
