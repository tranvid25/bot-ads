const fs = require('fs');
const path = require('path');
const { getDailyPostContent } = require('./spintax');

const POOL_PATH = path.join(__dirname, 'ai_posts_pool.json');
const TEMPLATES_PATH = path.join(__dirname, 'templates.json');

console.log('========================================================');
console.log('👀 XEM THỬ BÀI VIẾT TỰ ĐỘNG SINH CHO HÔM NAY');
console.log('========================================================\n');

// 1. Kiểm tra kho bài AI
if (fs.existsSync(POOL_PATH)) {
  try {
    const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
    if (pool.length > 0) {
      console.log(`🧠 [KHO BÀI AI HIỆN CÓ: ${pool.length} BÀI ĐỘC NHẤT]`);
      pool.slice(0, 3).forEach((p, idx) => {
        console.log(`\n--- [BÀI AI #${idx + 1}: ${p.title}] ---`);
        console.log(p.content);
        console.log('--------------------------------------------------------');
      });
      console.log('\n');
    }
  } catch {}
}

// 2. Bài mẫu Spintax dự phòng
if (fs.existsSync(TEMPLATES_PATH)) {
  const templates = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  const post = getDailyPostContent(templates);
  console.log(`🔄 [MẪU DỰ PHÒNG SPINTAX CHO THỨ ${post.day.toUpperCase()}]`);
  console.log(post.content);
  console.log('--------------------------------------------------------\n');
}
