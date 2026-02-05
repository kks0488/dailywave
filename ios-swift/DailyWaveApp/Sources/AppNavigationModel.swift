import Foundation

@MainActor
final class AppNavigationModel: ObservableObject {
  enum Tab: Hashable {
    case today
    case workflows
    case chaos
    case settings
  }

  @Published var selectedTab: Tab = .today
  @Published var workflowsPath: [UUID] = []

  func openPipeline(_ pipelineId: UUID) {
    selectedTab = .workflows
    workflowsPath = [pipelineId]
  }
}

