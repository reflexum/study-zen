import { FocusShieldSettings } from "../types";

const ROOT_CLASS = "study-zen-active";

export class FocusShieldService {
  apply(settings: FocusShieldSettings): void {
    this.restore();
    if (!settings.enabled) return;

    document.body.classList.add(ROOT_CLASS);
    document.body.classList.toggle("study-zen-hide-ribbon", settings.hideRibbon);
    document.body.classList.toggle("study-zen-dim-sidebars", settings.dimSidebars);
    document.body.classList.toggle("study-zen-hide-statusbar", settings.hideStatusBar);
    document.body.classList.toggle("study-zen-calm-editor", settings.calmEditor);
  }

  restore(): void {
    document.body.classList.remove(
      ROOT_CLASS,
      "study-zen-hide-ribbon",
      "study-zen-dim-sidebars",
      "study-zen-hide-statusbar",
      "study-zen-calm-editor"
    );
  }
}
