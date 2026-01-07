import 'package:flutter/material.dart';
import '../models/pipeline.dart';

class PipelineCard extends StatelessWidget {
  final Pipeline pipeline;
  final VoidCallback? onTap;

  const PipelineCard({super.key, required this.pipeline, this.onTap});

  Color _getColor() {
    switch (pipeline.color) {
      case 'red':
        return const Color(0xFFFF3B30);
      case 'green':
        return const Color(0xFF34C759);
      case 'purple':
        return const Color(0xFFAF52DE);
      case 'orange':
        return const Color(0xFFFF9500);
      case 'pink':
        return const Color(0xFFFF2D55);
      case 'cyan':
        return const Color(0xFF32ADE6);
      case 'indigo':
        return const Color(0xFF5856D6);
      case 'blue':
      default:
        return const Color(0xFF007AFF);
    }
  }

  IconData _getIcon() {
    switch (pipeline.iconType) {
      case 'zap':
        return Icons.flash_on;
      case 'box':
        return Icons.inventory_2;
      case 'link':
        return Icons.link;
      case 'layers':
        return Icons.layers;
      case 'cpu':
        return Icons.memory;
      case 'palette':
        return Icons.palette;
      case 'shield':
        return Icons.shield;
      case 'briefcase':
      default:
        return Icons.work;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    final doneCount = pipeline.steps.where((s) => s.status == 'done').length;
    final totalCount = pipeline.steps.length;
    final progress = totalCount > 0 ? doneCount / totalCount : 0.0;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [color, color.withOpacity(0.7)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_getIcon(), color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pipeline.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        if (pipeline.subtitle != null)
                          Text(
                            pipeline.subtitle!,
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 13,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                  minHeight: 4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$doneCount / $totalCount steps',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
