import 'package:flutter/material.dart';
import '../../../shared/models/pipeline.dart';
import '../../../shared/models/routine.dart';
import '../../../shared/widgets/pipeline_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final List<Pipeline> _pipelines = [
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

  final List<Routine> _routines = [
    Routine(
      id: 'r1',
      title: 'Check emails',
      time: '09:00',
      type: 'morning',
      isDone: true,
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

  @override
  Widget build(BuildContext context) {
    final morningRoutines = _routines
        .where((r) => r.type == 'morning')
        .toList();
    final afternoonRoutines = _routines
        .where((r) => r.type == 'afternoon')
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('DailyWave'),
        actions: [
          IconButton(
            icon: const Icon(Icons.dark_mode_outlined),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Row(
        children: [
          Container(
            width: 280,
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(right: BorderSide(color: Colors.grey.shade200)),
            ),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Morning Routine',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                ...morningRoutines.map((r) => _buildRoutineItem(r)),
                const SizedBox(height: 24),
                Text(
                  'Afternoon Routine',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                ...afternoonRoutines.map((r) => _buildRoutineItem(r)),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Workflows',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('New Workflow'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: GridView.builder(
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 400,
                            childAspectRatio: 2.0,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                          ),
                      itemCount: _pipelines.length,
                      itemBuilder: (context, index) {
                        return PipelineCard(
                          pipeline: _pipelines[index],
                          onTap: () {},
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoutineItem(Routine routine) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: () {
          setState(() {
            final index = _routines.indexWhere((r) => r.id == routine.id);
            if (index != -1) {
              _routines[index] = routine.copyWith(isDone: !routine.isDone);
            }
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: routine.isDone
                        ? const Color(0xFF34C759)
                        : Colors.grey.shade400,
                    width: 2,
                  ),
                  color: routine.isDone
                      ? const Color(0xFF34C759)
                      : Colors.transparent,
                ),
                child: routine.isDone
                    ? const Icon(Icons.check, size: 12, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      routine.time,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      routine.title,
                      style: TextStyle(
                        fontSize: 14,
                        decoration: routine.isDone
                            ? TextDecoration.lineThrough
                            : null,
                        color: routine.isDone ? Colors.grey : null,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
