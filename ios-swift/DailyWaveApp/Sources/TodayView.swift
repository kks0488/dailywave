import SwiftUI
import SwiftData

struct TodayView: View {
  @Environment(\.modelContext) private var context

  @Query(sort: \Routine.timeHHmm)
  private var routines: [Routine]

  @Query(sort: \Pipeline.position)
  private var pipelines: [Pipeline]

  @State private var focusTarget: FocusTarget?
  @State private var alertMessage: String?

  private var todayKey: String { DateUtils.todayKey() }
  private var nextTarget: (pipeline: Pipeline, step: Step)? { WorkflowEngine.nextTarget(from: pipelines) }

  var body: some View {
    NavigationStack {
      List {
        Section {
          NowCard(
            target: nextTarget,
            onStartFocus: { pipeline, step in
              focusTarget = FocusTarget(pipeline: pipeline, step: step)
            },
            onMarkDone: { pipeline, step in
              markStepDone(pipeline: pipeline, step: step)
            }
          )
        }

        RoutineSection(
          title: "Morning",
          routines: routines.filter { $0.type == .morning }.sorted { $0.timeHHmm < $1.timeHHmm },
          todayKey: todayKey
        )

        RoutineSection(
          title: "Afternoon",
          routines: routines.filter { $0.type == .afternoon }.sorted { $0.timeHHmm < $1.timeHHmm },
          todayKey: todayKey
        )
      }
      .navigationTitle("Today")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          NavigationLink {
            AddRoutineView()
          } label: {
            Image(systemName: "plus.circle.fill")
          }
        }
      }
      .sheet(item: $focusTarget) { target in
        FocusTimerView(
          stepTitle: target.step.title,
          workflowTitle: target.pipeline.title,
          duration: 10 * 60
        ) {
          markStepDone(pipeline: target.pipeline, step: target.step)
        }
      }
      .alert("DailyWave", isPresented: Binding(get: { alertMessage != nil }, set: { _ in alertMessage = nil })) {
        Button("OK", role: .cancel) {}
      } message: {
        Text(alertMessage ?? "")
      }
    }
  }

  private func markStepDone(pipeline: Pipeline, step: Step) {
    WorkflowEngine.setStatus(.done, step: step, in: pipeline)

    let payload: [String: Any] = [
      "pipelineId": pipeline.id.uuidString,
      "pipelineTitle": pipeline.title,
      "stepId": step.id.uuidString,
      "stepTitle": step.title,
    ]
    let payloadJSON = try? JSONSerialization.data(withJSONObject: payload)
    context.insert(HistoryEvent(type: "step_completed", payloadJSON: payloadJSON))

    try? context.save()
    alertMessage = "Nice. One step done."
  }

  private struct FocusTarget: Identifiable {
    var id: UUID { step.id }
    let pipeline: Pipeline
    let step: Step
  }
}

private struct NowCard: View {
  let target: (pipeline: Pipeline, step: Step)?
  let onStartFocus: (Pipeline, Step) -> Void
  let onMarkDone: (Pipeline, Step) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("What's next")
        .font(.headline)
      if let target {
        Text(target.step.title)
          .font(.title3.weight(.semibold))
        Text(target.pipeline.title)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        HStack(spacing: 10) {
          Button {
            onStartFocus(target.pipeline, target.step)
          } label: {
            Label("Start 10 min", systemImage: "timer")
          }
          .buttonStyle(.bordered)

          Button {
            onMarkDone(target.pipeline, target.step)
          } label: {
            Label("Done", systemImage: "checkmark.circle.fill")
          }
          .buttonStyle(.borderedProminent)
        }
        .padding(.top, 4)
      } else {
        Text("Dump your thoughts, then pick one tiny step.")
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }
}

private struct RoutineSection: View {
  @Environment(\.modelContext) private var context
  @EnvironmentObject private var notifications: NotificationManager
  @AppStorage("dw_notifications_enabled") private var notificationsEnabled: Bool = true

  let title: String
  let routines: [Routine]
  let todayKey: String

  var body: some View {
    Section(title) {
      if routines.isEmpty {
        Text("No routines yet.")
          .foregroundStyle(.secondary)
      } else {
        ForEach(routines) { routine in
          RoutineRow(
            routine: routine,
            done: routine.doneDate == todayKey,
            onToggleDone: { toggleRoutineDone(routine) },
            onToggleReminder: { toggleRoutineReminder(routine) }
          )
        }
        .onDelete { offsets in
          for index in offsets {
            context.delete(routines[index])
          }
          try? context.save()
          Task { await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled) }
        }
      }
    }
  }

  private func toggleRoutineDone(_ routine: Routine) {
    let completing = routine.doneDate != todayKey

    routine.updatedAt = Date()
    routine.doneDate = completing ? todayKey : nil

    if completing {
      let payload: [String: Any] = [
        "routineId": routine.id.uuidString,
        "routineTitle": routine.title,
        "time": routine.timeHHmm,
      ]
      let payloadJSON = try? JSONSerialization.data(withJSONObject: payload)
      context.insert(HistoryEvent(type: "routine_completed", payloadJSON: payloadJSON))
    }

    try? context.save()
  }

  private func toggleRoutineReminder(_ routine: Routine) {
    routine.updatedAt = Date()
    routine.reminderEnabled = !routine.reminderEnabled
    try? context.save()
    Task { await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled) }
  }
}

private struct RoutineRow: View {
  let routine: Routine
  let done: Bool
  let onToggleDone: () -> Void
  let onToggleReminder: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      Button(action: onToggleDone) {
        Image(systemName: done ? "checkmark.circle.fill" : "circle")
          .font(.title3)
          .foregroundStyle(done ? .green : .secondary)
      }
      .buttonStyle(.plain)

      VStack(alignment: .leading, spacing: 2) {
        Text(routine.timeHHmm)
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(routine.title)
          .font(.body.weight(.semibold))
      }
      Spacer()

      Image(systemName: routine.reminderEnabled ? "bell.fill" : "bell.slash")
        .foregroundStyle(.secondary)
    }
    .contentShape(Rectangle())
    .contextMenu {
      Button(routine.reminderEnabled ? "Disable reminder" : "Enable reminder") {
        onToggleReminder()
      }
    }
  }
}

struct AddRoutineView: View {
  @Environment(\.modelContext) private var context
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var notifications: NotificationManager

  @AppStorage("dw_notifications_enabled") private var notificationsEnabled: Bool = true

  @State private var title: String = ""
  @State private var time: String = "09:00"
  @State private var type: RoutineType = .morning
  @State private var remindMe: Bool = true
  @State private var alertMessage: String?

  var body: some View {
    Form {
      Section("Routine") {
        TextField("Title", text: $title)
        TextField("Time (HH:MM)", text: $time)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
        Picker("Type", selection: $type) {
          Text("Morning").tag(RoutineType.morning)
          Text("Afternoon").tag(RoutineType.afternoon)
        }
        Toggle("Remind me", isOn: $remindMe)
      }
    }
    .navigationTitle("Add Routine")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("Save") {
          let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
          guard !trimmed.isEmpty else { return }
          guard let normalizedTime = TimeNormalizer.hhmm(time) else {
            alertMessage = "Invalid time. Use HH:MM (24h)."
            return
          }
          let routine = Routine(title: trimmed, timeHHmm: normalizedTime, type: type, reminderEnabled: remindMe)
          context.insert(routine)
          try? context.save()
          Task { await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled) }
          dismiss()
        }
      }
    }
    .alert("DailyWave", isPresented: Binding(get: { alertMessage != nil }, set: { _ in alertMessage = nil })) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(alertMessage ?? "")
    }
  }
}
