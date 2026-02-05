import SwiftUI

struct FocusTimerView: View {
  let stepTitle: String
  let workflowTitle: String
  let duration: TimeInterval
  let onMarkDone: () -> Void

  @Environment(\.dismiss) private var dismiss

  @State private var startDate = Date()
  @State private var now = Date()

  private var elapsed: TimeInterval { max(0, now.timeIntervalSince(startDate)) }
  private var remaining: TimeInterval { max(0, duration - elapsed) }
  private var progress: Double { duration > 0 ? min(1, elapsed / duration) : 1 }

  var body: some View {
    NavigationStack {
      VStack(spacing: 18) {
        VStack(spacing: 6) {
          Text(stepTitle)
            .font(.title3.weight(.semibold))
            .multilineTextAlignment(.center)
          Text(workflowTitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.top, 18)

        ZStack {
          Circle()
            .stroke(.gray.opacity(0.2), lineWidth: 14)
          Circle()
            .trim(from: 0, to: progress)
            .stroke(.blue, style: StrokeStyle(lineWidth: 14, lineCap: .round))
            .rotationEffect(.degrees(-90))
            .animation(.linear(duration: 0.2), value: progress)

          Text(format(seconds: remaining))
            .font(.largeTitle.monospacedDigit().weight(.bold))
        }
        .frame(width: 220, height: 220)

        Text(remaining <= 0 ? "Time’s up. Either stop or mark it done." : "Just start. Ten minutes is enough.")
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal)

        HStack(spacing: 12) {
          Button("Stop") { dismiss() }
            .buttonStyle(.bordered)

          Button("Mark done") {
            onMarkDone()
            dismiss()
          }
          .buttonStyle(.borderedProminent)
        }
        .padding(.bottom, 24)
      }
      .navigationTitle("Focus")
      .navigationBarTitleDisplayMode(.inline)
      .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { value in
        now = value
      }
    }
  }

  private func format(seconds: TimeInterval) -> String {
    let total = Int(seconds.rounded(.down))
    let m = max(0, total / 60)
    let s = max(0, total % 60)
    return String(format: "%02d:%02d", m, s)
  }
}

