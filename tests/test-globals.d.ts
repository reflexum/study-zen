declare global {
  function createDiv(options?: { cls?: string; text?: string }): HTMLDivElement;

  interface HTMLElement {
    createDiv(options?: { cls?: string; text?: string }): HTMLDivElement;
  }
}

export {};
