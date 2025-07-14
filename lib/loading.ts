const FRAME_RATE = 200;

export class LoadingAnimation {
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private hearts = ['💓', '💗', '💖'];
  private message = '';

  start(message: string = 'Loading'): void {
    this.message = message;
    this.currentFrame = 0;

    // Clear any existing interval
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    this.interval = setInterval(() => {
      this.render();
      this.currentFrame++;
    }, FRAME_RATE);
  }

  updateMessage(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear the current line
    process.stdout.write('\r\x1b[K');

    // Show final message if provided
    if (finalMessage) {
      console.log('💚', finalMessage);
    }

    // Show cursor again
    process.stdout.write('\x1b[?25h');
  }

  private render(): void {
    let heartString = this.hearts[this.currentFrame % this.hearts.length];

    // Clear line and write new content
    process.stdout.write(`\r\x1b[K${this.message} ${heartString}`);
  }
}

export const loading = new LoadingAnimation();
