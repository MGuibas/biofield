import 'dart:convert';

class UserModel {
  final String accessToken;
  final String refreshToken;
  final String userId;
  final String displayName;
  final String? email;
  final String? avatarUrl;
  final String? speciality;
  final String? institution;

  UserModel({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.displayName,
    this.email,
    this.avatarUrl,
    this.speciality,
    this.institution,
  });

  factory UserModel.fromJson(Map<String, dynamic> j) => UserModel(
        accessToken: j['accessToken'] ?? '',
        refreshToken: j['refreshToken'] ?? '',
        userId: (j['userId'] ?? j['id'] ?? '').toString(),
        displayName: j['displayName'] ?? '',
        email: j['email'],
        avatarUrl: j['avatarUrl'],
        speciality: j['speciality'],
        institution: j['institution'],
      );

  UserModel copyWith({String? avatarUrl, String? displayName, String? speciality, String? institution}) => UserModel(
        accessToken: accessToken,
        refreshToken: refreshToken,
        userId: userId,
        displayName: displayName ?? this.displayName,
        email: email,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        speciality: speciality ?? this.speciality,
        institution: institution ?? this.institution,
      );
}

class ProjectModel {
  final String id;
  final String name;
  final String? description;
  final String shareCode;
  final bool isArchived;
  final int memberCount;

  ProjectModel({
    required this.id,
    required this.name,
    this.description,
    required this.shareCode,
    required this.isArchived,
    required this.memberCount,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> j) => ProjectModel(
        id: j['id'],
        name: j['name'],
        description: j['description'],
        shareCode: j['shareCode'],
        isArchived: j['isArchived'] ?? false,
        memberCount: j['memberCount'] ?? 0,
      );
}

class ObservationModel {
  final String id;
  final String projectId;
  final String? routeId;
  final String taxonName;
  final int? taxonId;
  final String? title;
  final String? description;
  final double latitude;
  final double longitude;
  final double? altitude;
  final DateTime observedAt;
  final List<String> photos;
  final String? notes;
  final int quantity;
  final List<String> tags;
  final String? weatherCondition;
  final double? temperature;
  final double? humidity;
  final String? habitatDescription;
  final String? habitatPhotoUrl;
  final String syncStatus;
  final String? photosJson;
  final String? tagsJson;

  ObservationModel({
    required this.id,
    required this.projectId,
    this.routeId,
    required this.taxonName,
    this.taxonId,
    this.title,
    this.description,
    required this.latitude,
    required this.longitude,
    this.altitude,
    required this.observedAt,
    this.photos = const [],
    this.notes,
    required this.quantity,
    this.tags = const [],
    this.weatherCondition,
    this.temperature,
    this.humidity,
    this.habitatDescription,
    this.habitatPhotoUrl,
    required this.syncStatus,
    this.photosJson,
    this.tagsJson,
  });

  factory ObservationModel.fromJson(Map<String, dynamic> j) {
    List<String> parseList(dynamic v) {
      if (v == null) return [];
      if (v is List) return v.map((e) => e.toString()).toList();
      if (v is String && v.isNotEmpty) {
        try {
          final decoded = jsonDecode(v) as List;
          return decoded.map((e) => e.toString()).toList();
        } catch (_) { return []; }
      }
      return [];
    }
    return ObservationModel(
      id: j['id'],
      projectId: j['projectId'],
      routeId: j['routeId'],
      taxonName: j['taxonName'],
      taxonId: j['taxonId'],
      title: j['title'],
      description: j['description'],
      latitude: (j['latitude'] as num).toDouble(),
      longitude: (j['longitude'] as num).toDouble(),
      altitude: j['altitude'] != null ? (j['altitude'] as num).toDouble() : null,
      observedAt: DateTime.parse(j['observedAt']),
      photos: parseList(j['photosJson']),
      notes: j['notes'],
      quantity: j['quantity'] ?? 1,
      tags: parseList(j['tagsJson']),
      weatherCondition: j['weatherCondition'],
      temperature: j['temperature'] != null ? (j['temperature'] as num).toDouble() : null,
      humidity: j['humidity'] != null ? (j['humidity'] as num).toDouble() : null,
      habitatDescription: j['habitatDescription'],
      habitatPhotoUrl: j['habitatPhotoUrl'],
      syncStatus: j['syncStatus'] ?? 'Local',
    );
  }
}

class RouteModel {
  final String id;
  final String projectId;
  final String name;
  final DateTime startedAt;
  final DateTime? endedAt;
  final double distanceMeters;
  final String? trackPointsJson;

  RouteModel({
    required this.id,
    required this.projectId,
    required this.name,
    required this.startedAt,
    this.endedAt,
    required this.distanceMeters,
    this.trackPointsJson,
  });

