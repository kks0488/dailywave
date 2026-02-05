import Foundation
import SwiftData
import UniformTypeIdentifiers
import SwiftUI

struct BackupPayload: Codable {
  var pipelines: [PipelineDTO]
  var routines: [RoutineDTO]
  var chaosInbox: [ChaosDumpDTO]
  var completionHistory: [HistoryEventDTO]
}

struct PipelineDTO: Codable {
  var id: UUID
  var title: String
  var subtitle: String
  var color: String
  var iconType: String
  var position: Int
  var steps: [StepDTO]
}

struct StepDTO: Codable {
  var id: UUID
  var title: String
  var description: String
  var status: String
  var position: Int
}

struct RoutineDTO: Codable {
  var id: UUID
  var title: String
  var timeHHmm: String
  var type: String
  var doneDate: String?
  var reminderEnabled: Bool?
}

struct ChaosDumpDTO: Codable {
  var id: UUID
  var text: String
  var createdAt: Date
  var updatedAt: Date
  var status: String
  var mergedCount: Int
  var parsed: ChaosParseResult?
  var appliedAt: Date?
  var appliedResult: ChaosAppliedResult?
}

struct HistoryEventDTO: Codable {
  var id: UUID
  var type: String
  var at: Date
  var payloadJSON: Data?
}

struct BackupDocument: FileDocument {
  static var readableContentTypes: [UTType] { [.json] }
  var data: Data

  init(data: Data) {
    self.data = data
  }

  init(configuration: ReadConfiguration) throws {
    self.data = configuration.file.regularFileContents ?? Data()
  }

  func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
    FileWrapper(regularFileWithContents: data)
  }
}

@MainActor
final class BackupService {
  private let context: ModelContext

  init(context: ModelContext) {
    self.context = context
  }

  func makeDocument() -> BackupDocument {
    let payload = makePayload()
    let data = (try? JSONEncoder.dailyWave.encode(payload)) ?? Data()
    return BackupDocument(data: data)
  }

  func restore(from data: Data) throws {
    let decoded = try JSONDecoder.dailyWave.decode(BackupPayload.self, from: data)

    try deleteAll(Pipeline.self)
    try deleteAll(Routine.self)
    try deleteAll(ChaosDump.self)
    try deleteAll(HistoryEvent.self)

    for p in decoded.pipelines {
      let pipeline = Pipeline(
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        color: p.color,
        iconType: p.iconType,
        position: p.position
      )

      let steps = p.steps
        .sorted { $0.position < $1.position }
        .map { s in
          Step(
            id: s.id,
            title: s.title,
            stepDescription: s.description,
            status: StepStatus(rawValue: s.status) ?? .pending,
            position: s.position,
            pipeline: pipeline
          )
        }
      pipeline.steps = steps
      context.insert(pipeline)
    }

    for r in decoded.routines {
      let routine = Routine(
        id: r.id,
        title: r.title,
        timeHHmm: r.timeHHmm,
        type: RoutineType(rawValue: r.type) ?? .morning,
        doneDate: r.doneDate,
        reminderEnabled: r.reminderEnabled ?? true
      )
      context.insert(routine)
    }

    for d in decoded.chaosInbox {
      let dump = ChaosDump(
        id: d.id,
        text: d.text,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        status: ChaosStatus(rawValue: d.status) ?? .inbox,
        mergedCount: max(1, d.mergedCount),
        parsed: d.parsed,
        appliedAt: d.appliedAt,
        appliedResult: d.appliedResult
      )
      context.insert(dump)
    }

    for h in decoded.completionHistory {
      context.insert(HistoryEvent(id: h.id, type: h.type, at: h.at, payloadJSON: h.payloadJSON))
    }

    try context.save()
  }

  private func makePayload() -> BackupPayload {
    let pipelines = (try? context.fetch(FetchDescriptor<Pipeline>())) ?? []
    let routines = (try? context.fetch(FetchDescriptor<Routine>())) ?? []
    let dumps = (try? context.fetch(FetchDescriptor<ChaosDump>())) ?? []
    let history = (try? context.fetch(FetchDescriptor<HistoryEvent>())) ?? []

    let pipelineDTOs = pipelines.map { p in
      PipelineDTO(
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        color: p.color,
        iconType: p.iconType,
        position: p.position,
        steps: p.steps.map { s in
          StepDTO(id: s.id, title: s.title, description: s.stepDescription, status: s.statusRaw, position: s.position)
        }
      )
    }

    let routineDTOs = routines.map { r in
      RoutineDTO(
        id: r.id,
        title: r.title,
        timeHHmm: r.timeHHmm,
        type: r.typeRaw,
        doneDate: r.doneDate,
        reminderEnabled: r.reminderEnabled
      )
    }

    let dumpDTOs = dumps.map { d in
      ChaosDumpDTO(
        id: d.id,
        text: d.text,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        status: d.statusRaw,
        mergedCount: d.mergedCount,
        parsed: d.parsed,
        appliedAt: d.appliedAt,
        appliedResult: d.appliedResult
      )
    }

    let historyDTOs = history.map { h in
      HistoryEventDTO(id: h.id, type: h.type, at: h.at, payloadJSON: h.payloadJSON)
    }

    return BackupPayload(
      pipelines: pipelineDTOs,
      routines: routineDTOs,
      chaosInbox: dumpDTOs,
      completionHistory: historyDTOs
    )
  }

  private func deleteAll<T: PersistentModel>(_ type: T.Type) throws {
    let items = try context.fetch(FetchDescriptor<T>())
    for item in items {
      context.delete(item)
    }
  }
}
