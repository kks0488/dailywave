import Foundation

struct AIStatus: Decodable, Equatable {
  struct RateLimits: Decodable, Equatable {
    var per_minute: Int
    var per_hour: Int
  }

  var ai_proxy_reachable: Bool
  var gemini_configured: Bool
  var memu_reachable: Bool
  var require_supabase_auth_for_ai: Bool
  var rate_limits: RateLimits
}

struct AIAskResponse: Decodable, Equatable {
  var text: String
}

struct AIAskRequest: Encodable {
  var prompt: String
  var user_id: String?
  var temperature: Double?
  var max_tokens: Int?
}

final class AIProxyClient {
  private let auth: SupabaseAuthManager

  init(auth: SupabaseAuthManager) {
    self.auth = auth
  }

  func getStatus(baseURL: URL) async throws -> AIStatus {
    let url = baseURL
      .appendingPathComponent("api")
      .appendingPathComponent("ai")
      .appendingPathComponent("status")
    var req = URLRequest(url: url)
    req.httpMethod = "GET"

    let (data, response) = try await URLSession.shared.data(for: req)
    try ensureOK(response: response, data: data)
    return try JSONDecoder.dailyWave.decode(AIStatus.self, from: data)
  }

  func ask(baseURL: URL, prompt: String, userId: String?) async throws -> String {
    let url = baseURL
      .appendingPathComponent("api")
      .appendingPathComponent("ai")
      .appendingPathComponent("ask")
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if !auth.accessToken.isEmpty {
      req.setValue("Bearer \(auth.accessToken)", forHTTPHeaderField: "Authorization")
    }

    let body = AIAskRequest(prompt: prompt, user_id: userId, temperature: 0.7, max_tokens: 2048)
    req.httpBody = try JSONEncoder.dailyWave.encode(body)

    let (data, response) = try await URLSession.shared.data(for: req)
    try ensureOK(response: response, data: data)
    return try JSONDecoder.dailyWave.decode(AIAskResponse.self, from: data).text
  }

  private func ensureOK(response: URLResponse, data: Data) throws {
    guard let http = response as? HTTPURLResponse else { return }
    guard (200...299).contains(http.statusCode) else {
      let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
      throw NSError(
        domain: "DailyWaveAI",
        code: http.statusCode,
        userInfo: [NSLocalizedDescriptionKey: message ?? "Request failed (\(http.statusCode))."]
      )
    }
  }
}

