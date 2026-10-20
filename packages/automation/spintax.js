/**
 * Spintax Parser
 * Xử lý cú pháp {từ đồng nghĩa 1|từ đồng nghĩa 2|...}
 * Hỗ trợ cả spintax lồng nhau {a|{b|c}}
 */
function parseSpintax(text) {
  if (!text) return '';
  const regex = /\{([^{}]+)\}/;
  let matches;
  while ((matches = regex.exec(text)) !== null) {
    const options = matches[1].split('|');
    const randomOption = options[Math.floor(Math.random() * options.length)];
    text = text.replace(matches[0], randomOption);
  }
  return text;
}

/**
 * Lấy thứ hiện tại trong tuần (monday, tuesday, ...)
 */
function getCurrentDayKey() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: require('./settings').loadConfig().timezone }).format(new Date()).toLowerCase();
}

/**
 * Lấy template ngẫu nhiên theo ngày hiện tại và giải mã spintax
 */
function getDailyPostContent(templatesData, dayKey = null) {
  const targetDay = dayKey || getCurrentDayKey();
  const dayTemplates = templatesData[targetDay] || templatesData['monday'];
  const selectedTemplate = dayTemplates[Math.floor(Math.random() * dayTemplates.length)];
  return {
    day: targetDay,
    content: parseSpintax(selectedTemplate)
  };
}

module.exports = {
  parseSpintax,
  getCurrentDayKey,
  getDailyPostContent
};
