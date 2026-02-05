import Foundation

struct BackendURLStore {
  private let key = "dw_backend_url"

  func baseURL() throws -> URL {
    let fromDefaults = (UserDefaults.standard.string(forKey: key) ?? "")
      .trimmingCharacters(in: .whitespacesAndNewlines)
    let fromInfo = AppConfig.backendURLFromInfoPlist
    let raw = !fromDefaults.isEmpty ? fromDefaults : fromInfo

    guard !raw.isEmpty, let url = URL(string: raw) else {
      throw NSError(
        domain: "DailyWaveConfig",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Backend URL is not configured."]
      )
    }
    return url
  }
}

