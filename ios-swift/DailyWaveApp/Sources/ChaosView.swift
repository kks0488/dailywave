import SwiftUI
import SwiftData

struct ChaosView: View {
  @Environment(\.modelContext) private var context

  @Query(sort: [SortDescriptor(\ChaosDump.updatedAt, order: .reverse)])
  private var dumps: [ChaosDump]

  @State private var text: String = ""

  var body: some View {
    NavigationStack {
      List {
        Section("New dump") {
          TextEditor(text: $text)
            .frame(minHeight: 120)

          Button {
            saveDump()
          } label: {
            Label("Save to Inbox", systemImage: "tray.and.arrow.down.fill")
          }
          .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }

        Section("Inbox") {
          if dumps.isEmpty {
            Text("No dumps yet.")
              .foregroundStyle(.secondary)
          } else {
            ForEach(dumps) { dump in
              NavigationLink {
                ChaosDetailView(dumpId: dump.id)
              } label: {
                ChaosRow(dump: dump)
              }
            }
            .onDelete(perform: deleteDumps)
          }
        }
      }
      .navigationTitle("Chaos")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          if !dumps.isEmpty {
            Button("Clear", role: .destructive) {
              clearAll()
            }
          }
        }
      }
    }
  }

  private func saveDump() {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    let service = ChaosService(context: context)
    _ = service.addOrMergeDump(text: trimmed, parsed: nil, status: .inbox)
    try? context.save()

    text = ""
  }

  private func deleteDumps(at offsets: IndexSet) {
    for idx in offsets {
      context.delete(dumps[idx])
    }
    try? context.save()
  }

  private func clearAll() {
    for dump in dumps {
      context.delete(dump)
    }
    try? context.save()
  }
}

private struct ChaosRow: View {
  let dump: ChaosDump

  private var snippet: String {
    let t = dump.text.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.count <= 120 { return t }
    return String(t.prefix(120)) + "…"
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(dump.updatedAt, style: .date)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        ChaosStatusPill(status: dump.status, hasAI: dump.parsed != nil, mergedCount: dump.mergedCount)
      }
      Text(snippet)
        .font(.body.weight(.semibold))
        .lineLimit(2)
    }
    .padding(.vertical, 6)
  }
}

private struct ChaosStatusPill: View {
  let status: ChaosStatus
  let hasAI: Bool
  let mergedCount: Int

  private var label: String {
    switch status {
    case .inbox: return "Inbox"
    case .organized: return "Organized"
    case .applied: return "Applied"
    }
  }

  var body: some View {
    HStack(spacing: 6) {
      Text(label)
        .font(.caption2.weight(.bold))
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(.thinMaterial)
        .clipShape(Capsule())

      if hasAI && status == .inbox {
        Text("AI")
          .font(.caption2.weight(.bold))
          .padding(.horizontal, 10)
          .padding(.vertical, 4)
          .background(.orange.opacity(0.15))
          .clipShape(Capsule())
      }

      if mergedCount > 1 {
        Text("×\(mergedCount)")
          .font(.caption2.weight(.bold))
          .padding(.horizontal, 10)
          .padding(.vertical, 4)
          .background(.indigo.opacity(0.12))
          .clipShape(Capsule())
      }
    }
    .foregroundStyle(.secondary)
  }
}

struct ChaosDetailView: View {
  @EnvironmentObject private var auth: SupabaseAuthManager
  @EnvironmentObject private var navigation: AppNavigationModel
  @Environment(\.modelContext) private var context

  let dumpId: UUID

  @State private var dump: ChaosDump?
  @State private var lastSavedText: String = ""
  @State private var draftText: String = ""
  @State private var parsed: ChaosParseResult?
  @State private var workflowChecks: [Bool] = []
  @State private var routineChecks: [Bool] = []
  @State private var isOrganizing = false
  @State private var alertMessage: String?

  @Query(sort: \Pipeline.position)
  private var pipelines: [Pipeline]

  @Query(sort: \Routine.timeHHmm)
  private var routines: [Routine]

