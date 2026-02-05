import Foundation
import SwiftData
import UserNotifications

@MainActor
final class NotificationManager: ObservableObject {
  @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

  func refreshAuthorizationStatus() async {
    let settings = await getNotificationSettings()
    authorizationStatus = settings.authorizationStatus
  }

  func requestAuthorization() async -> Bool {
    do {
      let granted = try await requestAuth(options: [.alert, .sound, .badge])
      await refreshAuthorizationStatus()
      return granted
    } catch {
      await refreshAuthorizationStatus()
      return false
    }
  }

  func removeAllRoutineNotifications() async {
    let center = UNUserNotificationCenter.current()
    let pending = await getPendingRequests()
    let ids = pending.map(\.identifier).filter { $0.hasPrefix("routine-") }
    if !ids.isEmpty {
      center.removePendingNotificationRequests(withIdentifiers: ids)
    }
  }

  func rescheduleRoutineNotifications(context: ModelContext, enabled: Bool) async {
    let routines = (try? context.fetch(FetchDescriptor<Routine>())) ?? []
    await rescheduleRoutineNotifications(routines: routines, enabled: enabled)
  }

  func rescheduleRoutineNotifications(routines: [Routine], enabled: Bool) async {
    await refreshAuthorizationStatus()
    await removeAllRoutineNotifications()

    guard enabled else { return }

    let settings = await getNotificationSettings()
    authorizationStatus = settings.authorizationStatus

    let allowedStatuses: Set<UNAuthorizationStatus> = [.authorized, .provisional, .ephemeral]
    guard allowedStatuses.contains(settings.authorizationStatus) else { return }

    for routine in routines {
      guard routine.reminderEnabled else { continue }
      guard let normalized = TimeNormalizer.hhmm(routine.timeHHmm) else { continue }

      let parts = normalized.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
      let hour = Int(parts.first ?? "0") ?? 0
      let minute = Int(parts.last ?? "0") ?? 0
      guard (0...23).contains(hour), (0...59).contains(minute) else { continue }

      var date = DateComponents()
      date.hour = hour
      date.minute = minute

      let content = UNMutableNotificationContent()
      content.title = "Routine"
      content.body = routine.title
      content.sound = .default

      let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
      let request = UNNotificationRequest(
        identifier: "routine-\(routine.id.uuidString)",
        content: content,
        trigger: trigger
      )

      await addNotificationRequest(request)
    }
  }

  var authorizationLabel: String {
    switch authorizationStatus {
    case .notDetermined: return "Not determined"
    case .denied: return "Denied"
    case .authorized: return "Authorized"
    case .provisional: return "Provisional"
    case .ephemeral: return "Ephemeral"
    @unknown default: return "Unknown"
    }
  }

  // MARK: - Private async bridges

  private func getNotificationSettings() async -> UNNotificationSettings {
    await withCheckedContinuation { continuation in
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        continuation.resume(returning: settings)
      }
    }
  }

  private func getPendingRequests() async -> [UNNotificationRequest] {
    await withCheckedContinuation { continuation in
      UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
        continuation.resume(returning: requests)
      }
    }
  }

  private func requestAuth(options: UNAuthorizationOptions) async throws -> Bool {
    try await withCheckedThrowingContinuation { continuation in
      UNUserNotificationCenter.current().requestAuthorization(options: options) { granted, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: granted)
      }
    }
  }

  private func addNotificationRequest(_ request: UNNotificationRequest) async {
    await withCheckedContinuation { continuation in
      UNUserNotificationCenter.current().add(request) { _ in
        continuation.resume()
      }
    }
  }
}

