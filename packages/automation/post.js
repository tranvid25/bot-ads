const fs = require('fs');
const { confirmPostUsed } = require('./ai_generator');
const { beginAttempt, updateAttempt, recordPostResult } = require('./history');
const { readEvidence, waitForPostResult } = require('./post_verification');
const { sleep, assertAccountReady, HaltError, authorizeSubmission } = require('./runtime');
const { dropCommentLink, commentOnAttempt } = require('./comments');

async function closeAnyPopups(page) {
  const closeSelectors = [
    'div[aria-label="Đóng"][role="button"]',
    'div[aria-label="Close"][role="button"]',
    'div[role="dialog"] [aria-label="Đóng"]',
    'div[role="dialog"] [aria-label="Close"]',
    'div[aria-label="Hủy"][role="button"]',
    'div[aria-label="Cancel"][role="button"]'
  ];

  for (const sel of closeSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('🛡️ Đã tự động tắt popup che màn hình.');
      await btn.click().catch(() => {});
      await sleep(1000);
      break;
    }
  }
}

async function postToGroup(page, groupUrl, postData, imagePath, config) {
  let submissionStarted = false;
  let attemptId = null;
  let confirmed = false;
  console.log(`\n--------------------------------------------------`);
  console.log(`🌐 Đang truy cập nhóm: ${groupUrl}`);
  
  try {
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    console.log('⏳ Đang chờ Facebook tải bảng tin nhóm...');
    await sleep(5000);
    await assertAccountReady(page);

    await closeAnyPopups(page);

    // Older configurations may still contain search results that were never joined.
    const membership = page.getByRole('button', { name: /^(Joined|Đã tham gia)$/i }).first();
    await membership.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      throw new Error('Chưa xác nhận bạn là thành viên nhóm. Chạy đồng bộ nhóm đã tham gia trước.');
    });

    await page.mouse.wheel(0, 200);
    await sleep(1500);

    // 1. Tìm ô mở hộp thoại đăng bài
    console.log('🔍 Đang tìm ô tạo bài viết (Hỗ trợ cả Anonymous post / Viết gì đi...)...');
    const triggerSelectors = [
      'div[role="button"]:has-text("Write something")',
      'div[role="button"]:has-text("Bạn viết gì đi")',
      'div[role="button"]:has-text("Viết gì đó")',
      'span:has-text("Write something")',
      'span:has-text("Bạn viết gì đi")',
      'span:has-text("Viết gì đó")'
    ];

    let triggerFound = false;
    for (const sel of triggerSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log(`👉 Đã tìm thấy nút mở bài viết! Bấm mở...`);
        await el.click();
        triggerFound = true;
        break;
      }
    }

    if (!triggerFound) {
      const triggerText = page.getByText(/write something|bạn viết gì đi|viết gì đó/i).first();
      if (await triggerText.isVisible({ timeout: 3000 }).catch(() => false)) {
        await triggerText.click();
        triggerFound = true;
      }
    }

    if (!triggerFound) {
      throw new Error('Không thể mở ô tạo bài viết (Nhóm có thể đang tải chậm hoặc chưa mở quyền đăng).');
    }

    // Tự động bấm xác nhận "Tạo bài viết ẩn danh" nếu có
    await sleep(1500);
    const anonConfirmBtn = page.locator('div[role="dialog"] [role="button"]:has-text("Create Anonymous Post"), div[role="dialog"] [role="button"]:has-text("Tạo bài viết ẩn danh"), div[role="dialog"] [role="button"]:has-text("I want to post anonymously"), div[role="dialog"] [role="button"]:has-text("Tôi muốn đăng ẩn danh")').first();
    if (await anonConfirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      console.log('🕶️ Đã bấm xác nhận Đăng ẩn danh (Create Anonymous Post)!');
      await anonConfirmBtn.click();
      await sleep(2000);
    }

    // 2. Chờ modal soạn bài xuất hiện (Bắt buộc là dialog có chứa ô nhập văn bản)
    console.log('📝 Đang chờ modal soạn bài xuất hiện...');
    const dialog = page.locator('div[role="dialog"]:has(div[role="textbox"]), div[role="dialog"]:has([contenteditable="true"])').first();
    await dialog.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(1500);

    // 3. Chuẩn bị nội dung bài viết
    let finalContent = postData.content;
    // Nếu cấu hình thả link ở comment thì thân bài thay link web bằng câu kêu gọi
    if (config.commentLinkUnderPost && !config.selectedPosts) {
      finalContent = finalContent.replace(/https?:\/\/app\.pronunreview\.com/g, '(Link ở comment đầu tiên nhé)');
    }

    const editor = dialog.locator('div[role="textbox"], [contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    await editor.click();
    await sleep(800);

    console.log(`✍️ Đang nhập nội dung bài viết [Nguồn: ${postData.source}]...`);
    await page.keyboard.insertText(finalContent);
    await sleep(2000);

    // 4. ĐÍNH KÈM ẢNH TRỰC TIẾP TỪ ĐƯỜNG DẪN (KHÔNG BẬT FOLDER)
    if (config.attachImage) {
      if (!imagePath || !fs.existsSync(imagePath)) throw new Error('Thiếu ảnh đính kèm. Kiểm tra cấu hình images.');
      console.log(`🖼️ Đang nạp ảnh trực tiếp: ${imagePath}`);
      const fileInput = dialog.locator('input[type="file"][accept*="image"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(imagePath);
        console.log('⏳ Đang chờ ảnh tải lên hoàn tất...');
        await sleep(5000);
        console.log('✅ Đã đính kèm ảnh thành công mà không mở folder!');
      } else { throw new Error('Không tìm thấy ô tải ảnh trong hộp soạn bài.'); }
    }

    // 5. Tìm nút Đăng
    console.log('🚀 Đang chuẩn bị bấm nút ĐĂNG...');
    const postBtn = dialog.getByRole('button', { name: /^(Post|Đăng|Submit|Gửi)$/i });
    await postBtn.waitFor({ state: 'visible', timeout: 10000 });

    for (let check = 0; check < 10; check++) {
      const disabled = await postBtn.getAttribute('aria-disabled');
      if (disabled !== 'true') break;
      await sleep(1000);
    }

    const before = await readEvidence(page);
    await assertAccountReady(page);
    const reservation = await authorizeSubmission({ groupUrl, postData, finalContent });
    attemptId = beginAttempt(groupUrl, postData, finalContent, reservation?.id);
    updateAttempt(attemptId, { beforeLinks: before.articles.flatMap(article => article.links),
      ...(config.cloudJobId ? { cloudJobId: config.cloudJobId, commentConfig: { commentLinkUnderPost: config.commentLinkUnderPost, commentWebsiteUrl: config.commentWebsiteUrl, commentContent: config.commentContent } } : {}) });
    submissionStarted = true;
    await postBtn.click();
    console.log('📤 Đã bấm nút ĐĂNG! Đang chờ Facebook xử lý...');

    const result = await waitForPostResult(page, dialog, finalContent, before);
    updateAttempt(attemptId, { status: result.status, error: result.error || null, postUrl: result.href ? new URL(result.href, groupUrl).href : null });
    if (result.status === 'unknown') {
      console.warn(`⚠️ ${result.error}`);
      return 'unknown';
    }
    console.log(result.status === 'success' ? '🎉 Đã xác nhận bài xuất hiện trên nhóm.' : '⏳ Bài đã gửi, đang chờ duyệt.');
    confirmed = true;
    confirmPostUsed(postData);
    updateAttempt(attemptId, { poolConsumed: true });

    // 6. TỰ ĐỘNG THẢ LINK Ở COMMENT ĐẦU TIÊN (NẾU CÓ BẬT CẤU HÌNH)
    if (result.status === 'success' && config.commentLinkUnderPost) {
      await commentOnAttempt(page, result.article, { id: attemptId }, config);
    }

    return result.status;
  } catch (error) {
    console.error(`❌ Thất bại tại nhóm ${groupUrl}:`, error.message);
    const status = submissionStarted ? 'unknown' : 'failed';
    if (attemptId && !confirmed) updateAttempt(attemptId, { status, error: error.message });
    else if (!attemptId && !(error instanceof HaltError)) recordPostResult(groupUrl, status, error.message, { title: postData.title, content: postData.content });
    if (error instanceof HaltError || confirmed) throw error;
    return status;
  }
}

if (require.main === module) {
  require('./runtime').cli(() => require('./post_runner').runPosting({ dryRun: process.argv.includes('--dry-run') }), { allowStopped: process.argv.includes('--dry-run') });
}
module.exports = { postToGroup, dropCommentLink };
