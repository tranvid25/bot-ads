const { replenishAIPool } = require('./ai_generator');

async function main() {
  console.log('========================================================');
  console.log('🧠 TẠO KHO BÀI VIẾT TỰ ĐỘNG BẰNG GOOGLE GEMINI AI');
  console.log('========================================================\n');

  const count = parseInt(process.argv[2], 10) || 10;
  console.log(`Đang yêu cầu sinh ${count} bài viết mới...`);
  
  const success = await replenishAIPool(count);
  if (success) {
    console.log('\n✅ Quá trình tạo bài viết AI hoàn tất!');
    console.log('👉 Các bài viết đã được lưu vào file ai_posts_pool.json và sẵn sàng để đăng.');
  } else {
    console.log('\n💡 Hướng dẫn nhận Gemini API Key hoàn toàn MIỄN PHÍ:');
    console.log('1. Truy cập: https://aistudio.google.com');
    console.log('2. Bấm "Get API key" -> Tạo 1 Key mới.');
    console.log('3. Dán key vào mục "geminiApiKey" trong file config.json');
    console.log('👉 Trong lúc chưa có key, bot sẽ tự động dùng bộ mẫu Spin-tax thông minh!');
  }
}

if (require.main === module) require('./runtime').cli(main);
module.exports = { main };