  factory RouteModel.fromJson(Map<String, dynamic> j) => RouteModel(
        id: j['id'],
        projectId: j['projectId'],
        name: j['name'],
        startedAt: DateTime.parse(j['startedAt']),
        endedAt: j['endedAt'] != null ? DateTime.parse(j['endedAt']) : null,
        distanceMeters: (j['distanceMeters'] as num).toDouble(),
        trackPointsJson: j['trackPointsJson'],
      );
}

class TaxonModel {
  final int id;
  final String name;
  final String? commonName;
  final String? rank;
  final String? photoUrl;

  TaxonModel({
    required this.id,
    required this.name,
    this.commonName,
    this.rank,
    this.photoUrl,
  });

  factory TaxonModel.fromJson(Map<String, dynamic> j) => TaxonModel(
        id: j['id'],
        name: j['name'],
        commonName: j['commonName'],
        rank: j['rank'],
        photoUrl: j['photoUrl'],
      );
}

class CommentModel {
  final String id;
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String body;
  final DateTime createdAt;

  CommentModel({
    required this.id,
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.body,
    required this.createdAt,
  });

  factory CommentModel.fromJson(Map<String, dynamic> j) => CommentModel(
        id: j['id'].toString(),
        userId: j['userId'].toString(),
        displayName: j['displayName'],
        avatarUrl: j['avatarUrl'],
        body: j['body'],
        createdAt: DateTime.parse(j['createdAt']),
      );
}

class ActivityItemModel {
  final String? id; // Activity log id itself
  final String? itemId; // Target object id (observation id, etc)
  final String type;
  final String actorName;
  final String? avatarUrl;
  final String? actorAvatarUrl;
  final String? photoUrl;
  final String description;
  final DateTime occurredAt;

  ActivityItemModel({
    this.id,
    this.itemId,
    required this.type,
    required this.actorName,
    this.avatarUrl,
    this.actorAvatarUrl,
    this.photoUrl,
    required this.description,
    required this.occurredAt,
  });

  factory ActivityItemModel.fromJson(Map<String, dynamic> j) {
    String? extractPhoto(Map<String, dynamic> map) {
      if (map['photoUrl'] != null) return map['photoUrl'].toString();
      if (map['itemPhotoUrl'] != null) return map['itemPhotoUrl'].toString();
      if (map['observationPhotoUrl'] != null) return map['observationPhotoUrl'].toString();
      if (map['habitatPhotoUrl'] != null) return map['habitatPhotoUrl'].toString();
      if (map['photo'] != null) return map['photo'].toString();
      if (map['image'] != null) return map['image'].toString();
      
      // Check photosJson if it exists and pick first
      final pjson = map['photosJson'];
      if (pjson != null && pjson is String && pjson.isNotEmpty) {
        try {
          final list = jsonDecode(pjson) as List;
          if (list.isNotEmpty) return list.first.toString();
        } catch (_) {}
      }
      return null;
    }

    return ActivityItemModel(
      id: j['id']?.toString(),
      itemId: j['itemId']?.toString() ?? j['targetId']?.toString() ?? j['observationId']?.toString(),
      type: j['type'],
      actorName: j['actorName'],
      avatarUrl: j['avatarUrl'] ?? j['actorAvatarUrl'],
      actorAvatarUrl: j['actorAvatarUrl'] ?? j['avatarUrl'],
      photoUrl: extractPhoto(j),
      description: j['description'],
      occurredAt: DateTime.parse(j['occurredAt']),
    );
  }
}

class MemberModel {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String role;
  final DateTime joinedAt;

  MemberModel({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    required this.joinedAt,
  });

  factory MemberModel.fromJson(Map<String, dynamic> j) => MemberModel(
        userId: j['userId'].toString(),
        displayName: j['displayName'],
        avatarUrl: j['avatarUrl'],
        role: j['role'],
        joinedAt: DateTime.parse(j['joinedAt']),
      );
}

class NoteModel {
  final String id;
  final String projectId;
  final String title;
  final String body;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;

  NoteModel({
    required this.id,
    required this.projectId,
    required this.title,
    required this.body,
    this.latitude,
    this.longitude,
    required this.createdAt,
  });

  factory NoteModel.fromJson(Map<String, dynamic> j) => NoteModel(
        id: j['id'],
        projectId: j['projectId'],
        title: j['title'],
        body: j['body'],
        latitude: j['latitude'] != null ? (j['latitude'] as num).toDouble() : null,
        longitude: j['longitude'] != null ? (j['longitude'] as num).toDouble() : null,
        createdAt: DateTime.parse(j['createdAt']),
      );
}
