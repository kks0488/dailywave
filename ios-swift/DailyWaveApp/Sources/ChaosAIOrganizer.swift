import Foundation

final class ChaosAIOrganizer {
  private let ai: AIProxyClient

  init(ai: AIProxyClient) {
    self.ai = ai
  }

  func organize(text: String, existingPipelines: [Pipeline], existingRoutines: [Routine]) async throws -> ChaosParseResult {
    let input = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if input.isEmpty {
      return ChaosParseResult(workflows: [], routines: [], notes: [])
    }

    let workflowTitles = existingPipelines.map { $0.title }.filter { !$0.isEmpty }
    let routineTitles = existingRoutines.map { ["title": $0.title, "time": $0.timeHHmm] }

    let workflowTitlesJSON = String(data: try JSONEncoder.dailyWave.encode(workflowTitles), encoding: .utf8) ?? "[]"
    let routineTitlesJSON = String(data: try JSONEncoder.dailyWave.encode(routineTitles), encoding: .utf8) ?? "[]"

    let prompt = """
You are a JSON-only organizer. Turn the user's unstructured brain dump into actionable items.

USER INPUT:
\(input)

EXISTING WORKFLOWS (avoid duplicates):
\(workflowTitlesJSON)

EXISTING ROUTINES (avoid duplicates):
\(routineTitlesJSON)

RULES:
- Output ONLY valid JSON (no markdown, no commentary)
- Prefer small, concrete steps (ADHD-friendly)
- If something is unclear, put it into "notes" instead of guessing
- For routines, use time format HH:MM (24h)
- Keep it compact (max 5 workflows, max 8 routines, max 12 notes)

OUTPUT SCHEMA (strict):
{
  "workflows": [{"title":"...","subtitle":"optional","steps":["Step 1","Step 2"]}],
  "routines": [{"title":"...","time":"09:00"}],
  "notes": ["..."]
}
"""

    let baseURL = try BackendURLStore().baseURL()
    let raw = try await ai.ask(baseURL: baseURL, prompt: prompt, userId: nil)
    guard let json = JSONExtractor.firstJSONObject(in: raw) else {
      return ChaosParseResult(workflows: [], routines: [], notes: [])
    }

    let decoded = try JSONDecoder.dailyWave.decode(ChaosParseResult.self, from: Data(json.utf8))
    return ChaosNormalizer.normalize(decoded, existingPipelines: existingPipelines, existingRoutines: existingRoutines)
  }
}

enum ChaosNormalizer {
  static func normalize(_ result: ChaosParseResult, existingPipelines: [Pipeline], existingRoutines: [Routine]) -> ChaosParseResult {
    let existingWorkflowTitles = Set(
      existingPipelines
        .map { $0.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        .filter { !$0.isEmpty }
    )
    let existingRoutineKeys = Set(existingRoutines.map { "\($0.title.lowercased())|\($0.timeHHmm)" })

    let workflows: [ChaosParseResult.Workflow] = result.workflows
      .compactMap { wf in
        let title = wf.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return nil }
        guard !existingWorkflowTitles.contains(title.lowercased()) else { return nil }

        let steps = wf.steps
          .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
          .filter { !$0.isEmpty }
          .prefix(12)
        guard !steps.isEmpty else { return nil }

        let subtitle = (wf.subtitle ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return ChaosParseResult.Workflow(title: title, subtitle: subtitle.isEmpty ? nil : subtitle, steps: Array(steps))
      }
      .prefix(5)
      .map { $0 }

    let routines: [ChaosParseResult.RoutineItem] = result.routines
      .compactMap { r in
        let title = r.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return nil }
        let time = TimeNormalizer.hhmm(r.time) ?? "09:00"
        let key = "\(title.lowercased())|\(time)"
        guard !existingRoutineKeys.contains(key) else { return nil }
        return ChaosParseResult.RoutineItem(title: title, time: time)
      }
      .prefix(8)
      .map { $0 }

    let notes = result.notes
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
      .prefix(12)
      .map { $0 }

    return ChaosParseResult(workflows: workflows, routines: routines, notes: notes)
  }
}

enum TimeNormalizer {
  static func hhmm(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let parts = trimmed.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
    guard parts.count == 2 else { return nil }
    guard let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
    guard (0...23).contains(h), (0...59).contains(m) else { return nil }
    return String(format: "%02d:%02d", h, m)
  }
}

enum JSONExtractor {
  /// Extracts the first complete JSON object (best-effort) from an AI response.
  static func firstJSONObject(in text: String) -> String? {
    let scalars = Array(text.unicodeScalars)
    var start: Int?
    var depth = 0
    var inString = false
    var escape = false

    for i in scalars.indices {
      let c = scalars[i]

      if inString {
        if escape {
          escape = false
          continue
        }
        if c == "\\" {
          escape = true
          continue
        }
        if c == "\"" {
          inString = false
        }
        continue
      }

      if c == "\"" {
        inString = true
        continue
      }

      if c == "{" {
        if start == nil { start = i }
        depth += 1
        continue
      }

      if c == "}" {
        guard start != nil else { continue }
        depth -= 1
        if depth == 0, let s = start {
          let slice = String(String.UnicodeScalarView(scalars[s...i]))
          return slice
        }
      }
    }
    return nil
  }
}

