import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const primaryColor = Color(0xFF0D631B);
  static const secondaryColor = Color(0xFF4C616C);
  static const tertiaryColor = Color(0xFF923357);
  static const backgroundColor = Color(0xFFFBF9F1);
  static const surfaceColor = Color(0xFFFBF9F1);
  static const errorColor = Color(0xFFBA1A1A);
  static const onSurfaceColor = Color(0xFF1B1C17);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor,
        tertiary: tertiaryColor,
        surface: surfaceColor,
        error: errorColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onTertiary: Colors.white,
        onSurface: onSurfaceColor,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.manrope(fontWeight: FontWeight.w800),
        displayMedium: GoogleFonts.manrope(fontWeight: FontWeight.w700),
        displaySmall: GoogleFonts.manrope(fontWeight: FontWeight.w600),
        headlineLarge: GoogleFonts.manrope(fontWeight: FontWeight.bold),
        headlineMedium: GoogleFonts.manrope(fontWeight: FontWeight.bold),
        headlineSmall: GoogleFonts.manrope(fontWeight: FontWeight.w600),
        titleLarge: GoogleFonts.manrope(fontWeight: FontWeight.bold),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        color: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: backgroundColor.withOpacity(0.7),
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.manrope(
          color: primaryColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.dark,
        primary: primaryColor,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.manrope(fontWeight: FontWeight.w800),
        headlineLarge: GoogleFonts.manrope(fontWeight: FontWeight.bold),
        titleLarge: GoogleFonts.manrope(fontWeight: FontWeight.bold),
      ),
    );
  }
}

// Retro-compatibility with existing code if it uses these variables
final appTheme = AppTheme.lightTheme;
final appDarkTheme = AppTheme.darkTheme;
