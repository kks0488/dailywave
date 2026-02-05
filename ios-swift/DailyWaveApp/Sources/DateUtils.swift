import Foundation

enum DateUtils {
  static func todayKey(date: Date = Date(), calendar: Calendar = .current) -> String {
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    let yyyy = String(components.year ?? 1970)
    let mm = String(components.month ?? 1).pad2
    let dd = String(components.day ?? 1).pad2
    return "\(yyyy)-\(mm)-\(dd)"
  }
}

private extension String {
  var pad2: String {
    count >= 2 ? self : String(repeating: "0", count: 2 - count) + self
  }
}

