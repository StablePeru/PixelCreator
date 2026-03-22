import type { OutputFormat, CommandResult } from '../types/common.js';

export function formatOutput<T>(
  format: OutputFormat,
  result: CommandResult<T>,
  textFn: (result: T) => void,
): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(result, null, 2));
      break;
    case 'silent':
      break;
    case 'text':
    default:
      textFn(result.result);
      break;
  }
}

export function makeResult<T>(
  command: string,
  args: Record<string, unknown>,
  result: T,
  startTime: number,
): CommandResult<T> {
  return {
    success: true,
    command,
    args,
    result,
    duration: Date.now() - startTime,
  };
}

export function makeErrorResult(
  command: string,
  args: Record<string, unknown>,
  error: string,
  startTime: number,
): CommandResult<{ error: string }> {
  return {
    success: false,
    command,
    args,
    result: { error },
    duration: Date.now() - startTime,
  };
}
