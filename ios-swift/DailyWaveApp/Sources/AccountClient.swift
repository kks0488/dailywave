import Foundation

final class AccountClient {
  private let auth: SupabaseAuthManager

  init(auth: SupabaseAuthManager) {
    self.auth = auth
  }

  func deleteAccount(baseURL: URL) async throws {
    let url = baseURL
      .appendingPathComponent("api")
      .appendingPathComponent("auth")
      .appendingPathComponent("account")
    var req = URLRequest(url: url)
    req.httpMethod = "DELETE"

    guard !auth.accessToken.isEmpty else {
      throw NSError(domain: "DailyWaveAccount", code: 401, userInfo: [NSLocalizedDescriptionKey: "Not signed in."])
    }
    req.setValue("Bearer \(auth.accessToken)", forHTTPHeaderField: "Authorization")

    let (data, response) = try await URLSession.shared.data(for: req)
    try ensureOK(response: response, data: data)
  }

  private func ensureOK(response: URLResponse, data: Data) throws {
    guard let http = response as? HTTPURLResponse else { return }
    guard (200...299).contains(http.statusCode) else {
      let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
      throw NSError(
        domain: "DailyWaveAccount",
        code: http.statusCode,
        userInfo: [NSLocalizedDescriptionKey: message ?? "Request failed (\(http.statusCode))."]
      )
    }
  }
}

