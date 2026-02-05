import Foundation
import SwiftUI
import SwiftData

struct SettingsView: View {
  @EnvironmentObject private var auth: SupabaseAuthManager
  @EnvironmentObject private var notifications: NotificationManager
  @Environment(\.modelContext) private var context

  @AppStorage("dw_backend_url") private var backendURLOverride: String = ""
  @AppStorage("dw_notifications_enabled") private var notificationsEnabled: Bool = true

  @State private var aiStatus: AIStatus?
  @State private var isCheckingAI = false
  @State private var alertMessage: String?

  @State private var exportDoc: BackupDocument?
  @State private var isExporting = false
  @State private var isImporting = false

  @State private var isDeleteConfirmOpen = false
  @State private var isDeletingAccount = false

  @Query(sort: [SortDescriptor(\HistoryEvent.at, order: .reverse)])
  private var historyEvents: [HistoryEvent]

  var body: some View {
    NavigationStack {
      Form {
        Section("AI / Backend") {
          TextField("Backend URL", text: $backendURLOverride)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

          Button(isCheckingAI ? "Checking…" : "Check AI status") {
            Task { await refreshAIStatus() }
          }
          .disabled(isCheckingAI)

          if let aiStatus {
            LabeledContent("Proxy reachable", value: aiStatus.ai_proxy_reachable ? "Yes" : "No")
            LabeledContent("Gemini configured", value: aiStatus.gemini_configured ? "Yes" : "No")
            LabeledContent("memU reachable", value: aiStatus.memu_reachable ? "Yes" : "No")
            LabeledContent("Auth required", value: aiStatus.require_supabase_auth_for_ai ? "Yes" : "No")
            LabeledContent("Limits", value: "\(aiStatus.rate_limits.per_minute)/min, \(aiStatus.rate_limits.per_hour)/hour")
          } else {
            Text("Set a backend URL to use AI features.")
              .foregroundStyle(.secondary)
          }
        }

        Section("Notifications") {
          Toggle("Enable routine reminders", isOn: $notificationsEnabled)
            .onChange(of: notificationsEnabled) { _, _ in
              Task { await syncNotifications() }
            }

          LabeledContent("Permission", value: notifications.authorizationLabel)
            .foregroundStyle(.secondary)

          Button("Request permission") {
            Task { _ = await notifications.requestAuthorization() }
          }
          .disabled(!notificationsEnabled)

          Button("Reschedule reminders") {
            Task { await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled) }
          }
          .disabled(!notificationsEnabled)
        }

        Section("Sign in (for AI)") {
          if auth.isSignedIn {
            Text("Signed in")
              .foregroundStyle(.secondary)
            Button("Sign out", role: .destructive) {
              Task { await auth.signOut() }
            }
          } else {
            Button("Sign in with Apple") {
              Task {
                do {
                  try await auth.signInWithApple()
                } catch {
                  alertMessage = "Sign in failed."
                }
              }
            }
          }
        }

        if auth.isSignedIn {
          Section("Account") {
            Button(isDeletingAccount ? "Deleting…" : "Delete AI account", role: .destructive) {
              isDeleteConfirmOpen = true
            }
            .disabled(isDeletingAccount)
          }
        }

        Section("Backup") {
          Button("Export JSON backup") {
            exportDoc = BackupService(context: context).makeDocument()
            isExporting = true
          }
          Button("Import JSON backup") {
            isImporting = true
          }
        }

        Section("Victory (last 7 days)") {
          let recent = recentHistory()
          if recent.isEmpty {
            Text("No victories yet.")
              .foregroundStyle(.secondary)
          } else {
            ForEach(recent) { event in
              VStack(alignment: .leading, spacing: 4) {
                Text(eventTitle(event))
                  .font(.body.weight(.semibold))
                if let subtitle = eventSubtitle(event), !subtitle.isEmpty {
                  Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                Text(event.at, style: .date)
                  .font(.caption2)
                  .foregroundStyle(.secondary)
              }
              .padding(.vertical, 4)
            }
          }

          if !historyEvents.isEmpty {
            Button("Clear victory history", role: .destructive) { clearHistory() }
          }
        }

        Section("About") {
          Link("Privacy Policy", destination: URL(string: "https://example.com/privacy")!)
            .foregroundStyle(.blue)
          Text("Core features work offline. AI is optional.")
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Settings")
      .fileExporter(
        isPresented: $isExporting,
        document: exportDoc,
        contentType: .json,
        defaultFilename: "DailyWave-Backup"
      ) { _ in
        exportDoc = nil
      }
      .fileImporter(isPresented: $isImporting, allowedContentTypes: [.json]) { result in
        switch result {
        case .success(let url):
          do {
            let data = try Data(contentsOf: url)
            try BackupService(context: context).restore(from: data)
            alertMessage = "Imported."
            Task { await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled) }
          } catch {
            alertMessage = "Import failed."
          }
        case .failure:
          break
        }
      }
      .confirmationDialog(
        "Delete AI account?",
        isPresented: $isDeleteConfirmOpen,
        titleVisibility: .visible
      ) {
        Button("Delete", role: .destructive) {
          Task { await deleteAccount() }
        }
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("This permanently deletes your Apple/Supabase login used for AI. Local workflows and routines stay on your phone.")
      }
      .alert("DailyWave", isPresented: Binding(get: { alertMessage != nil }, set: { _ in alertMessage = nil })) {
        Button("OK", role: .cancel) {}
      } message: {
        Text(alertMessage ?? "")
      }
      .task {
        await notifications.refreshAuthorizationStatus()
      }
    }
  }

  private func refreshAIStatus() async {
    isCheckingAI = true
    defer { isCheckingAI = false }

    do {
      let baseURL = try BackendURLStore().baseURL()
      let status = try await AIProxyClient(auth: auth).getStatus(baseURL: baseURL)
      aiStatus = status
    } catch {
      alertMessage = "Failed to fetch AI status."
    }
  }

  private func syncNotifications() async {
    if notificationsEnabled {
      await notifications.refreshAuthorizationStatus()
      if notifications.authorizationStatus == .notDetermined {
        _ = await notifications.requestAuthorization()
      }
      await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled)
    } else {
      await notifications.removeAllRoutineNotifications()
    }
  }

  private func deleteAccount() async {
    isDeletingAccount = true
    defer { isDeletingAccount = false }

    do {
      let baseURL = try BackendURLStore().baseURL()
      try await AccountClient(auth: auth).deleteAccount(baseURL: baseURL)
      await auth.signOut()
      alertMessage = "Account deleted."
    } catch {
      alertMessage = error.localizedDescription
    }
  }

  private func clearHistory() {
    for e in historyEvents {
      context.delete(e)
    }
    try? context.save()
    alertMessage = "Cleared."
  }

  private func recentHistory() -> [HistoryEvent] {
    let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date.distantPast
    return Array(historyEvents.filter { $0.at >= cutoff }.prefix(50))
  }

  private func eventTitle(_ event: HistoryEvent) -> String {
    switch event.type {
    case "step_completed": return "Step completed"
    case "routine_completed": return "Routine completed"
    default: return event.type
    }
  }

  private func eventSubtitle(_ event: HistoryEvent) -> String? {
    guard let data = event.payloadJSON else { return nil }
    guard let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
    if let step = obj["stepTitle"] as? String, let pipeline = obj["pipelineTitle"] as? String {
      return "\(pipeline) • \(step)"
    }
    if let routine = obj["routineTitle"] as? String, let time = obj["time"] as? String {
      return "\(time) • \(routine)"
    }
    return nil
  }
}
