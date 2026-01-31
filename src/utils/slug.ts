/**
 * Chuyển tiêu đề (có dấu tiếng Việt) thành slug URL-friendly.
 * VD: "Bài tập ngữ pháp 1" → "bai-tap-ngu-phap-1"
 */
export function toSlug(title: string): string {
  if (!title || typeof title !== "string") return "";
  const from =
    "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ";
  const to =
    "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD";
  let s = title.trim();
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from[i], "g"), to[i]);
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;

/**
 * Tạo đoạn URL slug-id từ slug (hoặc title) và id.
 * VD: buildSlugId("bai-tap-1", "507f1f77bcf86cd799439011") → "bai-tap-1-507f1f77bcf86cd799439011"
 */
export function buildSlugId(slugOrTitle: string, id: string): string {
  const slug = slugOrTitle && slugOrTitle.length > 0 ? toSlug(slugOrTitle) : "item";
  return `${slug}-${id}`;
  return slug;
}

/**
 * Tách slug-id trong URL thành id (để gọi API).
 * Nếu param là "bai-tap-1-507f1f77bcf86cd799439011" → id = "507f1f77bcf86cd799439011"
 * Nếu param chỉ là id (24 hex) → trả về luôn (backward compat).
 */
export function parseSlugId(param: string | undefined): string {
  if (!param) return "";
  const parts = param.split("-");
  const last = parts[parts.length - 1];
  if (last && OBJECT_ID_REGEX.test(last)) return last;
  return param;
}
