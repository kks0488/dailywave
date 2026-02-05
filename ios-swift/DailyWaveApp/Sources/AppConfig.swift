import Foundation

enum AppConfig {
  static var backendURLFromInfoPlist: String {
    (Bundle.main.object(forInfoDictionaryKey: "DW_BACKEND_URL") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }

  static var supabaseURLFromInfoPlist: String {
    (Bundle.main.object(forInfoDictionaryKey: "DW_SUPABASE_URL") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }

  static var supabaseAnonKeyFromInfoPlist: String {
    (Bundle.main.object(forInfoDictionaryKey: "DW_SUPABASE_ANON_KEY") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }
}

