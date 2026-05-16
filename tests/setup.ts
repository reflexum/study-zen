if (!HTMLElement.prototype.createDiv) {
  HTMLElement.prototype.createDiv = function createDiv(options?: { cls?: string; text?: string }) {
    const element = document.createElement("div");
    if (options?.cls) element.className = options.cls;
    if (options?.text) element.textContent = options.text;
    this.appendChild(element);
    return element;
  };
}

if (!globalThis.createDiv) {
  globalThis.createDiv = function createGlobalDiv(options?: { cls?: string; text?: string }) {
    const element = document.createElement("div");
    if (options?.cls) element.className = options.cls;
    if (options?.text) element.textContent = options.text;
    return element;
  };
}
