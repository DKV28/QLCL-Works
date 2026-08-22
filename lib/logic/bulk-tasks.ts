// Bộ phân tích "nhập hàng loạt": mỗi dòng dán vào -> một công việc.
// Logic thuần (không phụ thuộc Supabase/UI) để client xem trước và server
// tạo dữ liệu dùng CHUNG một quy tắc -> preview khớp kết quả thực tế.

export interface ParsedBulkLine {
  title: string;
  /** Deadline riêng của dòng (YYYY-MM-DD) nếu người dùng ghi kèm; null nếu không. */
  dueDate: string | null;
}

// Ký hiệu đầu dòng thường gặp khi dán từ danh sách: -, *, •, ·, "1.", "1)"
const LEADING_MARKER = /^\s*(?:[-*•·]|\d+[.)])\s+/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Nhận diện một chuỗi ngày ở nhiều định dạng phổ biến:
 *   dd/mm, dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd (và dùng "." làm dấu phân cách).
 * Trả về YYYY-MM-DD hợp lệ, hoặc null nếu không phải ngày.
 */
export function parseDateToken(token: string, defaultYear: number): string | null {
  const t = token.trim();
  if (!t) return null;

  // yyyy-mm-dd (ISO)
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd/mm/yyyy hoặc dd-mm-yyyy
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000; // "26" -> 2026
    return buildDate(year, Number(dmy[2]), Number(dmy[1]));
  }

  // dd/mm (thiếu năm -> dùng năm mặc định)
  const dm = /^(\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (dm) {
    return buildDate(defaultYear, Number(dm[2]), Number(dm[1]));
  }

  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Kiểm tra ngày có thực (vd 31/02 -> loại).
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Phân tích một dòng: bỏ ký hiệu đầu dòng, tách deadline riêng nếu có
 * (cú pháp "Tên công việc | 25/09" hoặc "Tên công việc @25/09/2026").
 * Chỉ tách phần ngày khi nó thật sự là ngày hợp lệ, tránh cắt nhầm tiêu đề.
 */
export function parseBulkLine(
  raw: string,
  defaultYear: number,
): ParsedBulkLine | null {
  const cleaned = raw.replace(LEADING_MARKER, "").trim();
  if (!cleaned) return null;

  // Thử tách theo dấu phân tách deadline, ưu tiên "|" rồi "@".
  for (const sep of ["|", "@"]) {
    const idx = cleaned.lastIndexOf(sep);
    if (idx > 0) {
      const maybeTitle = cleaned.slice(0, idx).trim();
      const maybeDate = cleaned.slice(idx + 1).trim();
      const parsed = parseDateToken(maybeDate, defaultYear);
      if (parsed && maybeTitle) {
        return { title: maybeTitle, dueDate: parsed };
      }
    }
  }

  return { title: cleaned, dueDate: null };
}

/** Phân tích cả khối văn bản dán vào thành danh sách công việc. */
export function parseBulkTasks(
  raw: string,
  defaultYear: number,
): ParsedBulkLine[] {
  return raw
    .split(/\r?\n/)
    .map((line) => parseBulkLine(line, defaultYear))
    .filter((x): x is ParsedBulkLine => x !== null);
}
