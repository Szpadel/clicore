export function renderTable(table: string[][], {offset = 0, minPad = 1} = {}) {
  if (table.length === 0) {
    return '';
  }

  const s = ' '.repeat(offset);
  const cols = table[0].length;
  const maxColLengths: number[] = [];
  for (let a = 0; a < cols; a++) {
    maxColLengths[a] = maxLenght(getCol(table, a));
    if (maxColLengths[a] < minPad) {
      maxColLengths[a] = minPad;
    }
  }

  return table
    .map(
      (row) => row
        .map((text, index) => pad(text, maxColLengths[index]))
        .join(' ')
    )
    .map(text => `${s}${text}`)
    .join('\n');
}

function pad(text: string, len: number) {
  const spacesRequired = len - text.length;
  const s = ' '.repeat(spacesRequired);
  return `${text}${s}`;
}

function maxLenght(col: string[]) {
  return col
    .reduce((max, text) => {
      if (text.length > max) {
        return text.length;
      }
      return max;
    }, 0);
}

function getCol(table: string[][], colNum: number): string[] {
  return table
    .reduce((col, row) => {
      col.push(row[colNum]);
      return col;
    }, []);
}
