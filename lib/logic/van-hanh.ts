// Logic thuần: định nghĩa Quy trình VẬN HÀNH (kiểm soát tài liệu, TA2.QLCL.QT.06
// mục 4.2 — do P. QLCL phụ trách). KHÔNG phụ thuộc Supabase/UI, dễ test.
//
// Nghiệp vụ đã chốt:
//   - SLA = SLA gốc trong quy trình × 1.5, làm tròn lên (đơn vị: ngày làm việc).
//   - Đã BỎ 3 bước: Viết mới/sửa đổi tài liệu, In tài liệu, Scan & phát hành.
//   - Đi thẳng theo thứ tự; cần rẽ nhánh/quay lại/thu hồi thì chỉnh tay.
//   - Vai trò (role) chỉ để hiển thị tham khảo; người phụ trách công việc giữ
//     nguyên xuyên suốt như một công việc bình thường.

export interface VanHanhStep {
  code: string; // khớp giá trị lưu ở tasks.van_hanh_step
  order: number; // thứ tự tăng dần
  label: string; // nhãn hiển thị
  role: string; // vai trò tham khảo (không dùng để gán người)
  slaDays: number; // số ngày làm việc để tính deadline khi CHUYỂN vào bước này
}

// Deadline mặc định khi TẠO mới công việc quy trình (bắt đầu ở bước Duyệt yêu cầu).
// Người dùng chọn +9 ngày làm việc — khác với SLA của bước 1; chỉ áp dụng lúc tạo.
export const DEFAULT_FIRST_STEP_DAYS = 9;

// 9 bước theo thứ tự (đã bỏ viet_moi_sua_doi, in_tai_lieu, scan_phat_hanh).
export const VAN_HANH_STEPS: VanHanhStep[] = [
  { code: "duyet_yeu_cau", order: 1, label: "Duyệt yêu cầu", role: "P. QLCL", slaDays: 3 },
  { code: "duyet_truoc_gop_y", order: 2, label: "Duyệt trước khi góp ý", role: "P. QLCL", slaDays: 3 },
  { code: "gop_y", order: 3, label: "Góp ý tài liệu", role: "Đơn vị liên quan", slaDays: 5 },
  { code: "tong_hop_cap_ma", order: 4, label: "Tổng hợp góp ý & cấp mã tài liệu", role: "P. QLCL", slaDays: 3 },
  { code: "chinh_sua_noi_dung", order: 5, label: "Chỉnh sửa nội dung", role: "ĐVST", slaDays: 3 },
  { code: "ra_soat_sau_chinh_sua", order: 6, label: "Rà soát sau chỉnh sửa", role: "P. QLCL", slaDays: 3 },
  { code: "phe_duyet_noi_dung", order: 7, label: "Phê duyệt nội dung (BGĐ)", role: "Phó TGĐ", slaDays: 5 },
  { code: "yeu_cau_trinh_ky", order: 8, label: "Yêu cầu trình ký tài liệu", role: "P. QLCL", slaDays: 2 },
  { code: "trinh_ky", order: 9, label: "Trình ký tài liệu", role: "P. QLCL", slaDays: 5 },
];

/** Mã bước đầu tiên (mặc định khi tạo công việc quy trình). */
export const FIRST_STEP_CODE = VAN_HANH_STEPS[0].code;

/** Lấy định nghĩa bước theo mã. undefined nếu mã không hợp lệ. */
export function getStep(code: string | null | undefined): VanHanhStep | undefined {
  if (!code) return undefined;
  return VAN_HANH_STEPS.find((s) => s.code === code);
}

/** Bước kế tiếp theo thứ tự. undefined nếu đang ở bước cuối hoặc mã không hợp lệ. */
export function getNextStep(code: string | null | undefined): VanHanhStep | undefined {
  const current = getStep(code);
  if (!current) return undefined;
  return VAN_HANH_STEPS.find((s) => s.order === current.order + 1);
}

/** Có phải bước cuối cùng không (bấm "Bước tiếp theo" ở đây → Hoàn thành). */
export function isLastStep(code: string | null | undefined): boolean {
  const current = getStep(code);
  return !!current && current.order === VAN_HANH_STEPS.length;
}

/** Nhãn hiển thị của bước (rơi về chính mã nếu không tìm thấy). */
export function stepLabel(code: string | null | undefined): string {
  return getStep(code)?.label ?? code ?? "";
}
