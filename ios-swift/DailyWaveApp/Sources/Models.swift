import Foundation
import SwiftData

enum StepStatus: String, Codable, CaseIterable {
  case pending
  case active
  case locked
  case done
}

enum RoutineType: String, Codable, CaseIterable {
  case morning
  case afternoon
}

enum ChaosStatus: String, Codable, CaseIterable {
  case inbox
  case organized
  case applied
}

@Model
final class Pipeline {
  @Attribute(.unique) var id: UUID
  var title: String
  var subtitle: String
  var color: String
  var iconType: String
  var position: Int
  var createdAt: Date
  var updatedAt: Date

  @Relationship(deleteRule: .cascade, inverse: \Step.pipeline)
  var steps: [Step]

  init(
    id: UUID = UUID(),
    title: String,
    subtitle: String = "",
    color: String = "blue",
    iconType: String = "briefcase",
    position: Int = 0,
    createdAt: Date = Date(),
    updatedAt: Date = Date(),
    steps: [Step] = []
  ) {
    self.id = id
    self.title = title
    self.subtitle = subtitle
    self.color = color
    self.iconType = iconType
    self.position = position
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.steps = steps
  }
}

@Model
final class Step {
  @Attribute(.unique) var id: UUID
  var title: String
  var stepDescription: String
  var statusRaw: String
  var position: Int
  var createdAt: Date
  var updatedAt: Date

  @Relationship(inverse: \Pipeline.steps)
  var pipeline: Pipeline?

  var status: StepStatus {
    get { StepStatus(rawValue: statusRaw) ?? .pending }
    set { statusRaw = newValue.rawValue }
  }

  init(
    id: UUID = UUID(),
    title: String,
    stepDescription: String = "",
    status: StepStatus = .pending,
    position: Int = 0,
    createdAt: Date = Date(),
    updatedAt: Date = Date(),
    pipeline: Pipeline? = nil
  ) {
    self.id = id
    self.title = title
    self.stepDescription = stepDescription
    self.statusRaw = status.rawValue
    self.position = position
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.pipeline = pipeline
  }
}

@Model
final class Routine {
  @Attribute(.unique) var id: UUID
  var title: String
  var timeHHmm: String
  var typeRaw: String
  var doneDate: String?
  var reminderEnabledRaw: Bool?
  var createdAt: Date
  var updatedAt: Date

  var type: RoutineType {
    get { RoutineType(rawValue: typeRaw) ?? .morning }
    set { typeRaw = newValue.rawValue }
  }

  var reminderEnabled: Bool {
    get { reminderEnabledRaw ?? true }
    set { reminderEnabledRaw = newValue }
  }

  init(
    id: UUID = UUID(),
    title: String,
    timeHHmm: String,
    type: RoutineType,
    doneDate: String? = nil,
    reminderEnabled: Bool = true,
    createdAt: Date = Date(),
    updatedAt: Date = Date()
  ) {
    self.id = id
    self.title = title
    self.timeHHmm = timeHHmm
    self.typeRaw = type.rawValue
    self.doneDate = doneDate
    self.reminderEnabledRaw = reminderEnabled
    self.createdAt = createdAt
    self.updatedAt = updatedAt
  }
}

struct ChaosParseResult: Codable, Equatable {
  struct Workflow: Codable, Equatable, Identifiable {
    var id: UUID
    var title: String
    var subtitle: String?
    var steps: [String]

    init(id: UUID = UUID(), title: String, subtitle: String? = nil, steps: [String]) {
      self.id = id
      self.title = title
      self.subtitle = subtitle
      self.steps = steps
    }

    enum CodingKeys: String, CodingKey { case title, subtitle, steps }

    init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      id = UUID()
      title = try container.decode(String.self, forKey: .title)
      subtitle = try container.decodeIfPresent(String.self, forKey: .subtitle)
      steps = try container.decodeIfPresent([String].self, forKey: .steps) ?? []
    }

    func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      try container.encode(title, forKey: .title)
      try container.encodeIfPresent(subtitle, forKey: .subtitle)
      try container.encode(steps, forKey: .steps)
    }
  }

  struct RoutineItem: Codable, Equatable, Identifiable {
    var id: UUID
    var title: String
    var time: String

    init(id: UUID = UUID(), title: String, time: String) {
      self.id = id
      self.title = title
      self.time = time
    }

    enum CodingKeys: String, CodingKey { case title, time }

    init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      id = UUID()
      title = try container.decode(String.self, forKey: .title)
      time = try container.decodeIfPresent(String.self, forKey: .time) ?? "09:00"
    }

    func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      try container.encode(title, forKey: .title)
      try container.encode(time, forKey: .time)
    }
  }

  var workflows: [Workflow]
  var routines: [RoutineItem]
  var notes: [String]
}

struct ChaosAppliedResult: Codable, Equatable {
  var workflowsApplied: Int
  var routinesApplied: Int
  var skippedWorkflows: Int
  var skippedRoutines: Int
  var notesCount: Int
  var createdPipelineIds: [UUID]
  var selectedWorkflows: Int
  var selectedRoutines: Int
}

@Model
final class ChaosDump {
  @Attribute(.unique) var id: UUID
  var text: String
  var createdAt: Date
  var updatedAt: Date
  var statusRaw: String
  var mergedCount: Int
  var parsedJSON: Data?
  var appliedAt: Date?
  var appliedResultJSON: Data?

  var status: ChaosStatus {
    get { ChaosStatus(rawValue: statusRaw) ?? .inbox }
    set { statusRaw = newValue.rawValue }
  }

  var parsed: ChaosParseResult? {
    get {
      guard let parsedJSON else { return nil }
      return try? JSONDecoder.dailyWave.decode(ChaosParseResult.self, from: parsedJSON)
    }
    set {
      parsedJSON = newValue.flatMap { try? JSONEncoder.dailyWave.encode($0) }
    }
  }

  var appliedResult: ChaosAppliedResult? {
    get {
      guard let appliedResultJSON else { return nil }
      return try? JSONDecoder.dailyWave.decode(ChaosAppliedResult.self, from: appliedResultJSON)
    }
    set {
      appliedResultJSON = newValue.flatMap { try? JSONEncoder.dailyWave.encode($0) }
    }
  }

  init(
    id: UUID = UUID(),
    text: String,
    createdAt: Date = Date(),
    updatedAt: Date = Date(),
    status: ChaosStatus = .inbox,
    mergedCount: Int = 1,
    parsed: ChaosParseResult? = nil,
    appliedAt: Date? = nil,
    appliedResult: ChaosAppliedResult? = nil
  ) {
    self.id = id
    self.text = text
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.statusRaw = status.rawValue
    self.mergedCount = mergedCount
    self.parsedJSON = parsed.flatMap { try? JSONEncoder.dailyWave.encode($0) }
    self.appliedAt = appliedAt
    self.appliedResultJSON = appliedResult.flatMap { try? JSONEncoder.dailyWave.encode($0) }
  }
}

@Model
final class HistoryEvent {
  @Attribute(.unique) var id: UUID
  var type: String
  var at: Date
  var payloadJSON: Data?

  init(
    id: UUID = UUID(),
    type: String,
    at: Date = Date(),
    payloadJSON: Data? = nil
  ) {
    self.id = id
    self.type = type
    self.at = at
    self.payloadJSON = payloadJSON
  }
}

extension JSONEncoder {
  static let dailyWave: JSONEncoder = {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    return encoder
  }()
}

extension JSONDecoder {
  static let dailyWave: JSONDecoder = {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return decoder
  }()
}
