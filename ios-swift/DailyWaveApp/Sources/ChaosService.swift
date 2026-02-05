import Foundation
import SwiftData

@MainActor
final class ChaosService {
  private let context: ModelContext

  private let dedupeDays = 7

  init(context: ModelContext) {
    self.context = context
  }

  func addOrMergeDump(text: String, parsed: ChaosParseResult?, status: ChaosStatus) -> ChaosDump {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalized = normalize(trimmed)
    let now = Date()

    let cutoff =
      Calendar.current.date(byAdding: .day, value: -dedupeDays, to: now)
      ?? now.addingTimeInterval(-Double(dedupeDays) * 86_400)

    let descriptor = FetchDescriptor<ChaosDump>(
      predicate: #Predicate { dump in
        dump.createdAt >= cutoff && dump.statusRaw != "applied"
      },
      sortBy: [SortDescriptor(\ChaosDump.updatedAt, order: .reverse)]
    )

    let candidates = (try? context.fetch(descriptor)) ?? []
    if let existing = candidates.first(where: { normalize($0.text) == normalized }) {
      existing.text = trimmed
      existing.updatedAt = now
      existing.mergedCount = max(1, existing.mergedCount) + 1
      if existing.parsed == nil, let parsed {
        existing.parsed = parsed
      }
      if existing.status == .inbox, existing.parsed != nil {
        existing.status = .organized
      }
      return existing
    }

    let dump = ChaosDump(
      text: trimmed,
      createdAt: now,
      updatedAt: now,
      status: parsed == nil ? status : .organized,
      mergedCount: 1,
      parsed: parsed
    )
    context.insert(dump)
    return dump
  }

  private func normalize(_ value: String) -> String {
    value
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
      .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
  }
}

