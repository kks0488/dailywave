import SwiftUI

enum DesignTokens {
  static func color(for name: String) -> Color {
    switch name.lowercased() {
    case "red": return .red
    case "green": return .green
    case "purple": return .purple
    case "orange": return .orange
    case "pink": return .pink
    case "cyan": return .cyan
    case "teal": return .teal
    case "indigo": return .indigo
    case "yellow": return .yellow
    default: return .blue
    }
  }

  static func iconName(for type: String) -> String {
    switch type.lowercased() {
    case "zap": return "bolt.fill"
    case "box": return "shippingbox.fill"
    case "link": return "link"
    case "palette": return "paintpalette.fill"
    case "sun": return "sun.max.fill"
    default: return "briefcase.fill"
    }
  }
}

