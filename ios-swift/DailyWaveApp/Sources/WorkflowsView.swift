import Foundation
import SwiftUI
import SwiftData

struct WorkflowsView: View {
  @EnvironmentObject private var navigation: AppNavigationModel
  @Environment(\.modelContext) private var context

  @Query(sort: \Pipeline.position)
  private var pipelines: [Pipeline]

  @State private var isAddOpen = false

  var body: some View {
    NavigationStack(path: $navigation.workflowsPath) {
      List {
        if pipelines.isEmpty {
          ContentUnavailableView(
            "No workflows yet",
            systemImage: "square.stack.3d.up.fill",
            description: Text("Create one small workflow to start.")
          )
        } else {
          ForEach(pipelines) { pipeline in
            NavigationLink(value: pipeline.id) {
              PipelineRow(pipeline: pipeline)
            }
          }
          .onDelete(perform: deletePipelines)
        }
      }
      .navigationTitle("Workflows")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            isAddOpen = true
          } label: {
            Image(systemName: "plus.circle.fill")
          }
        }
      }
      .sheet(isPresented: $isAddOpen) {
        NavigationStack { AddPipelineView() }
      }
      .navigationDestination(for: UUID.self) { pipelineId in
        PipelineDetailView(pipelineId: pipelineId)
      }
    }
  }

  private func deletePipelines(at offsets: IndexSet) {
    for index in offsets {
      context.delete(pipelines[index])
    }
    try? context.save()
  }
}

private struct PipelineRow: View {
  let pipeline: Pipeline

  private var progressText: String {
    let steps = pipeline.steps
    if steps.isEmpty { return "0 / 0" }
    let done = steps.filter { $0.status == .done }.count
    return "\(done) / \(steps.count)"
  }

  private var progress: Double {
    let steps = pipeline.steps
    guard !steps.isEmpty else { return 0 }
    let done = Double(steps.filter { $0.status == .done }.count)
    return done / Double(steps.count)
  }

