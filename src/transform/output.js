import { writeFileSync } from 'fs';
import { format } from 'prettier';

function output(code, target, parser = 'babel') {
  try {
    const formatCode = format(code, { parser });
    writeFileSync(target, formatCode);
  } catch {
    writeFileSync(target, code);
  }
}

export default output;
