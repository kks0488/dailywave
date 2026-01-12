import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../shared/models/pipeline.dart';
import '../../shared/models/routine.dart';

const String _workflowsKey = 'dailywave_workflows';
const String _routinesKey = 'dailywave_routines';

class StorageService {
  final SharedPreferences _prefs;

  StorageService(this._prefs);

  // Workflows
  Future<void> saveWorkflows(List<Pipeline> workflows) async {
    final jsonList = workflows.map((w) => w.toJson()).toList();
    await _prefs.setString(_workflowsKey, jsonEncode(jsonList));
  }

  List<Pipeline> loadWorkflows() {
    final jsonString = _prefs.getString(_workflowsKey);
    if (jsonString == null) return [];

    try {
      final jsonList = jsonDecode(jsonString) as List<dynamic>;
      return jsonList
          .map((e) => Pipeline.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // Routines
  Future<void> saveRoutines(List<Routine> routines) async {
    final jsonList = routines.map((r) => r.toJson()).toList();
    await _prefs.setString(_routinesKey, jsonEncode(jsonList));
  }

  List<Routine> loadRoutines() {
    final jsonString = _prefs.getString(_routinesKey);
    if (jsonString == null) return [];

    try {
      final jsonList = jsonDecode(jsonString) as List<dynamic>;
      return jsonList
          .map((e) => Routine.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // Clear all data
  Future<void> clearAll() async {
    await _prefs.remove(_workflowsKey);
    await _prefs.remove(_routinesKey);
  }
}

// Provider for SharedPreferences
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main.dart');
});

// Provider for StorageService
final storageServiceProvider = Provider<StorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return StorageService(prefs);
});
