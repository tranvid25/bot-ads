const fs = require('fs');
const { getDailyPostContent } = require('./spintax');
const { file, read, write } = require('./storage');
const { loadConfig } = require('./settings');
const crypto = require('crypto');

const CONFIG_PATH = file('config.json');
const TEMPLATES_PATH = file('templates.json');

function getBatchPrompt(count = 5) {
  const config = loadConfig();
  return `Bạn là một người tự học tiếng Anh đang chia sẻ kinh nghiệm trên các Group Facebook.
Hãy viết đúng ${count} bài đăng chia sẻ kinh nghiệm tự học phát âm tiếng Anh (Pronunciation/Speaking).
Sản phẩm giới thiệu: Web app "PronunReview" (app.pronunreview.com) - nơi thu âm 30 giây để giáo viên người thật nghe và sửa khẩu hình, âm đuôi 1-1 miễn phí.

YÊU CẦU:
1. Mỗi bài viết dài khoảng 100 - 160 từ, ngắt dòng thoáng, dùng emoji sinh động tự nhiên.
2. ${config.commentLinkUnderPost ? 'Không chèn link web vào thân bài; cuối bài ghi link ở bình luận đầu tiên.' : `Chèn địa chỉ ${config.websiteUrl || 'https://app.pronunreview.com'} vào cuối bài.`}
3. Hãy ngăn cách giữa mỗi bài viết bằng đúng chuỗi ký tự: ===POST_SEPARATOR===

Bắt đầu viết:`;
}

async function generatePostsWithGemini(apiKey, count = 5) {
  let models = loadConfig().geminiModels;
  if (!models) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Không lấy được danh sách model Gemini (${response.status}).`);
    const available = await response.json();
    models = (available.models || []).filter(model => model.supportedGenerationMethods?.includes('generateContent') &&
      /flash/.test(model.name) && !/image|audio|tts|live|preview|exp|native/.test(model.name))
      .map(model => model.name.replace(/^models\//, '')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).slice(0, 3);
    if (!models.length) throw new Error('Không có model Flash phù hợp. Cấu hình geminiModels theo quyền API key.');
  }
  
  let lastError = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const payload = {
        contents: [
          { parts: [{ text: getBatchPrompt(count) }] }
        ],
        generationConfig: {
          temperature: 0.8
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${model} Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.filter(part => !part.thought && part.text).map(part => part.text).join('\n');
      if (!rawText) {
        throw new Error(`Không nhận được nội dung từ ${model}.`);
      }

      const rawPosts = rawText.split('===POST_SEPARATOR===')
        .map(p => p.trim())
        .filter(p => p.length > 50);

      if (rawPosts.length > 0) {
        return rawPosts.slice(0, count).map((content, idx) => ({
          id: crypto.randomUUID(),
          title: `AI Story #${Date.now().toString().slice(-4)}_${idx + 1}`,
          content
        }));
      }
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Model ${model} bận, đang chuyển sang model tiếp theo...`);
    }
  }

  throw lastError || new Error('Không thể kết nối đến Gemini.');
}

async function replenishAIPool(count = 5) {
  if (!fs.existsSync(CONFIG_PATH)) return false;
  const config = read('config.json', {});
  const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('Mỗi mẻ AI phải có 1..50 bài.');

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('ℹ️ Chưa có Gemini API Key hợp lệ trong config.json.');
    return false;
  }

  console.log(`🤖 Đang kết nối Gemini AI để tạo mẻ ${count} bài viết độc nhất...`);
  try {
    const newPosts = await generatePostsWithGemini(apiKey, count);
    if (!newPosts || newPosts.length === 0) {
      throw new Error('Không phân tách được bài viết.');
    }

    const existingPool = read('ai_posts_pool.json', []);
    if (!Array.isArray(existingPool)) throw new Error('Kho AI không hợp lệ.');

    const updatedPool = [...existingPool, ...newPosts];
    write('ai_posts_pool.json', updatedPool);
    console.log(`🎉 ĐÃ NẠP THÀNH CÔNG ${newPosts.length} BÀI MỚI VÀO KHO! (Tổng kho hiện có: ${updatedPool.length} bài)`);
    return true;
  } catch (err) {
    console.error('⚠️ Lỗi khi gọi Gemini API:', err.message);
    return false;
  }
}

let configuredIndex = 0;
function getNextPostContent(config = loadConfig()) {
  if (config.selectedPosts) {
    const posts = config.selectedPosts.filter(post => post.selected !== false && typeof post.content === 'string' && post.content.trim());
    if (!posts.length) throw new Error('Chưa chọn bài có nội dung để đăng.');
    const post = posts[configuredIndex++ % posts.length];
    return { source: config.contentMode === 'gemini' ? 'GEMINI_SELECTED' : 'MANUAL_SELECTED', title: post.title || 'Bài đã chọn', content: post.content, imagePath: post.imagePath || null };
  }
  {
      const pool = read('ai_posts_pool.json', []);
      if (!Array.isArray(pool)) throw new Error('Kho AI không hợp lệ.');
      const reserved = require('./history').loadState().attempts.filter(attempt => ['unknown', 'submitting'].includes(attempt.status) || ['success', 'pending_approval'].includes(attempt.status) && !attempt.poolConsumed);
      const post = pool.find(item => !reserved.some(attempt => attempt.poolId ? attempt.poolId === item.id : attempt.content === item.content));
      if (post) {
        if (!post || typeof post.content !== 'string' || !post.content.trim()) {
          throw new Error('Bài đầu tiên trong kho không hợp lệ.');
        }
        if (!post.id) { post.id = crypto.randomUUID(); write('ai_posts_pool.json', pool); }
        console.log(`✨ Lấy bài viết từ KHO AI (Chủ đề: ${post.title} - Còn lại trong kho: ${pool.length} bài)`);
        return {
          source: 'AI_GEMINI',
          poolId: post.id,
          title: post.title,
          content: post.content
        };
      }
  }

  console.log('🔄 Dùng bài viết từ hệ thống Spin-tax dự phòng...');
  const templates = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  const fallback = getDailyPostContent(templates);
  return {
    source: 'SPINTAX_FALLBACK',
    title: fallback.day.toUpperCase(),
    content: fallback.content
  };
}

function confirmPostUsed(post) {
  if (post.source !== 'AI_GEMINI') return;
  const pool = read('ai_posts_pool.json', []);
  const index = pool.findIndex(item => post.poolId ? item.id === post.poolId : item.title === post.title && item.content === post.content);
  if (index < 0) return false; // Idempotent recovery after a crash between pool/state writes.
  pool.splice(index, 1);
  write('ai_posts_pool.json', pool);
  return true;
}

module.exports = {
  confirmPostUsed,
  replenishAIPool,
  getNextPostContent
};
