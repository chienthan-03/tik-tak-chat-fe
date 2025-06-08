// Utility functions for emoji handling

/**
 * Kiểm tra xem một chuỗi có chứa emoji hay không
 * @param {string} text - Chuỗi cần kiểm tra
 * @returns {boolean} - True nếu có emoji
 */
export const hasEmoji = (text) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  return emojiRegex.test(text);
};

/**
 * Đếm số lượng emoji trong chuỗi
 * @param {string} text - Chuỗi cần đếm
 * @returns {number} - Số lượng emoji
 */
export const countEmojis = (text) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
};

/**
 * Kiểm tra xem tin nhắn có chỉ chứa emoji hay không
 * @param {string} text - Chuỗi cần kiểm tra
 * @returns {boolean} - True nếu chỉ chứa emoji và khoảng trắng
 */
export const isOnlyEmojis = (text) => {
  const cleanText = text.replace(/\s/g, ''); // Loại bỏ khoảng trắng
  const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/gu;
  return emojiRegex.test(cleanText);
};

/**
 * Tách emoji và text thành các phần riêng biệt
 * @param {string} text - Chuỗi cần tách
 * @returns {Array} - Mảng các phần (text hoặc emoji)
 */
export const parseTextWithEmojis = (text) => {
  const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu;
  return text.split(emojiRegex).filter(part => part.length > 0);
};

/**
 * Lấy kích thước emoji phù hợp dựa trên nội dung tin nhắn
 * @param {string} text - Nội dung tin nhắn
 * @returns {string} - Kích thước CSS cho emoji
 */
export const getEmojiSize = (text) => {
  if (isOnlyEmojis(text)) {
    const emojiCount = countEmojis(text);
    if (emojiCount <= 3) {
      return '2em'; // Emoji lớn cho tin nhắn chỉ có emoji
    }
  }
  return '1.2em'; // Kích thước bình thường
};