  var body: some View {
    HStack(spacing: 12) {
      ZStack {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .fill(DesignTokens.color(for: pipeline.color))
          .frame(width: 44, height: 44)
        Image(systemName: DesignTokens.iconName(for: pipeline.iconType))
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: 3) {
        Text(pipeline.title)
          .font(.headline)
        if !pipeline.subtitle.isEmpty {
          Text(pipeline.subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        ProgressView(value: progress)
          .tint(DesignTokens.color(for: pipeline.color))
      }
      Spacer()
      Text(progressText)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
    }
    .padding(.vertical, 6)
  }
}

struct AddPipelineView: View {
  @Environment(\.modelContext) private var context
  @Environment(\.dismiss) private var dismiss

  @Query(sort: \Pipeline.position)
  private var pipelines: [Pipeline]

  @State private var title: String = ""
  @State private var subtitle: String = ""
  @State private var color: String = "blue"
  @State private var iconType: String = "briefcase"

  private let colors = ["blue", "red", "green", "purple", "orange", "pink", "cyan", "teal", "indigo", "yellow"]
  private let iconTypes = ["briefcase", "zap", "box", "link", "palette", "sun"]

  var body: some View {
    Form {
      Section("Workflow") {
        TextField("Title", text: $title)
        TextField("Subtitle", text: $subtitle)
      }

      Section("Style") {
        Picker("Color", selection: $color) {
          ForEach(colors, id: \.self) { c in
            Text(c.capitalized).tag(c)
          }
        }
        Picker("Icon", selection: $iconType) {
          ForEach(iconTypes, id: \.self) { icon in
            Text(icon).tag(icon)
          }
        }
      }
    }
    .navigationTitle("New Workflow")
    .toolbar {
      ToolbarItem(placement: .topBarLeading) {
        Button("Cancel") { dismiss() }
      }
      ToolbarItem(placement: .topBarTrailing) {
        Button("Create") {
          let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
          guard !trimmed.isEmpty else { return }

          let nextPosition = (pipelines.map { $0.position }.max() ?? -1) + 1
          let pipeline = Pipeline(
            title: trimmed,
            subtitle: subtitle.trimmingCharacters(in: .whitespacesAndNewlines),
            color: color,
            iconType: iconType,
            position: nextPosition
          )

          let start = Step(title: "Start", status: .active, position: 0, pipeline: pipeline)
          let finish = Step(title: "Finish", status: .locked, position: 1, pipeline: pipeline)
          pipeline.steps = [start, finish]

          context.insert(pipeline)
          try? context.save()
          dismiss()
        }
      }
    }
  }
}

struct PipelineDetailView: View {
  @Environment(\.modelContext) private var context

  let pipelineId: UUID
  @State private var pipeline: Pipeline?
  @State private var isAddStepOpen = false

  var body: some View {
    Group {
      if let pipeline {
        List {
          Section {
            VStack(alignment: .leading, spacing: 6) {
              Text(pipeline.title).font(.title3.weight(.semibold))
              if !pipeline.subtitle.isEmpty {
                Text(pipeline.subtitle).foregroundStyle(.secondary)
              }
            }
          }

          Section("Steps") {
            let steps = pipeline.steps.sorted { $0.position < $1.position }
            ForEach(steps) { step in
              StepRow(step: step, onSetStatus: { newStatus in
                setStatus(newStatus, step: step, in: pipeline)
              })
            }
            .onDelete { offsets in
              deleteSteps(offsets, from: pipeline)
            }

            Button {
              isAddStepOpen = true
            } label: {
              Label("Add step", systemImage: "plus")
            }
          }
        }
        .navigationTitle("Workflow")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { ensureActiveStep(in: pipeline) }
        .sheet(isPresented: $isAddStepOpen) {
          NavigationStack {
            AddStepView(pipeline: pipeline)
          }
        }
      } else {
        ProgressView()
          .task { await loadPipeline() }
      }
    }
  }

  private func loadPipeline() async {
    do {
      let descriptor = FetchDescriptor<Pipeline>(predicate: #Predicate { $0.id == pipelineId })
      pipeline = try context.fetch(descriptor).first
    } catch {
      pipeline = nil
    }
  }

  private func deleteSteps(_ offsets: IndexSet, from pipeline: Pipeline) {
    let steps = pipeline.steps.sorted { $0.position < $1.position }
    for idx in offsets {
      context.delete(steps[idx])
    }
    normalizePositions(in: pipeline)
    try? context.save()
  }

  private func normalizePositions(in pipeline: Pipeline) {
    let sorted = pipeline.steps.sorted { $0.position < $1.position }
    for (idx, step) in sorted.enumerated() {
      step.position = idx
      step.updatedAt = Date()
    }
    pipeline.updatedAt = Date()
  }

  private func ensureActiveStep(in pipeline: Pipeline) {
    let steps = pipeline.steps.sorted { $0.position < $1.position }
    if steps.contains(where: { $0.status == .active }) { return }
    if let firstNotDone = steps.first(where: { $0.status != .done }) {
      setStatus(.active, step: firstNotDone, in: pipeline)
    }
  }

  private func setStatus(_ status: StepStatus, step: Step, in pipeline: Pipeline) {
    WorkflowEngine.setStatus(status, step: step, in: pipeline)

    if status == .done {
      let payload: [String: Any] = [
        "pipelineId": pipeline.id.uuidString,
        "pipelineTitle": pipeline.title,
        "stepId": step.id.uuidString,
        "stepTitle": step.title,
      ]
      let payloadJSON = try? JSONSerialization.data(withJSONObject: payload)
      context.insert(HistoryEvent(type: "step_completed", payloadJSON: payloadJSON))
    }

    try? context.save()
  }
}

private struct StepRow: View {
  let step: Step
  let onSetStatus: (StepStatus) -> Void

  private var statusLabel: String {
    switch step.status {
    case .active: return "Active"
    case .pending: return "Pending"
    case .locked: return "Locked"
    case .done: return "Done"
    }
  }

  private var statusColor: Color {
    switch step.status {
    case .done: return .secondary
    case .active: return .blue
    case .pending: return .gray
    case .locked: return .red
    }
  }

  var body: some View {
    HStack(spacing: 10) {
      Circle()
        .fill(statusColor.opacity(0.2))
        .frame(width: 10, height: 10)

      Text(step.title)
        .font(.body.weight(.semibold))

      Spacer()

      Text(statusLabel)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
    }
    .contextMenu {
      ForEach(StepStatus.allCases, id: \.rawValue) { s in
        Button(s.rawValue.capitalized) { onSetStatus(s) }
      }
    }
  }
}

struct AddStepView: View {
  @Environment(\.modelContext) private var context
  @Environment(\.dismiss) private var dismiss

  let pipeline: Pipeline
  @State private var title: String = ""

  var body: some View {
    Form {
      TextField("Step title", text: $title)
    }
    .navigationTitle("Add Step")
    .toolbar {
      ToolbarItem(placement: .topBarLeading) {
        Button("Cancel") { dismiss() }
      }
      ToolbarItem(placement: .topBarTrailing) {
        Button("Add") {
          let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
          guard !trimmed.isEmpty else { return }
          let nextPos = (pipeline.steps.map { $0.position }.max() ?? -1) + 1
          let step = Step(title: trimmed, status: .locked, position: nextPos, pipeline: pipeline)
          pipeline.steps.append(step)
          pipeline.updatedAt = Date()
          try? context.save()
          dismiss()
        }
      }
    }
  }
}