  var body: some View {
    Group {
      if let dump {
        List {
          Section("Dump") {
            TextEditor(text: $draftText)
              .frame(minHeight: 160)
              .onChange(of: draftText) { _, newValue in
                guard newValue != lastSavedText else { return }
                parsed = nil
                workflowChecks = []
                routineChecks = []
              }
          }

          Section {
            Button("Save changes") { saveText() }
              .disabled(draftText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Button {
              Task { await organizeWithAI() }
            } label: {
              HStack {
                Text(isOrganizing ? "Organizing…" : "Organize with AI")
                Spacer()
                Image(systemName: "sparkles")
              }
            }
            .disabled(isOrganizing || draftText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          }

          if dump.status == .applied, let result = dump.appliedResult {
            Section("Applied") {
              if let appliedAt = dump.appliedAt {
                LabeledContent("Applied at", value: appliedAt.formatted(date: .abbreviated, time: .shortened))
              }

              LabeledContent("Workflows created", value: "\(result.workflowsApplied)")
              LabeledContent("Routines created", value: "\(result.routinesApplied)")

              if result.skippedWorkflows > 0 || result.skippedRoutines > 0 {
                LabeledContent("Skipped", value: "\(result.skippedWorkflows) workflows, \(result.skippedRoutines) routines")
              }

              if result.notesCount > 0 {
                LabeledContent("Notes", value: "\(result.notesCount)")
              }

              if let first = result.createdPipelineIds.first {
                Button("Open created workflow") {
                  navigation.openPipeline(first)
                }
              } else {
                Button("Go to Workflows") {
                  navigation.selectedTab = .workflows
                }
              }
            }
          }

          if let parsed {
            ChaosPreviewSection(
              parsed: parsed,
              workflowChecks: $workflowChecks,
              routineChecks: $routineChecks
            )

            Button {
              applySelected()
            } label: {
              Text("Apply selected")
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!hasTargets(parsed))
          } else {
            Section {
              Text(auth.isSignedIn ? "Run “Organize with AI” to preview workflows & routines." : "AI requires Sign in with Apple.")
                .foregroundStyle(.secondary)
            }
          }
        }
        .navigationTitle("Chaos Detail")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDump() }
      } else {
        ProgressView()
          .task { await loadDump() }
      }
    }
    .alert("DailyWave", isPresented: Binding(get: { alertMessage != nil }, set: { _ in alertMessage = nil })) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(alertMessage ?? "")
    }
  }

  private func loadDump() async {
    do {
      let descriptor = FetchDescriptor<ChaosDump>(predicate: #Predicate { $0.id == dumpId })
      dump = try context.fetch(descriptor).first
      if let dump {
        lastSavedText = dump.text
        draftText = dump.text
        parsed = dump.parsed
        syncChecks()
      }
    } catch {
      dump = nil
    }
  }

  private func saveText() {
    guard let dump else { return }
    let trimmed = draftText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    dump.text = trimmed
    dump.updatedAt = Date()
    dump.status = .inbox
    dump.parsed = nil
    dump.appliedAt = nil
    dump.appliedResult = nil

    parsed = nil
    workflowChecks = []
    routineChecks = []
    lastSavedText = trimmed

    try? context.save()
    alertMessage = "Saved."
  }

  private func syncChecks() {
    guard let parsed else { return }
    workflowChecks = parsed.workflows.map { _ in true }
    routineChecks = parsed.routines.map { _ in true }
  }

  private func organizeWithAI() async {
    guard let dump else { return }
    if !auth.isSignedIn {
      do {
        try await auth.signInWithApple()
      } catch {
        alertMessage = "Sign in failed."
        return
      }
    }

    let text = draftText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return }

    isOrganizing = true
    defer { isOrganizing = false }

    do {
      let organizer = ChaosAIOrganizer(ai: AIProxyClient(auth: auth))
      let result = try await organizer.organize(
        text: text,
        existingPipelines: pipelines,
        existingRoutines: routines
      )

      if !hasTargets(result) && result.notes.isEmpty {
        dump.status = .inbox
        dump.parsed = nil
        dump.updatedAt = Date()
        parsed = nil
        workflowChecks = []
        routineChecks = []
        try? context.save()
        alertMessage = "No actionable items found."
        return
      }

      dump.status = .organized
      dump.parsed = result
      dump.text = text
      dump.updatedAt = Date()
      try? context.save()

      parsed = result
      syncChecks()
      alertMessage = "Organized."
    } catch {
      alertMessage = "AI error: \(error.localizedDescription)"
    }
  }

