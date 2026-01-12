import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/pipeline.dart';
import 'storage_provider.dart';

class WorkflowNotifier extends StateNotifier<List<Pipeline>> {
  final StorageService _storage;

  WorkflowNotifier(this._storage) : super([]) {
    _loadFromStorage();
  }

  void _loadFromStorage() {
    final saved = _storage.loadWorkflows();
    if (saved.isNotEmpty) {
      state = saved;
    } else {
      // Load default data if nothing saved
      state = _defaultPipelines;
    }
  }

  Future<void> _saveToStorage() async {
    await _storage.saveWorkflows(state);
  }

  static final List<Pipeline> _defaultPipelines = [
    Pipeline(
      id: '1',
      title: 'Product Launch',
      subtitle: 'Q1 Marketing Campaign',
      color: 'blue',
      iconType: 'briefcase',
      steps: [
        PipelineStep(id: 's1', title: 'Planning', status: 'done'),
        PipelineStep(id: 's2', title: 'Design', status: 'done'),
        PipelineStep(id: 's3', title: 'Development', status: 'active'),
        PipelineStep(id: 's4', title: 'Testing', status: 'pending'),
        PipelineStep(id: 's5', title: 'Launch', status: 'locked'),
      ],
    ),
    Pipeline(
      id: '2',
      title: 'System Architecture',
      subtitle: 'Automation Workflow',
      color: 'green',
      iconType: 'cpu',
      steps: [
        PipelineStep(id: 's1', title: 'Design', status: 'done'),
        PipelineStep(id: 's2', title: 'MVP', status: 'active'),
        PipelineStep(id: 's3', title: 'Integration', status: 'pending'),
      ],
    ),
  ];

  void addPipeline(Pipeline pipeline) {
    state = [...state, pipeline];
    _saveToStorage();
  }

  void removePipeline(String id) {
    state = state.where((p) => p.id != id).toList();
    _saveToStorage();
  }

  void updatePipeline(Pipeline pipeline) {
    state = state.map((p) => p.id == pipeline.id ? pipeline : p).toList();
    _saveToStorage();
  }

  void updateStepStatus(String pipelineId, String stepId, String newStatus) {
    state = state.map((pipeline) {
      if (pipeline.id != pipelineId) return pipeline;

      final updatedSteps = pipeline.steps.map((step) {
        if (step.id == stepId) {
          return step.copyWith(status: newStatus);
        }
        return step;
      }).toList();

      // Auto-activate next step when current is done
      if (newStatus == 'done') {
        final doneIndex = updatedSteps.indexWhere((s) => s.id == stepId);
        if (doneIndex != -1 && doneIndex + 1 < updatedSteps.length) {
          final nextStep = updatedSteps[doneIndex + 1];
          if (nextStep.status == 'pending' || nextStep.status == 'locked') {
            updatedSteps[doneIndex + 1] = nextStep.copyWith(status: 'active');
          }
        }
      }

      return pipeline.copyWith(steps: updatedSteps);
    }).toList();
    _saveToStorage();
  }

  void addStep(String pipelineId, PipelineStep step) {
    state = state.map((pipeline) {
      if (pipeline.id != pipelineId) return pipeline;
      return pipeline.copyWith(steps: [...pipeline.steps, step]);
    }).toList();
    _saveToStorage();
  }

  void removeStep(String pipelineId, String stepId) {
    state = state.map((pipeline) {
      if (pipeline.id != pipelineId) return pipeline;
      return pipeline.copyWith(
        steps: pipeline.steps.where((s) => s.id != stepId).toList(),
      );
    }).toList();
    _saveToStorage();
  }
}

final workflowProvider =
    StateNotifierProvider<WorkflowNotifier, List<Pipeline>>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return WorkflowNotifier(storage);
});
