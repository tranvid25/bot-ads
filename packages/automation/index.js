const readline = require('readline');
const { spawn } = require('child_process');

function runScript(scriptName, args = []) {
  console.log(`\n🚀 Đang chạy lệnh: node ${scriptName} ${args.join(' ')}...\n`);
  const child = spawn(process.execPath, [require('path').join(__dirname, scriptName), ...args], { stdio: 'inherit', cwd: __dirname });
  child.on('error', error => console.error('Không chạy được:', error.message));
  child.on('close', (code) => {
    console.log(`\n🏁 Tiến trình kết thúc (Exit code: ${code}).\n`);
    showMenu();
  });
}

function showMenu() {
  console.log('========================================================');
  console.log('🤖 BẢNG ĐIỀU KHIỂN BOT TỰ ĐỘNG FACEBOOK - PRONUNREVIEW');
  console.log('========================================================');
  console.log('1. 🔑 Đăng nhập Facebook (Chạy 1 lần đầu để lưu nick)');
  console.log('2. 🔍 Tự động CÀO các hội nhóm tiếng Anh trên Facebook');
  console.log('3. 🤝 Tự động THAM GIA các nhóm vừa cào được (Auto Join)');
  console.log('4. 📋 Đồng bộ toàn bộ các nhóm nick bạn ĐÃ THAM GIA');
  console.log('5. 🚀 Bắt đầu TỰ ĐỘNG ĐĂNG BÀI (Hỗ trợ thả Link ở Comment & AI)');
  console.log('6. 👀 Xem trước các bài viết mẫu của ngày hôm nay');
  console.log('7. 📊 Xem thống kê nhóm nào ĐÃ ĐĂNG / CHƯA ĐĂNG hôm nay');
  console.log('8. 🧠 Tạo thêm 10 bài viết mới vào KHO BẰNG GEMINI AI');
  console.log('9. Chạy toàn bộ quy trình tự động');
  console.log('10. Xem kế hoạch (không đăng bài)');
  console.log('11. Kiểm tra cấu hình / phiên đăng nhập');
  console.log('12. Danh sách nhóm và trạng thái cho phép');
  console.log('13. Xem các lượt gửi và ID để xử lý');
  console.log('14. Xuất báo cáo JSON / CSV');
  console.log('15. Chạy bộ đặt lịch (giữ terminal mở)');
  console.log('0. ❌ Thoát');
  console.log('========================================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('👉 Chọn tính năng (0 - 15): ', (choice) => {
    rl.close();
    switch (choice.trim()) {
      case '1':
        runScript('login.js');
        break;
      case '2':
        runScript('search_groups.js');
        break;
      case '3':
        runScript('join_groups.js');
        break;
      case '4':
        runScript('get_groups.js');
        break;
      case '5':
        runScript('post.js');
        break;
      case '6':
        runScript('preview.js');
        break;
      case '7':
        runScript('view_history.js');
        break;
      case '8':
        runScript('create_ai_batch.js', ['10']);
        break;
      case '0':
        console.log('👋 Tạm biệt!');
        process.exit(0);
      case '9': runScript('automation.js'); break;
      case '10': runScript('automation.js', ['--dry-run']); break;
      case '11': runScript('doctor.js'); break;
      case '12': runScript('manage.js', ['groups']); break;
      case '13': runScript('manage.js', ['attempts']); break;
      case '14': runScript('manage.js', ['report']); break;
      case '15': runScript('scheduler.js'); break;
      default:
        console.log('⚠️ Lựa chọn không hợp lệ. Vui lòng chọn lại!\n');
        showMenu();
    }
  });
}

showMenu();