  private func hasTargets(_ parsed: ChaosParseResult) -> Bool {
    !parsed.workflows.isEmpty || !parsed.routines.isEmpty
  }

  private func applySelected() {
    guard let dump else { return }
    guard let parsed else { return }

    let selectedWorkflows = zip(parsed.workflows, workflowChecks).compactMap { $1 ? $0 : nil }
    let selectedRoutines = zip(parsed.routines, routineChecks).compactMap { $1 ? $0 : nil }
    let subset = ChaosParseResult(workflows: selectedWorkflows, routines: selectedRoutines, notes: parsed.notes)
    guard hasTargets(subset) else {
      alertMessage = "Nothing to apply."
      return
    }

    let applier = ChaosApplyService(context: context)
    let result = applier.apply(parsed: subset, existingPipelines: pipelines, existingRoutines: routines)

    dump.status = .applied
    dump.appliedAt = Date()
    dump.appliedResult = result
    dump.updatedAt = Date()
    try? context.save()

    if let first = result.createdPipelineIds.first {
      navigation.openPipeline(first)
    }

    alertMessage = "Applied."
  }
}

private struct ChaosPreviewSection: View {
  let parsed: ChaosParseResult
  @Binding var workflowChecks: [Bool]
  @Binding var routineChecks: [Bool]

  var body: some View {
    Section("Workflows (\(parsed.workflows.count))") {
      if parsed.workflows.isEmpty {
        Text("No workflows found.")
          .foregroundStyle(.secondary)
      } else {
        ForEach(Array(parsed.workflows.enumerated()), id: \.element.id) { idx, wf in
          SelectRow(
            title: wf.title,
            subtitle: "\(wf.steps.count) steps",
            checked: workflowChecks[safe: idx] ?? true
          ) {
            if workflowChecks.indices.contains(idx) {
              workflowChecks[idx].toggle()
            }
          }
        }
      }
    }

    Section("Routines (\(parsed.routines.count))") {
      if parsed.routines.isEmpty {
        Text("No routines found.")
          .foregroundStyle(.secondary)
      } else {
        ForEach(Array(parsed.routines.enumerated()), id: \.element.id) { idx, routine in
          SelectRow(
            title: routine.title,
            subtitle: routine.time,
            checked: routineChecks[safe: idx] ?? true
          ) {
            if routineChecks.indices.contains(idx) {
              routineChecks[idx].toggle()
            }
          }
        }
      }
    }

    if !parsed.notes.isEmpty {
      Section("Notes (\(parsed.notes.count))") {
        ForEach(parsed.notes, id: \.self) { note in
          Text(note)
            .foregroundStyle(.secondary)
        }
      }
    }
  }
}

private struct SelectRow: View {
  let title: String
  let subtitle: String?
  let checked: Bool
  let onToggle: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      Button(action: onToggle) {
        Image(systemName: checked ? "checkmark.square.fill" : "square")
          .foregroundStyle(checked ? .blue : .secondary)
          .font(.title3)
      }
      .buttonStyle(.plain)

      VStack(alignment: .leading, spacing: 2) {
        Text(title).font(.body.weight(.semibold))
        if let subtitle, !subtitle.isEmpty {
          Text(subtitle).font(.caption).foregroundStyle(.secondary)
        }
      }
      Spacer()
    }
  }
}

private extension Array {
  subscript(safe index: Int) -> Element? {
    indices.contains(index) ? self[index] : nil
  }
}
