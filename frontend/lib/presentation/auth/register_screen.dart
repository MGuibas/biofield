import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _register() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).register(_email.text.trim(), _password.text, _name.text.trim());
    } catch (e) {
      setState(() => _error = 'Error al registrarse. Comprueba los datos.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(controller: _name,     decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder())),
              const SizedBox(height: 16),
              TextField(controller: _email,    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()), keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              TextField(controller: _password, decoration: const InputDecoration(labelText: 'Contraseña', border: OutlineInputBorder()), obscureText: true),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _loading ? null : _register,
                child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Registrarse'),
              ),
              TextButton(onPressed: () => context.go('/auth/login'), child: const Text('¿Ya tienes cuenta? Inicia sesión')),
            ],
          ),
        ),
      ),
    );
  }
}
