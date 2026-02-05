import SwiftUI
import SwiftData

struct OnboardingView: View {
  @Environment(\.modelContext) private var context
  @EnvironmentObject private var notifications: NotificationManager

  @AppStorage("hasOnboarded") private var hasOnboarded: Bool = false
  @AppStorage("dw_notifications_enabled") private var notificationsEnabled: Bool = true

  @State private var step: Step = .welcome

  @State private var chaosText: String = ""
  @State private var routineTitle: String = "Daily check"
  @State private var routineTime: String = "09:00"
  @State private var routineType: RoutineType = .morning
  @State private var routineRemind: Bool = true

  @State private var alertMessage: String?

  enum Step: Int, CaseIterable {
    case welcome
    case chaos
    case routine
    case notifications
    case ai
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        content
        Divider()
        footer
      }
      .navigationBarTitleDisplayMode(.inline)
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

  @ViewBuilder
  private var content: some View {
    switch step {
    case .welcome:
      OnboardingPage(
        title: "One clear next step.",
        subtitle: "Capture chaos → organize → apply. Then just do the next tiny step.",
        systemImage: "wave.3.right"
      ) {
        VStack(alignment: .leading, spacing: 12) {
          FeatureRow(icon: "tray.full.fill", title: "Chaos Inbox", desc: "Dump thoughts anytime. Organize later.")
          FeatureRow(icon: "square.stack.3d.up.fill", title: "Workflows", desc: "A calm sequence, not a giant list.")
          FeatureRow(icon: "bell.fill", title: "Routine reminders", desc: "Gentle nudges to come back daily.")
        }
      }

    case .chaos:
      OnboardingPage(
        title: "Dump what’s in your head",
        subtitle: "Write 3 lines. You can organize with AI later (optional).",
        systemImage: "tray.and.arrow.down.fill"
      ) {
        VStack(alignment: .leading, spacing: 12) {
          TextEditor(text: $chaosText)
            .frame(minHeight: 180)
            .overlay(alignment: .topLeading) {
              if chaosText.isEmpty {
                Text("e.g. pay rent\\nreply to Alex\\nprepare docs for tomorrow")
                  .foregroundStyle(.secondary)
                  .padding(.top, 10)
                  .padding(.leading, 6)
              }
            }
            .padding(6)
            .background(.thinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

          Text("Tip: Don’t edit. Just dump.")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

    case .routine:
      OnboardingPage(
        title: "Add one routine",
        subtitle: "This is your daily re-entry point.",
        systemImage: "clock.fill"
      ) {
        Form {
          Section("Routine") {
            TextField("Title", text: $routineTitle)
            TextField("Time (HH:MM)", text: $routineTime)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()

            Picker("Type", selection: $routineType) {
              Text("Morning").tag(RoutineType.morning)
              Text("Afternoon").tag(RoutineType.afternoon)
            }

            Toggle("Remind me", isOn: $routineRemind)
          }
        }
        .scrollContentBackground(.hidden)
      }

    case .notifications:
      OnboardingPage(
        title: "Enable reminders",
        subtitle: "DailyWave can send local notifications for your routines.",
        systemImage: "bell.badge.fill"
      ) {
        VStack(alignment: .leading, spacing: 14) {
          Toggle("Enable routine reminders", isOn: $notificationsEnabled)

          LabeledContent("Permission", value: notifications.authorizationLabel)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Button("Allow Notifications") {
            Task { await requestNotificationsIfNeeded() }
          }
          .disabled(!notificationsEnabled)
        }
        .padding(.horizontal)
        .padding(.top, 8)
      }

    case .ai:
      OnboardingPage(
        title: "AI is optional",
        subtitle: "If you want AI organize/recommendations, you’ll sign in with Apple. Core features work offline without an account.",
        systemImage: "sparkles"
      ) {
        VStack(alignment: .leading, spacing: 12) {
          Text("You can always use DailyWave without AI.")
            .foregroundStyle(.secondary)
          Text("When you tap an AI button, we’ll ask for Apple Sign-In to protect costs and abuse.")
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.top, 8)
      }
    }
  }

  private var footer: some View {
    HStack(spacing: 12) {
      if step != .welcome {
        Button("Back") { goBack() }
          .buttonStyle(.bordered)
      }

      Spacer()

      Button(nextLabel) {
        Task { await goNext() }
      }
      .buttonStyle(.borderedProminent)
    }
    .padding()
  }

  private var nextLabel: String {
    step == .ai ? "Finish" : "Continue"
  }

  private func goBack() {
    guard let currentIdx = Step.allCases.firstIndex(of: step) else { return }
    if currentIdx > 0 {
      step = Step.allCases[currentIdx - 1]
    }
  }

  private func goNext() async {
    switch step {
    case .welcome:
      step = .chaos

    case .chaos:
      let trimmed = chaosText.trimmingCharacters(in: .whitespacesAndNewlines)
      if !trimmed.isEmpty {
        let service = ChaosService(context: context)
        _ = service.addOrMergeDump(text: trimmed, parsed: nil, status: .inbox)
        try? context.save()
        chaosText = ""
      }
      step = .routine

    case .routine:
      let title = routineTitle.trimmingCharacters(in: .whitespacesAndNewlines)
      if !title.isEmpty {
        guard let normalizedTime = TimeNormalizer.hhmm(routineTime) else {
          alertMessage = "Invalid time. Use HH:MM (24h)."
          return
        }
        let routine = Routine(
          title: title,
          timeHHmm: normalizedTime,
          type: routineType,
          reminderEnabled: routineRemind
        )
        context.insert(routine)
        try? context.save()
      }
      step = .notifications

    case .notifications:
      if notificationsEnabled {
        await requestNotificationsIfNeeded()
        await notifications.rescheduleRoutineNotifications(context: context, enabled: notificationsEnabled)
      } else {
        await notifications.removeAllRoutineNotifications()
      }
      step = .ai

    case .ai:
      hasOnboarded = true
    }
  }

  private func requestNotificationsIfNeeded() async {
    await notifications.refreshAuthorizationStatus()
    switch notifications.authorizationStatus {
    case .notDetermined:
      _ = await notifications.requestAuthorization()
    case .denied:
      alertMessage = "Notifications are disabled in Settings."
    default:
      break
    }
  }
}

private struct OnboardingPage<Content: View>: View {
  let title: String
  let subtitle: String
  let systemImage: String
  @ViewBuilder let content: () -> Content

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        HStack(spacing: 14) {
          ZStack {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
              .fill(.thinMaterial)
              .frame(width: 56, height: 56)
            Image(systemName: systemImage)
              .font(.title2)
          }
          VStack(alignment: .leading, spacing: 6) {
            Text(title)
              .font(.title2.weight(.bold))
            Text(subtitle)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.horizontal)
        .padding(.top, 18)

        content()
          .padding(.bottom, 18)
      }
    }
  }
}

private struct FeatureRow: View {
  let icon: String
  let title: String
  let desc: String

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Image(systemName: icon)
        .frame(width: 28, height: 28)
        .foregroundStyle(.blue)
      VStack(alignment: .leading, spacing: 4) {
        Text(title).font(.headline)
        Text(desc).foregroundStyle(.secondary)
      }
    }
    .padding(.horizontal)
  }
}

