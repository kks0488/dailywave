import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/routine.dart';
import 'storage_provider.dart';

class RoutineNotifier extends StateNotifier<List<Routine>> {
  final StorageService _storage;

  RoutineNotifier(this._storage) : super([]) {
    _loadFromStorage();
  }

  void _loadFromStorage() {
    final saved = _storage.loadRoutines();
    if (saved.isNotEmpty) {
      state = saved;
    } else {
      // Load default data if nothing saved
      state = _defaultRoutines;
    }
    _sortByTime();
  }

  Future<void> _saveToStorage() async {
    await _storage.saveRoutines(state);
  }

  static final List<Routine> _defaultRoutines = [
    Routine(
      id: 'r1',
      title: 'Check emails',
      time: '09:00',
      type: 'morning',
      isDone: false,
    ),
    Routine(
      id: 'r2',
      title: 'Team standup',
      time: '10:00',
      type: 'morning',
      isDone: false,
    ),
    Routine(
      id: 'r3',
      title: 'Review tasks',
      time: '18:00',
      type: 'afternoon',
      isDone: false,
    ),
  ];

  void addRoutine(Routine routine) {
    state = [...state, routine];
    _sortByTime();
    _saveToStorage();
  }

  void removeRoutine(String id) {
    state = state.where((r) => r.id != id).toList();
    _saveToStorage();
  }

  void toggleRoutine(String id) {
    state = state.map((routine) {
      if (routine.id == id) {
        return routine.copyWith(isDone: !routine.isDone);
      }
      return routine;
    }).toList();
    _saveToStorage();
  }

  void updateRoutine(Routine routine) {
    state = state.map((r) => r.id == routine.id ? routine : r).toList();
    _sortByTime();
    _saveToStorage();
  }

  void _sortByTime() {
    state = [...state]..sort((a, b) => a.time.compareTo(b.time));
  }

  void resetDaily() {
    state = state.map((r) => r.copyWith(isDone: false)).toList();
    _saveToStorage();
  }
}

final routineProvider =
    StateNotifierProvider<RoutineNotifier, List<Routine>>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return RoutineNotifier(storage);
});

// Computed providers for filtered lists
final morningRoutinesProvider = Provider<List<Routine>>((ref) {
  final routines = ref.watch(routineProvider);
  return routines.where((r) => r.type == 'morning').toList();
});

final afternoonRoutinesProvider = Provider<List<Routine>>((ref) {
  final routines = ref.watch(routineProvider);
  return routines.where((r) => r.type == 'afternoon').toList();
});
