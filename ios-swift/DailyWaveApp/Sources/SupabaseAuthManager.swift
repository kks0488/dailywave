import AuthenticationServices
import CryptoKit
import Foundation
import Security
import Supabase
import UIKit

@MainActor
final class SupabaseAuthManager: NSObject, ObservableObject {
  @Published private(set) var isSignedIn: Bool = false
  @Published private(set) var accessToken: String = ""

  private(set) var supabase: SupabaseClient?
  private var authTask: Task<Void, Never>?

  private var currentNonce: String?
  private var signInContinuation: CheckedContinuation<Void, Error>?

  override init() {
    super.init()
    configureClientIfPossible()
    startAuthListener()
    refreshSessionFromClient()
  }

  func signInWithApple() async throws {
    guard supabase != nil else {
      throw NSError(
        domain: "DailyWaveAuth",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Supabase is not configured."]
      )
    }

    let nonce = randomNonceString()
    currentNonce = nonce

    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.email, .fullName]
    request.nonce = sha256(nonce)

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      self.signInContinuation = continuation
      controller.performRequests()
    }
  }

  func signOut() async {
    guard let supabase else { return }
    do {
      try await supabase.auth.signOut()
    } catch {
      // ignore
    }
    isSignedIn = false
    accessToken = ""
  }

  // MARK: - Private

  private func configureClientIfPossible() {
    let urlString = AppConfig.supabaseURLFromInfoPlist
    let key = AppConfig.supabaseAnonKeyFromInfoPlist
    guard let url = URL(string: urlString), !urlString.isEmpty, !key.isEmpty else {
      supabase = nil
      return
    }

    supabase = SupabaseClient(supabaseURL: url, supabaseKey: key)
  }

  private func startAuthListener() {
    guard let supabase else { return }
    authTask?.cancel()
    authTask = Task {
      for await (_, session) in await supabase.auth.authStateChanges {
        if let session {
          isSignedIn = true
          accessToken = session.accessToken
        } else {
          isSignedIn = false
          accessToken = ""
        }
      }
    }
  }

  private func refreshSessionFromClient() {
    guard let supabase else { return }
    if let session = supabase.auth.currentSession {
      isSignedIn = true
      accessToken = session.accessToken
    } else {
      isSignedIn = false
      accessToken = ""
    }
  }

  private func randomNonceString(length: Int = 32) -> String {
    precondition(length > 0)
    let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remainingLength = length

    while remainingLength > 0 {
      var randoms = [UInt8](repeating: 0, count: 16)
      let status = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
      if status != errSecSuccess {
        return UUID().uuidString.replacingOccurrences(of: "-", with: "")
      }

      for random in randoms {
        if remainingLength == 0 { break }
        let idx = Int(random)
        if idx < charset.count {
          result.append(charset[idx])
          remainingLength -= 1
        }
      }
    }

    return result
  }

  private func sha256(_ input: String) -> String {
    let inputData = Data(input.utf8)
    let hashed = SHA256.hash(data: inputData)
    return hashed.map { String(format: "%02x", $0) }.joined()
  }
}

extension SupabaseAuthManager: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow } ?? UIWindow()
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      signInContinuation?.resume(throwing: NSError(domain: "DailyWaveAuth", code: 2, userInfo: [NSLocalizedDescriptionKey: "Missing Apple credential."]))
      signInContinuation = nil
      return
    }

    guard let nonce = currentNonce else {
      signInContinuation?.resume(throwing: NSError(domain: "DailyWaveAuth", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid auth state."]))
      signInContinuation = nil
      return
    }

    guard let tokenData = appleCredential.identityToken,
          let idToken = String(data: tokenData, encoding: .utf8) else {
      signInContinuation?.resume(throwing: NSError(domain: "DailyWaveAuth", code: 4, userInfo: [NSLocalizedDescriptionKey: "Missing identity token."]))
      signInContinuation = nil
      return
    }

    guard let supabase else {
      signInContinuation?.resume(throwing: NSError(domain: "DailyWaveAuth", code: 5, userInfo: [NSLocalizedDescriptionKey: "Supabase not configured."]))
      signInContinuation = nil
      return
    }

    Task {
      do {
        _ = try await supabase.auth.signInWithIdToken(
          credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
        )
        signInContinuation?.resume()
        signInContinuation = nil
      } catch {
        signInContinuation?.resume(throwing: error)
        signInContinuation = nil
      }
    }
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    signInContinuation?.resume(throwing: error)
    signInContinuation = nil
  }
}

