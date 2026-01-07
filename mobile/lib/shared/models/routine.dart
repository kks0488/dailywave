class Routine {
  final String id;
  final String title;
  final String time;
  final String type;
  final bool isDone;

  Routine({
    required this.id,
    required this.title,
    required this.time,
    this.type = 'morning',
    this.isDone = false,
  });

  factory Routine.fromJson(Map<String, dynamic> json) {
    return Routine(
      id: json['id'] as String,
      title: json['title'] as String,
      time: json['time'] as String,
      type: json['type'] as String? ?? 'morning',
      isDone: json['done'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'time': time,
      'type': type,
      'done': isDone,
    };
  }

  Routine copyWith({
    String? id,
    String? title,
    String? time,
    String? type,
    bool? isDone,
  }) {
    return Routine(
      id: id ?? this.id,
      title: title ?? this.title,
      time: time ?? this.time,
      type: type ?? this.type,
      isDone: isDone ?? this.isDone,
    );
  }
}
