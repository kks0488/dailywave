class Pipeline {
  final String id;
  final String title;
  final String? subtitle;
  final String color;
  final String iconType;
  final List<PipelineStep> steps;

  Pipeline({
    required this.id,
    required this.title,
    this.subtitle,
    this.color = 'blue',
    this.iconType = 'briefcase',
    this.steps = const [],
  });

  Pipeline copyWith({
    String? id,
    String? title,
    String? subtitle,
    String? color,
    String? iconType,
    List<PipelineStep>? steps,
  }) {
    return Pipeline(
      id: id ?? this.id,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      color: color ?? this.color,
      iconType: iconType ?? this.iconType,
      steps: steps ?? this.steps,
    );
  }

  factory Pipeline.fromJson(Map<String, dynamic> json) {
    return Pipeline(
      id: json['id'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String?,
      color: json['color'] as String? ?? 'blue',
      iconType: json['iconType'] as String? ?? 'briefcase',
      steps:
          (json['steps'] as List<dynamic>?)
              ?.map((e) => PipelineStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'color': color,
      'iconType': iconType,
      'steps': steps.map((e) => e.toJson()).toList(),
    };
  }
}

class PipelineStep {
  final String id;
  final String title;
  final String? description;
  final String status;

  PipelineStep({
    required this.id,
    required this.title,
    this.description,
    this.status = 'pending',
  });

  PipelineStep copyWith({
    String? id,
    String? title,
    String? description,
    String? status,
  }) {
    return PipelineStep(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
    );
  }

  factory PipelineStep.fromJson(Map<String, dynamic> json) {
    return PipelineStep(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
    };
  }
}
