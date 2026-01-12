import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/routine_provider.dart';
import '../../../core/providers/workflow_provider.dart';
import '../../../shared/models/pipeline.dart';
import '../../../shared/models/routine.dart';
import '../../../shared/widgets/pipeline_card.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Routines' : 'Workflows'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _showSettings(context),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          _RoutinesTab(),
          _WorkflowsTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _currentIndex == 0
            ? _showAddRoutineDialog(context)
            : _showAddWorkflowDialog(context),
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.schedule_outlined),
            selectedIcon: Icon(Icons.schedule),
            label: 'Routines',
          ),
          NavigationDestination(
            icon: Icon(Icons.view_kanban_outlined),
            selectedIcon: Icon(Icons.view_kanban),
            label: 'Workflows',
          ),
        ],
      ),
    );
  }

  void _showSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => const _SettingsSheet(),
    );
  }

  void _showAddRoutineDialog(BuildContext context) {
    final titleController = TextEditingController();
    TimeOfDay selectedTime = TimeOfDay.now();
    String selectedType = 'morning';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'New Routine',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final time = await showTimePicker(
                          context: context,
                          initialTime: selectedTime,
                        );
                        if (time != null) {
                          setModalState(() => selectedTime = time);
                        }
                      },
                      icon: const Icon(Icons.access_time),
                      label: Text(selectedTime.format(context)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'morning', label: Text('AM')),
                      ButtonSegment(value: 'afternoon', label: Text('PM')),
                    ],
                    selected: {selectedType},
                    onSelectionChanged: (value) {
                      setModalState(() => selectedType = value.first);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () {
                  if (titleController.text.isNotEmpty) {
                    final timeStr =
                        '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';
                    ref.read(routineProvider.notifier).addRoutine(
                          Routine(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            title: titleController.text,
                            time: timeStr,
                            type: selectedType,
                            isDone: false,
                          ),
                        );
                    Navigator.pop(context);
                  }
                },
                child: const Text('Add Routine'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddWorkflowDialog(BuildContext context) {
    final titleController = TextEditingController();
    final subtitleController = TextEditingController();
    String selectedColor = 'blue';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'New Workflow',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: subtitleController,
                decoration: const InputDecoration(
                  labelText: 'Subtitle (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: ['blue', 'green', 'red', 'purple', 'orange']
                    .map((color) => ChoiceChip(
                          label: Text(color),
                          selected: selectedColor == color,
                          onSelected: (selected) {
                            if (selected) {
                              setModalState(() => selectedColor = color);
                            }
                          },
                        ))
                    .toList(),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () {
                  if (titleController.text.isNotEmpty) {
                    ref.read(workflowProvider.notifier).addPipeline(
                          Pipeline(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            title: titleController.text,
                            subtitle: subtitleController.text.isNotEmpty
                                ? subtitleController.text
                                : null,
                            color: selectedColor,
                            iconType: 'briefcase',
                            steps: [
                              PipelineStep(
                                id: 's1',
                                title: 'Start',
                                status: 'active',
                              ),
                            ],
                          ),
                        );
                    Navigator.pop(context);
                  }
                },
                child: const Text('Create Workflow'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoutinesTab extends ConsumerWidget {
  const _RoutinesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final morningRoutines = ref.watch(morningRoutinesProvider);
    final afternoonRoutines = ref.watch(afternoonRoutinesProvider);

    if (morningRoutines.isEmpty && afternoonRoutines.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.schedule_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No routines yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Tap + to add your first routine',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (morningRoutines.isNotEmpty) ...[
          _SectionHeader(title: 'Morning', icon: Icons.wb_sunny_outlined),
          const SizedBox(height: 8),
          ...morningRoutines.map((r) => _RoutineItem(routine: r)),
          const SizedBox(height: 24),
        ],
        if (afternoonRoutines.isNotEmpty) ...[
          _SectionHeader(title: 'Afternoon', icon: Icons.wb_twilight_outlined),
          const SizedBox(height: 8),
          ...afternoonRoutines.map((r) => _RoutineItem(routine: r)),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;

  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[600],
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

class _RoutineItem extends ConsumerWidget {
  final Routine routine;

  const _RoutineItem({required this.routine});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: Key(routine.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        ref.read(routineProvider.notifier).removeRoutine(routine.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${routine.title} deleted'),
            action: SnackBarAction(
              label: 'Undo',
              onPressed: () {
                ref.read(routineProvider.notifier).addRoutine(routine);
              },
            ),
          ),
        );
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4),
        child: InkWell(
          onTap: () {
            ref.read(routineProvider.notifier).toggleRoutine(routine.id);
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _CheckCircle(isDone: routine.isDone),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        routine.title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          decoration:
                              routine.isDone ? TextDecoration.lineThrough : null,
                          color: routine.isDone ? Colors.grey : null,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        routine.time,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CheckCircle extends StatelessWidget {
  final bool isDone;

  const _CheckCircle({required this.isDone});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isDone ? const Color(0xFF34C759) : Colors.grey.shade400,
          width: 2,
        ),
        color: isDone ? const Color(0xFF34C759) : Colors.transparent,
      ),
      child: isDone
          ? const Icon(Icons.check, size: 16, color: Colors.white)
          : null,
    );
  }
}

class _WorkflowsTab extends ConsumerWidget {
  const _WorkflowsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pipelines = ref.watch(workflowProvider);

    if (pipelines.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.view_kanban_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No workflows yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Tap + to create your first workflow',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pipelines.length,
      itemBuilder: (context, index) {
        final pipeline = pipelines[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Dismissible(
            key: Key(pipeline.id),
            direction: DismissDirection.endToStart,
            onDismissed: (_) {
              ref.read(workflowProvider.notifier).removePipeline(pipeline.id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${pipeline.title} deleted'),
                  action: SnackBarAction(
                    label: 'Undo',
                    onPressed: () {
                      ref.read(workflowProvider.notifier).addPipeline(pipeline);
                    },
                  ),
                ),
              );
            },
            background: Container(
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 16),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.delete, color: Colors.white),
            ),
            child: PipelineCard(
              pipeline: pipeline,
              onTap: () => _showPipelineDetail(context, ref, pipeline),
            ),
          ),
        );
      },
    );
  }

  void _showPipelineDetail(
      BuildContext context, WidgetRef ref, Pipeline pipeline) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => _PipelineDetailSheet(
          pipeline: pipeline,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

class _PipelineDetailSheet extends ConsumerStatefulWidget {
  final Pipeline pipeline;
  final ScrollController scrollController;

  const _PipelineDetailSheet({
    required this.pipeline,
    required this.scrollController,
  });

  @override
  ConsumerState<_PipelineDetailSheet> createState() =>
      _PipelineDetailSheetState();
}

class _PipelineDetailSheetState extends ConsumerState<_PipelineDetailSheet> {
  @override
  Widget build(BuildContext context) {
    final pipeline = ref.watch(workflowProvider).firstWhere(
          (p) => p.id == widget.pipeline.id,
          orElse: () => widget.pipeline,
        );

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pipeline.title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (pipeline.subtitle != null)
                        Text(
                          pipeline.subtitle!,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: () => _addStep(context),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: ListView.builder(
              controller: widget.scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: pipeline.steps.length,
              itemBuilder: (context, index) {
                final step = pipeline.steps[index];
                return _StepItem(
                  step: step,
                  pipelineId: pipeline.id,
                  isLast: index == pipeline.steps.length - 1,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _addStep(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Step'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Step name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                ref.read(workflowProvider.notifier).addStep(
                      widget.pipeline.id,
                      PipelineStep(
                        id: DateTime.now().millisecondsSinceEpoch.toString(),
                        title: controller.text,
                        status: 'pending',
                      ),
                    );
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _StepItem extends ConsumerWidget {
  final PipelineStep step;
  final String pipelineId;
  final bool isLast;

  const _StepItem({
    required this.step,
    required this.pipelineId,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _getStatusColor(step.status);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            GestureDetector(
              onTap: () => _cycleStatus(ref),
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withOpacity(0.2),
                  border: Border.all(color: color, width: 2),
                ),
                child: step.status == 'done'
                    ? Icon(Icons.check, size: 18, color: color)
                    : step.status == 'active'
                        ? Icon(Icons.play_arrow, size: 18, color: color)
                        : null,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: Colors.grey[300],
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    decoration:
                        step.status == 'done' ? TextDecoration.lineThrough : null,
                    color: step.status == 'done' ? Colors.grey : null,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getStatusLabel(step.status),
                  style: TextStyle(
                    fontSize: 12,
                    color: color,
                  ),
                ),
                SizedBox(height: isLast ? 0 : 24),
              ],
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline, size: 20),
          onPressed: () {
            ref.read(workflowProvider.notifier).removeStep(pipelineId, step.id);
          },
        ),
      ],
    );
  }

  void _cycleStatus(WidgetRef ref) {
    final newStatus = switch (step.status) {
      'pending' => 'active',
      'active' => 'done',
      'done' => 'pending',
      'locked' => 'active',
      _ => 'pending',
    };
    ref
        .read(workflowProvider.notifier)
        .updateStepStatus(pipelineId, step.id, newStatus);
  }

  Color _getStatusColor(String status) {
    return switch (status) {
      'done' => const Color(0xFF34C759),
      'active' => const Color(0xFF007AFF),
      'pending' => Colors.grey,
      'locked' => Colors.grey.shade400,
      _ => Colors.grey,
    };
  }

  String _getStatusLabel(String status) {
    return switch (status) {
      'done' => 'Completed',
      'active' => 'In Progress',
      'pending' => 'Pending',
      'locked' => 'Locked',
      _ => status,
    };
  }
}

class _SettingsSheet extends StatelessWidget {
  const _SettingsSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Settings',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark Mode'),
            subtitle: const Text('System default'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.language_outlined),
            title: const Text('Language'),
            subtitle: const Text('English'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.backup_outlined),
            title: const Text('Backup & Restore'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
