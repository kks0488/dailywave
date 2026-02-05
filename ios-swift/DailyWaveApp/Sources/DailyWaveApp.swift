import SwiftUI
import SwiftData

@main
struct DailyWaveApp: App {
  @AppStorage("hasOnboarded") private var hasOnboarded: Bool = false

  @StateObject private var auth = SupabaseAuthManager()
  @StateObject private var navigation = AppNavigationModel()
  @StateObject private var notifications = NotificationManager()

  private var container: ModelContainer {
    let schema = Schema([
      Pipeline.self,
      Step.self,
      Routine.self,
      ChaosDump.self,
      HistoryEvent.self,
    ])

    do {
      return try ModelContainer(for: schema)
    } catch {
      fatalError("Failed to create SwiftData container: \(error)")
    }
  }

  var body: some Scene {
    WindowGroup {
      Group {
        if hasOnboarded {
          RootView()
        } else {
          OnboardingView()
        }
      }
        .environmentObject(auth)
        .environmentObject(navigation)
        .environmentObject(notifications)
        .modelContainer(container)
    }
  }
}
