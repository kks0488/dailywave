import Foundation
import SwiftData

@MainActor
final class ChaosApplyService {
  private let context: ModelContext

  init(context: ModelContext) {
    self.context = context
  }

  func apply(parsed: ChaosParseResult, existingPipelines: [Pipeline], existingRoutines: [Routine]) -> ChaosAppliedResult {
    let existingWorkflowTitles = Set(existingPipelines.map { $0.title.lowercased() })
    let existingRoutineKeys = Set(existingRoutines.map { "\($0.title.lowercased())|\($0.timeHHmm)" })

    var workflowsApplied = 0
    var routinesApplied = 0
    var skippedWorkflows = 0
    var skippedRoutines = 0
    var createdPipelineIds: [UUID] = []

    let maxPosition = (existingPipelines.map { $0.position }.max() ?? -1)
    var positionCursor = maxPosition + 1

    for wf in parsed.workflows {
      let title = wf.title.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !title.isEmpty else { continue }

      if existingWorkflowTitles.contains(title.lowercased()) {
        skippedWorkflows += 1
        continue
      }

      let pipeline = Pipeline(
        title: title,
        subtitle: wf.subtitle ?? "",
        color: "blue",
        iconType: "briefcase",
        position: positionCursor
      )
      positionCursor += 1

      let stepTitles = wf.steps
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
      let finalStepTitles = stepTitles.isEmpty ? ["Start", "Finish"] : stepTitles

      var steps: [Step] = []
      for (idx, s) in finalStepTitles.enumerated() {
        let status: StepStatus = (idx == 0) ? .active : .locked
        steps.append(Step(title: s, status: status, position: idx, pipeline: pipeline))
      }
      pipeline.steps = steps

      context.insert(pipeline)
      createdPipelineIds.append(pipeline.id)
      workflowsApplied += 1
    }

    for r in parsed.routines {
      let title = r.title.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !title.isEmpty else { continue }

      let time = TimeNormalizer.hhmm(r.time) ?? "09:00"
      let key = "\(title.lowercased())|\(time)"
      if existingRoutineKeys.contains(key) {
        skippedRoutines += 1
        continue
      }

      let hour = Int(time.split(separator: ":").first ?? "9") ?? 9
      let type: RoutineType = hour >= 12 ? .afternoon : .morning
      context.insert(Routine(title: title, timeHHmm: time, type: type))
      routinesApplied += 1
    }

    try? context.save()

    return ChaosAppliedResult(
      workflowsApplied: workflowsApplied,
      routinesApplied: routinesApplied,
      skippedWorkflows: skippedWorkflows,
      skippedRoutines: skippedRoutines,
      notesCount: parsed.notes.count,
      createdPipelineIds: createdPipelineIds,
      selectedWorkflows: parsed.workflows.count,
      selectedRoutines: parsed.routines.count
    )
  }
}

