// Logic thuần: định nghĩa Quy trình VẬN HÀNH (kiểm soát tài liệu, TA2.QLCL.QT.06
// mục 4.2 — do P. QLCL phụ trách). KHÔNG phụ thuộc Supabase/UI, dễ test.
//
// LƯU Ý: Danh mục bước + SLA + NHÁNH chuyển bước nay lưu trong DB
// (workflow_step_settings + workflow_transitions, migration 0018 & 0026) và do
// admin cấu hình. Mảng VAN_HANH_STEPS bên dưới chỉ còn là DỰ PHÒNG (fallback)
// khi chưa đọc được DB (đang deploy) và làm giá trị mặc định lúc khởi tạo UI.
// Giữ đồng bộ với seed trong migration 0026.
//
// Nghiệp vụ:
//   - Quy trình PHI TUYẾN TÍNH: có bước duyệt/từ chối/quay lại (xem transitions).
//   - Vai trò (role) chỉ để hiển thị tham khảo; người phụ trách công việc giữ
//     nguyên xuyên suốt như một công việc bình thường.

export interface VanHanhStep {
  code: string; // khớp giá trị lưu ở tasks.van_hanh_step
  order: number; // thứ tự tăng dần
  label: string; // nhãn hiển thị
  role: string; // vai trò tham khảo (không dùng để gán người)
  slaDays: number; // số ngày làm việc để tính deadline khi CHUYỂN vào bước này
}

// (Đã bỏ) Trước đây deadline mặc định lúc tạo là +9 ngày; nay deadline lấy theo
// SLA của bước được chọn trên form. Giữ hằng số để không vỡ import cũ nếu có.
export const DEFAULT_FIRST_STEP_DAYS = 9;

// Bảng màu vai trò tham khảo theo mẫu quy trình của người dùng.
export const WORKFLOW_STEP_COLOR_PRESETS = [
  { label: "Đơn vị kiểm soát", color: "#EC5AA6" },
  { label: "Đơn vị soạn thảo", color: "#1736C4" },
  { label: "Ban giám đốc", color: "#FF9F70" },
  { label: "Đơn vị liên quan", color: "#4FE7AD" },
] as const;

export const DEFAULT_WORKFLOW_STEP_COLOR =
  WORKFLOW_STEP_COLOR_PRESETS[0].color;

export function workflowStepColorForRole(role: string): string {
  if (role === "ĐVST") return WORKFLOW_STEP_COLOR_PRESETS[1].color;
  if (role === "Phó TGĐ") return WORKFLOW_STEP_COLOR_PRESETS[2].color;
  if (role === "Đơn vị liên quan") return WORKFLOW_STEP_COLOR_PRESETS[3].color;
  return WORKFLOW_STEP_COLOR_PRESETS[0].color;
}

// 18 bước theo email P.QLCL (khớp seed migration 0026). Chỉ dùng làm fallback.
export const VAN_HANH_STEPS: VanHanhStep[] = [
  { code: "moi_tao", order: 1, label: "Mới tạo", role: "P. QLCL", slaDays: 0 },
  { code: "yeu_cau_duyet", order: 2, label: "Yêu cầu duyệt", role: "P. QLCL", slaDays: 3 },
  { code: "duyet_yeu_cau", order: 3, label: "Duyệt yêu cầu", role: "P. QLCL", slaDays: 9 },
  { code: "tu_choi_yeu_cau", order: 4, label: "Từ chối yêu cầu", role: "P. QLCL", slaDays: 0 },
  { code: "duyet_truoc_gop_y", order: 5, label: "Duyệt trước khi góp ý", role: "P. QLCL", slaDays: 3 },
  { code: "gop_y", order: 6, label: "Góp ý", role: "Đơn vị liên quan", slaDays: 5 },
  { code: "tong_hop_gop_y", order: 7, label: "Tổng hợp góp ý", role: "P. QLCL", slaDays: 3 },
  { code: "tiep_nhan_ra_soat", order: 8, label: "Tiếp nhận và rà soát", role: "P. QLCL", slaDays: 3 },
  { code: "chinh_sua_noi_dung", order: 9, label: "Chỉnh sửa nội dung", role: "ĐVST", slaDays: 3 },
  { code: "ra_soat_sau_chinh_sua", order: 10, label: "Rà soát sau chỉnh sửa", role: "P. QLCL", slaDays: 3 },
  { code: "cho_bgd_duyet", order: 11, label: "Chờ BGĐ duyệt", role: "Phó TGĐ", slaDays: 5 },
  { code: "bgd_da_duyet", order: 12, label: "BGĐ đã duyệt", role: "Phó TGĐ", slaDays: 3 },
  { code: "bgd_khong_duyet", order: 13, label: "BGĐ không duyệt", role: "Phó TGĐ", slaDays: 2 },
  { code: "yeu_cau_trinh_ky", order: 14, label: "Yêu cầu trình ký", role: "P. QLCL", slaDays: 2 },
  { code: "xet_duyet_trinh_ky", order: 15, label: "Xét duyệt trình ký", role: "P. QLCL", slaDays: 2 },
  { code: "tu_choi_trinh_ky", order: 16, label: "Từ chối trình ký", role: "P. QLCL", slaDays: 2 },
  { code: "cho_giam_doc_ky", order: 17, label: "Chờ Giám đốc ký", role: "Phó TGĐ", slaDays: 7 },
  { code: "ban_hanh", order: 18, label: "Ban hành", role: "P. QLCL", slaDays: 2 },
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
