import Foundation

@MainActor
enum WorkflowEngine {
  static func nextTarget(from pipelines: [Pipeline]) -> (pipeline: Pipeline, step: Step)? {
    let sortedPipelines = pipelines.sorted { $0.position < $1.position }

    for pipeline in sortedPipelines {
      let steps = pipeline.steps.sorted { $0.position < $1.position }
      if let active = steps.first(where: { $0.status == .active }) {
        return (pipeline, active)
      }
    }

    for pipeline in sortedPipelines {
      let steps = pipeline.steps.sorted { $0.position < $1.position }
      if let pending = steps.first(where: { $0.status == .pending || $0.status == .locked }) {
        return (pipeline, pending)
      }
    }

    return nil
  }

  static func setStatus(_ status: StepStatus, step: Step, in pipeline: Pipeline) {
    let now = Date()

    if status == .active {
      for s in pipeline.steps where s.status == .active && s.id != step.id {
        s.status = .pending
        s.updatedAt = now
      }
    }

    step.status = status
    step.updatedAt = now
    pipeline.updatedAt = now

    if status == .done {
      let sorted = pipeline.steps.sorted { $0.position < $1.position }
      if !sorted.contains(where: { $0.status == .active }) {
        if let next = sorted.first(where: { $0.status == .locked || $0.status == .pending }) {
          next.status = .active
          next.updatedAt = now
        }
      }
    }
  }
}

