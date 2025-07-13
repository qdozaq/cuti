import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';

/**
 * Prompt the user for input
 * @param question - The question to ask
 * @param options - Options for the prompt
 * @returns The user's input
 */
export async function prompt(
  question: string,
  options: { hidden?: boolean } = {}
): Promise<string> {
  const rl = createInterface({ input, output });

  return new Promise((resolve) => {
    if (options.hidden) {
      // For hidden input (like passwords), we need to handle it manually
      output.write(question);
      input.setRawMode(true);
      input.resume();
      input.setEncoding('utf8');

      let hiddenInput = '';
      const onData = (char: string) => {
        const charCode = char.charCodeAt(0);

        // Handle special characters
        if (charCode === 3) {
          // Ctrl+C
          process.exit(0);
        } else if (charCode === 13) {
          // Enter
          input.setRawMode(false);
          input.pause();
          input.removeListener('data', onData);
          output.write('\n');
          rl.close();
          resolve(hiddenInput);
        } else if (charCode === 127) {
          // Backspace
          if (hiddenInput.length > 0) {
            hiddenInput = hiddenInput.slice(0, -1);
            output.write('\b \b');
          }
        } else {
          // Regular character
          hiddenInput += char;
          output.write('*');
        }
      };

      input.on('data', onData);
    } else {
      // Normal visible input
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Prompt for confirmation (yes/no)
 * @param question - The question to ask
 * @param defaultValue - Default value if user just presses enter
 * @returns true for yes, false for no
 */
export async function confirm(
  question: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const defaultHint = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} [${defaultHint}]: `);

  if (!answer) {
    return defaultValue;
  }

  const normalized = answer.toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}
