import SwiftUI

struct RootView: View {
  @EnvironmentObject private var navigation: AppNavigationModel

  var body: some View {
    TabView(selection: $navigation.selectedTab) {
      TodayView()
        .tabItem { Label("Today", systemImage: "sun.max.fill") }
        .tag(AppNavigationModel.Tab.today)

      WorkflowsView()
        .tabItem { Label("Workflows", systemImage: "square.stack.3d.up.fill") }
        .tag(AppNavigationModel.Tab.workflows)

      ChaosView()
        .tabItem { Label("Chaos", systemImage: "sparkles") }
        .tag(AppNavigationModel.Tab.chaos)

      SettingsView()
        .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        .tag(AppNavigationModel.Tab.settings)
    }
  }
}

